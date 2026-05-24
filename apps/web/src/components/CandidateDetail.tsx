import type { Candidate, CandidateScore, CandidateStatus, ResumeStructured } from "@sidereus/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import {
  fetchCandidateScores,
  saveStructuredData,
  scoreCandidate,
  streamExtractCandidate,
  updateCandidateStatus,
} from "../api"
import { ScoreCharts } from "./ScoreCharts"

interface Props {
  candidate: Candidate | null
  selectedJobId: string
}

const statuses: Array<{ label: string; value: CandidateStatus }> = [
  { label: "待筛选", value: "pending" },
  { label: "初筛通过", value: "screened" },
  { label: "面试中", value: "interview" },
  { label: "已录用", value: "hired" },
  { label: "已淘汰", value: "rejected" },
]

function emptyStructured(): ResumeStructured {
  return {
    basicInfo: {
      name: "",
      phone: "",
      email: "",
      city: "",
    },
    education: [],
    workExperience: [],
    skillTags: [],
    projects: [],
  }
}

export function CandidateDetail({ candidate, selectedJobId }: Props) {
  const queryClient = useQueryClient()
  const [structured, setStructured] = useState<ResumeStructured>(emptyStructured())
  const [streamStep, setStreamStep] = useState("")
  const [manualJson, setManualJson] = useState("")

  useEffect(() => {
    if (!candidate) {
      return
    }
    const nextStructured = candidate.structuredData ?? emptyStructured()
    setStructured(nextStructured)
    setManualJson(JSON.stringify(nextStructured, null, 2))
  }, [candidate])

  const scoresQuery = useQuery({
    queryKey: ["candidate-scores", candidate?.id],
    queryFn: () => fetchCandidateScores(candidate!.id),
    enabled: Boolean(candidate),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CandidateStatus }) =>
      updateCandidateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
      queryClient.invalidateQueries({ queryKey: ["candidate", variables.id] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResumeStructured }) =>
      saveStructuredData(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
    },
  })

  const scoreMutation = useMutation({
    mutationFn: ({ id, jobId }: { id: string; jobId: string }) => scoreCandidate(id, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-scores", candidate?.id] })
    },
  })

  const latestScore = useMemo<CandidateScore | null>(() => {
    const first = scoresQuery.data?.[0]
    if (!first) {
      return null
    }
    return {
      total: first.total,
      skill: first.skill,
      experience: first.experience,
      education: first.education,
      comment: first.comment,
    }
  }, [scoresQuery.data])

  if (!candidate) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        请选择候选人查看详情
      </div>
    )
  }

  const handleSseExtract = () => {
    setStreamStep("开始提取...")
    const source = streamExtractCandidate(
      candidate.id,
      (chunk) => {
        setStructured((prev) => ({ ...prev, [chunk.key]: chunk.value }))
      },
      (progress) => {
        setStreamStep(`处理中：${progress.step}`)
      },
      (data) => {
        setStructured(data)
        setManualJson(JSON.stringify(data, null, 2))
        setStreamStep("提取完成")
        queryClient.invalidateQueries({ queryKey: ["candidate", candidate.id] })
        queryClient.invalidateQueries({ queryKey: ["candidates"] })
      },
      (message) => {
        setStreamStep(`提取失败：${message}`)
      }
    )

    return () => source.close()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">候选人详情</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-blue-500 dark:border-slate-600"
            onClick={handleSseExtract}
          >
            AI 提取（SSE）
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm enabled:hover:border-blue-500 disabled:opacity-50 dark:border-slate-600"
            disabled={!selectedJobId || scoreMutation.isPending}
            onClick={() => scoreMutation.mutate({ id: candidate.id, jobId: selectedJobId })}
          >
            岗位匹配评分
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{streamStep || "可开始 AI 结构化提取"}</p>

      <div className="mt-2 flex items-center gap-2">
        <label className="text-sm">流程状态：</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
          value={candidate.status}
          onChange={(event) =>
            statusMutation.mutate({
              id: candidate.id,
              status: event.target.value as CandidateStatus,
            })
          }
        >
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2">
        <section>
          <h3 className="mb-1 font-medium">结构化信息</h3>
          <pre className="min-h-[180px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs dark:border-slate-700 dark:bg-slate-950/40">
            {JSON.stringify(structured, null, 2)}
          </pre>
        </section>

        <section>
          <h3 className="mb-1 font-medium">手动修正（JSON）</h3>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900"
            value={manualJson}
            onChange={(event) => setManualJson(event.target.value)}
            rows={16}
          />
          <button
            type="button"
            className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-blue-500 dark:border-slate-600"
            onClick={() => {
              try {
                const parsed = JSON.parse(manualJson) as ResumeStructured
                saveMutation.mutate({ id: candidate.id, payload: parsed })
              } catch {
                alert("JSON 格式错误")
              }
            }}
          >
            保存修正
          </button>
        </section>
      </div>

      <section>
        <h3 className="mb-2 mt-4 font-medium">评分详情</h3>
        {latestScore ? (
          <>
            <div className="mb-2 grid h-[110px] w-[110px] place-items-center rounded-full border-[10px] border-blue-400">
              <div className="text-3xl font-bold">{latestScore.total}</div>
              <small>综合匹配度</small>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{latestScore.comment}</p>
            <ScoreCharts score={latestScore} />
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">暂无评分结果</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 mt-4 font-medium">原始 PDF 预览</h3>
        <iframe
          title="candidate-pdf"
          src={`${import.meta.env.VITE_API_BASE ?? "http://localhost:4000"}${candidate.fileUrl}`}
          className="min-h-[420px] w-full rounded-lg border border-slate-300 dark:border-slate-600"
        />
      </section>
    </div>
  )
}
