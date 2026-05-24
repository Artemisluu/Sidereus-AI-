import type {
  Candidate,
  CandidateScore,
  CandidateStatus,
  JobDescriptionInput,
  ResumeStructured,
} from "@sidereus/shared"
import axios from "axios"

export function resolveApiBase(envApiBase: string | undefined, isDev: boolean, origin: string) {
  const normalized = envApiBase?.trim()
  if (normalized) {
    return normalized.replace(/\/+$/, "")
  }
  return isDev ? "http://localhost:4000" : origin
}

const API_BASE = resolveApiBase(
  import.meta.env.VITE_API_BASE,
  import.meta.env.DEV,
  typeof window === "undefined" ? "http://localhost:4000" : window.location.origin
)

export const api = axios.create({
  baseURL: API_BASE,
})

export async function uploadResumes(files: File[]) {
  const formData = new FormData()
  for (const file of files) {
    formData.append("resumes", file)
  }
  const res = await api.post<{ data: Candidate[] }>("/api/candidates/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data.data
}

export async function fetchCandidates(params?: {
  search?: string
  status?: string
  sortBy?: string
  order?: "asc" | "desc"
}) {
  const res = await api.get<{ data: Candidate[] }>("/api/candidates", { params })
  return res.data.data
}

export async function fetchCandidate(id: string) {
  const res = await api.get<{ data: Candidate }>(`/api/candidates/${id}`)
  return res.data.data
}

export async function updateCandidateStatus(id: string, status: CandidateStatus) {
  const res = await api.patch<{ data: Candidate }>(`/api/candidates/${id}/status`, { status })
  return res.data.data
}

export async function saveStructuredData(id: string, payload: ResumeStructured) {
  const res = await api.put<{ data: Candidate }>(`/api/candidates/${id}/structured`, payload)
  return res.data.data
}

export async function createJob(input: JobDescriptionInput) {
  const res = await api.post<{ data: { id: string; title: string } }>("/api/jobs", input)
  return res.data.data
}

export async function fetchJobs() {
  const res = await api.get<{
    data: Array<{
      id: string
      title: string
      description: string
      required_skills: string[]
      bonus_skills: string[]
    }>
  }>("/api/jobs")
  return res.data.data
}

export async function scoreCandidate(candidateId: string, jobId: string) {
  const res = await api.post<{ data: CandidateScore }>(`/api/candidates/${candidateId}/score`, {
    jobId,
  })
  return res.data.data
}

export async function fetchCandidateScores(candidateId: string) {
  const res = await api.get<{
    data: Array<CandidateScore & { job_id: string; job_title: string; created_at: string }>
  }>(`/api/candidates/${candidateId}/scores`)
  return res.data.data
}

export function streamExtractCandidate(
  candidateId: string,
  onChunk: (chunk: { key: keyof ResumeStructured; value: unknown }) => void,
  onProgress: (progress: { step: string; status: string }) => void,
  onDone: (data: ResumeStructured) => void,
  onError: (message: string) => void
) {
  const source = new EventSource(`${API_BASE}/api/candidates/${candidateId}/extract/stream`)

  source.addEventListener("progress", (event) => {
    onProgress(JSON.parse((event as MessageEvent).data))
  })

  source.addEventListener("chunk", (event) => {
    onChunk(JSON.parse((event as MessageEvent).data))
  })

  source.addEventListener("done", (event) => {
    onDone(JSON.parse((event as MessageEvent).data))
    source.close()
  })

  source.addEventListener("error", (event) => {
    const data = (event as MessageEvent).data
    if (data) {
      const parsed = JSON.parse(data) as { message?: string }
      onError(parsed.message ?? "SSE failed")
    }
    source.close()
  })

  return source
}
