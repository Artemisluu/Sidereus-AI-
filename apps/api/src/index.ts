import "dotenv/config"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import type {
  Candidate,
  CandidateScore,
  CandidateStatus,
  JobDescriptionInput,
  ResumeStructured,
} from "@sidereus/shared"
import cors from "cors"
import express from "express"
import multer from "multer"
import pdf from "pdf-parse"
import { Pool } from "pg"
import { z } from "zod"

const app = express()
const port = Number(process.env.PORT ?? 4000)
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173"
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

const deepseekApiKey = process.env.DEEPSEEK_API_KEY
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"

const pool = new Pool({ connectionString: databaseUrl })

const uploadsDir = path.resolve(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use(cors({ origin: webOrigin }))
app.use(express.json({ limit: "5mb" }))
app.use("/uploads", express.static(uploadsDir))

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const id = randomUUID()
      cb(null, `${id}-${file.originalname.replace(/\s+/g, "_")}`)
    },
  }),
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf")
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

const jdSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requiredSkills: z.array(z.string()).default([]),
  bonusSkills: z.array(z.string()).default([]),
})

const statusSchema = z.object({
  status: z.enum(["pending", "screened", "interview", "hired", "rejected"]),
})

function cleanResumeText(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[•●▪]/g, "-")
    .trim()
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id UUID PRIMARY KEY,
      filename TEXT NOT NULL,
      file_url TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      cleaned_text TEXT NOT NULL,
      structured_data JSONB,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_descriptions (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      required_skills JSONB NOT NULL,
      bonus_skills JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_scores (
      id UUID PRIMARY KEY,
      candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      job_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
      total INT NOT NULL,
      skill INT NOT NULL,
      experience INT NOT NULL,
      education INT NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(candidate_id, job_id)
    );
  `)
}

function rowToCandidate(row: any): Candidate {
  return {
    id: row.id,
    filename: row.filename,
    fileUrl: row.file_url,
    rawText: row.raw_text,
    cleanedText: row.cleaned_text,
    structuredData: row.structured_data,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function callDeepSeek(prompt: string): Promise<string> {
  if (!deepseekApiKey) {
    throw new Error("DEEPSEEK_API_KEY is required for AI extraction")
  }

  const response = await fetch(`${deepseekBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an HR resume extraction assistant. Output strict JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`DeepSeek request failed: ${response.status} ${detail}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  return payload.choices?.[0]?.message?.content ?? "{}"
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const normalized = text
      .replace(/^```json\s*/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim()
    return JSON.parse(normalized) as T
  } catch {
    return fallback
  }
}

async function extractStructuredBySections(cleanedText: string): Promise<ResumeStructured> {
  const basicInfoRaw = await callDeepSeek(`
从下面简历文本提取 basicInfo 字段并仅返回 JSON：
{
  "name": "",
  "phone": "",
  "email": "",
  "city": ""
}
简历文本：${cleanedText}
`)
  const educationRaw = await callDeepSeek(`
从下面简历文本提取 education 数组并仅返回 JSON：
[{"school":"","major":"","degree":"","graduationDate":""}]
简历文本：${cleanedText}
`)
  const workRaw = await callDeepSeek(`
从下面简历文本提取 workExperience 数组并仅返回 JSON：
[{"company":"","title":"","period":"","summary":""}]
简历文本：${cleanedText}
`)
  const skillRaw = await callDeepSeek(`
从下面简历文本提取 skillTags 数组并仅返回 JSON：
["TypeScript","React"]
简历文本：${cleanedText}
`)
  const projectRaw = await callDeepSeek(`
从下面简历文本提取 projects 数组并仅返回 JSON：
[{"projectName":"","techStack":[],"responsibility":"","highlights":""}]
简历文本：${cleanedText}
`)

  return {
    basicInfo: safeJsonParse(basicInfoRaw, {
      name: "",
      phone: "",
      email: "",
      city: "",
    }),
    education: safeJsonParse(educationRaw, []),
    workExperience: safeJsonParse(workRaw, []),
    skillTags: safeJsonParse(skillRaw, []),
    projects: safeJsonParse(projectRaw, []),
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ data: { ok: true } })
})

