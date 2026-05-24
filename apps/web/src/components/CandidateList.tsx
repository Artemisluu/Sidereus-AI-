import type { Candidate, CandidateStatus } from "@sidereus/shared"
import { useMemo, useState } from "react"
import { useAppStore } from "../store"

interface Props {
  candidates: Candidate[]
  selectedId: string
  onSelect: (candidateId: string) => void
  compareIds: string[]
  onToggleCompare: (candidateId: string) => void
}

const statusText: Record<CandidateStatus, string> = {
  pending: "待筛选",
  screened: "初筛通过",
  interview: "面试中",
  hired: "已录用",
  rejected: "已淘汰",
}

const statusClassMap: Record<CandidateStatus, string> = {
  pending: "text-amber-500",
  screened: "text-blue-500",
  interview: "text-blue-500",
  hired: "text-emerald-500",
  rejected: "text-rose-500",
}

export function CandidateList({
  candidates,
  selectedId,
  onSelect,
  compareIds,
  onToggleCompare,
}: Props) {
  const { viewMode, setViewMode } = useAppStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [skillFilter, setSkillFilter] = useState("")
  const [sortBy, setSortBy] = useState<"createdAt" | "filename">("createdAt")
  const [page, setPage] = useState(1)
  const pageSize = 8

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase()
    return candidates
      .filter((candidate) => {
        if (statusFilter !== "all" && candidate.status !== statusFilter) {
          return false
        }
        if (keyword) {
          const target = `${candidate.filename} ${candidate.cleanedText}`.toLowerCase()
          if (!target.includes(keyword)) {
            return false
          }
        }
        if (skillFilter) {
          const skills = candidate.structuredData?.skillTags ?? []
          if (!skills.some((item) => item.toLowerCase().includes(skillFilter.toLowerCase()))) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "filename") {
          return a.filename.localeCompare(b.filename)
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [candidates, search, statusFilter, skillFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="panel-shell">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="panel-title text-lg">候选人管理面板</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`control-button ${viewMode === "table" ? "control-button--active" : "control-button--ghost"}`}
            onClick={() => setViewMode("table")}
          >
            表格
          </button>
          <button
            type="button"
            className={`control-button ${viewMode === "card" ? "control-button--active" : "control-button--ghost"}`}
            onClick={() => setViewMode("card")}
          >
            卡片
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <input
          className="control-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索姓名/技能/学校/关键词"
        />
        <input
          className="control-input"
          value={skillFilter}
          onChange={(event) => setSkillFilter(event.target.value)}
          placeholder="技能标签过滤"
        />
        <select
          className="control-select w-full"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="pending">待筛选</option>
          <option value="screened">初筛通过</option>
          <option value="interview">面试中</option>
          <option value="hired">已录用</option>
          <option value="rejected">已淘汰</option>
        </select>
        <select
          className="control-select w-full"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as "createdAt" | "filename")}
        >
          <option value="createdAt">按上传时间</option>
          <option value="filename">按文件名</option>
        </select>
      </div>

      {viewMode === "table" ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[color:var(--panel-border)] p-2 text-left text-[color:var(--text-muted)]">
                对比
              </th>
              <th className="border-b border-[color:var(--panel-border)] p-2 text-left text-[color:var(--text-muted)]">
                文件名
              </th>
              <th className="border-b border-[color:var(--panel-border)] p-2 text-left text-[color:var(--text-muted)]">
                状态
              </th>
              <th className="border-b border-[color:var(--panel-border)] p-2 text-left text-[color:var(--text-muted)]">
                技能标签
              </th>
              <th className="border-b border-[color:var(--panel-border)] p-2 text-left text-[color:var(--text-muted)]">
                上传时间
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((candidate) => (
              <tr
                key={candidate.id}
                className={`${candidate.id === selectedId ? "bg-[rgba(139,211,221,0.10)]" : ""} cursor-pointer transition`}
                onClick={() => onSelect(candidate.id)}
              >
                <td className="border-b border-[color:var(--panel-border)] p-2">
                  <input
                    type="checkbox"
                    checked={compareIds.includes(candidate.id)}
                    onChange={() => onToggleCompare(candidate.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td className="border-b border-[color:var(--panel-border)] p-2">
                  {candidate.filename}
                </td>
                <td className="border-b border-[color:var(--panel-border)] p-2">
                  <span
                    className={`inline-block rounded-full border border-[color:var(--panel-border)] px-2 py-0.5 text-xs ${statusClassMap[candidate.status]}`}
                  >
                    {statusText[candidate.status]}
                  </span>
                </td>
                <td className="border-b border-[color:var(--panel-border)] p-2 text-[color:var(--text-muted)]">
                  {(candidate.structuredData?.skillTags ?? []).slice(0, 3).join(" / ") || "-"}
                </td>
                <td className="border-b border-[color:var(--panel-border)] p-2 text-[color:var(--text-muted)]">
                  {new Date(candidate.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {paged.map((candidate) => (
            <div
              key={candidate.id}
              className={`rounded-[22px] border p-3 ${
                candidate.id === selectedId
                  ? "border-[color:var(--accent-cyan)] bg-[rgba(139,211,221,0.10)]"
                  : "border-[color:var(--panel-border)] bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <strong>{candidate.filename}</strong>
                <input
                  type="checkbox"
                  checked={compareIds.includes(candidate.id)}
                  onChange={() => onToggleCompare(candidate.id)}
                />
              </div>
              <span
                className={`inline-block rounded-full border border-[color:var(--panel-border)] px-2 py-0.5 text-xs ${statusClassMap[candidate.status]}`}
              >
                {statusText[candidate.status]}
              </span>
              <p className="my-2 text-sm text-[color:var(--text-muted)]">
                {(candidate.structuredData?.skillTags ?? []).join(" / ") || "暂无技能标签"}
              </p>
              <button
                type="button"
                className="control-button control-button--ghost"
                onClick={() => onSelect(candidate.id)}
              >
                查看详情
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <small className="text-[color:var(--text-muted)]">
          共 {filtered.length} 人，当前第 {page}/{totalPages} 页
        </small>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="control-button control-button--ghost disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            上一页
          </button>
          <button
            type="button"
            className="control-button control-button--ghost disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  )
}