app.post("/api/candidates/upload", upload.array("resumes", 10), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files?.length) {
      return res.status(400).json({ message: "No files uploaded" })
    }

    const inserted: Candidate[] = []

    for (const file of files) {
      const buffer = fs.readFileSync(file.path)
      const parsed = await pdf(buffer)
      const rawText = parsed.text ?? ""
      const cleanedText = cleanResumeText(rawText)
      const id = randomUUID()
      const fileUrl = `/uploads/${path.basename(file.path)}`

      const result = await pool.query(
        `
          INSERT INTO candidates (id, filename, file_url, raw_text, cleaned_text, structured_data, status)
          VALUES ($1, $2, $3, $4, $5, NULL, 'pending')
          RETURNING *
        `,
        [id, file.originalname, fileUrl, rawText, cleanedText]
      )

      inserted.push(rowToCandidate(result.rows[0]))
    }

    res.status(201).json({ data: inserted })
  } catch (error) {
    next(error)
  }
})

app.get("/api/candidates", async (req, res, next) => {
  try {
    const search = String(req.query.search ?? "").trim()
    const sortBy = String(req.query.sortBy ?? "created_at")
    const order = String(req.query.order ?? "desc") === "asc" ? "ASC" : "DESC"
    const status = String(req.query.status ?? "").trim()

    const sortMap: Record<string, string> = {
      createdAt: "created_at",
      created_at: "created_at",
      updatedAt: "updated_at",
      filename: "filename",
    }
    const sortColumn = sortMap[sortBy] ?? "created_at"

    const conditions: string[] = []
    const values: unknown[] = []

    if (search) {
      values.push(`%${search}%`)
      conditions.push(`(filename ILIKE $${values.length} OR cleaned_text ILIKE $${values.length})`)
    }

    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const result = await pool.query(
      `SELECT * FROM candidates ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT 200`,
      values
    )
    res.json({ data: result.rows.map(rowToCandidate) })
  } catch (error) {
    next(error)
  }
})

app.get("/api/candidates/:id", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM candidates WHERE id = $1`, [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Candidate not found" })
    }
    res.json({ data: rowToCandidate(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.patch("/api/candidates/:id/status", async (req, res, next) => {
  try {
    const parsed = statusSchema.parse(req.body)
    const result = await pool.query(
      `
      UPDATE candidates
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [req.params.id, parsed.status]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Candidate not found" })
    }

    res.json({ data: rowToCandidate(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.put("/api/candidates/:id/structured", async (req, res, next) => {
  try {
    const data = req.body as ResumeStructured
    const result = await pool.query(
      `
      UPDATE candidates
      SET structured_data = $2::jsonb, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [req.params.id, JSON.stringify(data)]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Candidate not found" })
    }

    res.json({ data: rowToCandidate(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.get("/api/candidates/:id/extract/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  const result = await pool.query(`SELECT * FROM candidates WHERE id = $1`, [req.params.id])
  const candidate = result.rows[0]

  if (!candidate) {
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ message: "Candidate not found" })}\n\n`)
    return res.end()
  }

  if (!deepseekApiKey) {
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ message: "DEEPSEEK_API_KEY is missing" })}\n\n`)
    return res.end()
  }

  const cleanedText = candidate.cleaned_text as string

  const sendEvent = (event: string, payload: unknown) => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  try {
    sendEvent("progress", { step: "basicInfo", status: "running" })
    const basicInfoRaw = await callDeepSeek(
      `仅返回 JSON，提取 basicInfo: {\"name\":\"\",\"phone\":\"\",\"email\":\"\",\"city\":\"\"}。简历文本：${cleanedText}`
    )
    const basicInfo = safeJsonParse(basicInfoRaw, { name: "", phone: "", email: "", city: "" })
    sendEvent("chunk", { key: "basicInfo", value: basicInfo })

    sendEvent("progress", { step: "education", status: "running" })
    const educationRaw = await callDeepSeek(
      `仅返回 JSON 数组，提取 education: [{\"school\":\"\",\"major\":\"\",\"degree\":\"\",\"graduationDate\":\"\"}]。简历文本：${cleanedText}`
    )
    const education = safeJsonParse(educationRaw, [])
    sendEvent("chunk", { key: "education", value: education })

    sendEvent("progress", { step: "workExperience", status: "running" })
    const workRaw = await callDeepSeek(
      `仅返回 JSON 数组，提取 workExperience: [{\"company\":\"\",\"title\":\"\",\"period\":\"\",\"summary\":\"\"}]。简历文本：${cleanedText}`
    )
    const workExperience = safeJsonParse(workRaw, [])
    sendEvent("chunk", { key: "workExperience", value: workExperience })

    sendEvent("progress", { step: "skillTags", status: "running" })
    const skillsRaw = await callDeepSeek(
      `仅返回 JSON 数组，提取 skillTags: [\"React\",\"Node.js\"]。简历文本：${cleanedText}`
    )
    const skillTags = safeJsonParse(skillsRaw, [])
    sendEvent("chunk", { key: "skillTags", value: skillTags })

    sendEvent("progress", { step: "projects", status: "running" })
    const projectsRaw = await callDeepSeek(
      `仅返回 JSON 数组，提取 projects: [{\"projectName\":\"\",\"techStack\":[],\"responsibility\":\"\",\"highlights\":\"\"}]。简历文本：${cleanedText}`
    )
    const projects = safeJsonParse(projectsRaw, [])
    sendEvent("chunk", { key: "projects", value: projects })

    const structured: ResumeStructured = {
      basicInfo,
      education,
      workExperience,
      skillTags,
      projects,
    }

    await pool.query(
      `UPDATE candidates SET structured_data = $2::jsonb, updated_at = NOW() WHERE id = $1`,
      [req.params.id, JSON.stringify(structured)]
    )

    sendEvent("done", structured)
  } catch (error) {
    sendEvent("error", { message: error instanceof Error ? error.message : "Unknown error" })
  } finally {
    res.end()
  }
})

app.post("/api/jobs", async (req, res, next) => {
  try {
    const jd = jdSchema.parse(req.body) as JobDescriptionInput
    const id = randomUUID()
    const result = await pool.query(
      `
      INSERT INTO job_descriptions (id, title, description, required_skills, bonus_skills)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
      RETURNING *
      `,
      [
        id,
        jd.title,
        jd.description,
        JSON.stringify(jd.requiredSkills),
        JSON.stringify(jd.bonusSkills),
      ]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

app.get("/api/jobs", async (_req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM job_descriptions ORDER BY created_at DESC`)
    res.json({ data: result.rows })
  } catch (error) {
    next(error)
  }
})

app.post("/api/candidates/:id/score", async (req, res, next) => {
  try {
    const payload = z.object({ jobId: z.string().uuid() }).parse(req.body)

    const candidateResult = await pool.query(`SELECT * FROM candidates WHERE id = $1`, [
      req.params.id,
    ])
    const jdResult = await pool.query(`SELECT * FROM job_descriptions WHERE id = $1`, [
      payload.jobId,
    ])

    if (!candidateResult.rows[0]) {
      return res.status(404).json({ message: "Candidate not found" })
    }
    if (!jdResult.rows[0]) {
      return res.status(404).json({ message: "Job description not found" })
    }

    if (!deepseekApiKey) {
      return res.status(400).json({ message: "DEEPSEEK_API_KEY is missing" })
    }

    const candidate = rowToCandidate(candidateResult.rows[0])
    const jd = jdResult.rows[0]

    const scoreRaw = await callDeepSeek(`
你是资深招聘官。请评估候选人和岗位匹配度，返回 JSON：
{
  "total": 0,
  "skill": 0,
  "experience": 0,
  "education": 0,
  "comment": ""
}
评分范围都是 0-100 整数。
岗位信息：${JSON.stringify(jd)}
候选人简历结构化信息：${JSON.stringify(candidate.structuredData)}
候选人清洗简历文本：${candidate.cleanedText.slice(0, 6000)}
`)

    const score = safeJsonParse<CandidateScore>(scoreRaw, {
      total: 0,
      skill: 0,
      experience: 0,
      education: 0,
      comment: "",
    })

    await pool.query(
      `
      INSERT INTO candidate_scores (id, candidate_id, job_id, total, skill, experience, education, comment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (candidate_id, job_id)
      DO UPDATE SET total = EXCLUDED.total, skill = EXCLUDED.skill, experience = EXCLUDED.experience, education = EXCLUDED.education, comment = EXCLUDED.comment
      `,
      [
        randomUUID(),
        req.params.id,
        payload.jobId,
        score.total,
        score.skill,
        score.experience,
        score.education,
        score.comment,
      ]
    )

    res.json({ data: score })
  } catch (error) {
    next(error)
  }
})

app.get("/api/candidates/:id/scores", async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT s.*, j.title as job_title
      FROM candidate_scores s
      JOIN job_descriptions j ON j.id = s.job_id
      WHERE s.candidate_id = $1
      ORDER BY s.created_at DESC
      `,
      [req.params.id]
    )
    res.json({ data: result.rows })
  } catch (error) {
    next(error)
  }
})

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected error"
    res.status(500).json({ message })
  }
)

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error("Failed to initialize database", error)
    process.exit(1)
  })
