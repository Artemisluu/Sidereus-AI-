import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { fetchCandidate, fetchCandidates } from "./api"
import { CandidateDetail } from "./components/CandidateDetail"
import { CandidateList } from "./components/CandidateList"
import { JdPanel } from "./components/JdPanel"
import { UploadPanel } from "./components/UploadPanel"
import { useAppStore } from "./store"

export default function App() {
  const { theme, toggleTheme, globalError, setGlobalError } = useAppStore()
  const [selectedCandidateId, setSelectedCandidateId] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(true)
  const [jdOpen, setJdOpen] = useState(false)
  const candidatePanelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && event.ctrlKey) {
        event.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleTheme])

  const candidatesQuery = useQuery({
    queryKey: ["candidates"],
    queryFn: () => fetchCandidates(),
    refetchInterval: 30_000,
  })

  const candidateQuery = useQuery({
    queryKey: ["candidate", selectedCandidateId],
    queryFn: () => fetchCandidate(selectedCandidateId),
    enabled: Boolean(selectedCandidateId),
  })

  useEffect(() => {
    if (candidatesQuery.error instanceof Error) {
      setGlobalError(candidatesQuery.error.message)
    }
  }, [candidatesQuery.error, setGlobalError])

  const compareItems = useMemo(
    () =>
      (candidatesQuery.data ?? [])
        .filter((candidate) => compareIds.includes(candidate.id))
        .slice(0, 3),
    [candidatesQuery.data, compareIds]
  )

  const selectedCandidate = candidateQuery.data ?? null
  const selectedCandidateName =
    selectedCandidate?.structuredData?.basicInfo?.name ||
    selectedCandidate?.filename ||
    "未选择"
  const summaryItems = [
    {
      label: "候选人总数",
      value: String((candidatesQuery.data ?? []).length),
      note: (candidatesQuery.data ?? []).length ? "候选人库已同步" : "等待上传简历",
    },
    {
      label: "当前对比",
      value: String(compareItems.length),
      note: compareItems.length ? "最多同时 3 人" : "在列表中勾选候选人",
    },
    {
      label: "已选 JD",
      value: selectedJobId ? "已就绪" : "未选择",
      note: selectedJobId ? "可直接发起匹配评分" : "先在左侧保存或选择 JD",
    },
    {
      label: "当前候选人",
      value: selectedCandidateName,
      note: selectedCandidate ? `状态：${selectedCandidate.status}` : "点击列表查看详情",
    },
  ]

  function handleUploadCompleted() {
    setGlobalError("")
    setUploadOpen(false)

    window.setTimeout(() => {
      const element = candidatePanelRef.current
      if (!element) {
        return
      }

      const rect = element.getBoundingClientRect()
      const targetTop = window.scrollY + rect.top - window.innerHeight * 0.18

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      })
    }, 120)
  }

  return (
    <main className="ops-shell">
      <header className="ops-hero">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="ops-eyebrow">Sidereus / Ops Console</span>
            <h1 className="ops-display mt-3 text-3xl sm:text-4xl">Sidereus AI 招聘助手</h1>
            <p className="ops-copy mt-3 max-w-2xl text-sm sm:text-base">
              从简历入库、岗位配置到候选人提取评分，把高频操作折叠进一张真正可用的招聘运营战情台。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
              <span className="ops-tag">React + Express</span>
              <span className="ops-tag">TypeScript + PostgreSQL</span>
              <span className="ops-tag">DeepSeek + SSE Streaming</span>
            </div>
          </div>

          <button
            type="button"
            className="control-button self-start"
            onClick={toggleTheme}
          >
            主题切换（Ctrl+K）
          </button>
        </div>

        <div className="ops-kpi-grid mt-6">
          {summaryItems.map((item) => (
            <article key={item.label} className="ops-kpi-card">
              <span className="ops-kpi-label">{item.label}</span>
              <strong className="ops-kpi-value">{item.value}</strong>
              <p className="ops-kpi-note">{item.note}</p>
            </article>
          ))}
        </div>
      </header>

      {globalError && (
        <div className="ops-alert mt-5">
          {globalError}
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="ops-section-label">操作轨道</span>
            <span className="ops-section-note">高频输入与配置入口</span>
          </div>

          <article className="space-y-3">
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <p className="ops-panel-tag">简历入库</p>
                <p className="ops-copy text-sm">上传完成后会自动把视线拉回候选人工作台。</p>
              </div>
              <button
                type="button"
                className="control-button control-button--ghost"
                onClick={() => setUploadOpen((prev: boolean) => !prev)}
              >
                {uploadOpen ? "收起" : "展开"}
              </button>
            </div>
            {uploadOpen ? (
              <UploadPanel onUploaded={handleUploadCompleted} />
            ) : (
              <div className="panel-shell panel-shell--collapsed">上传工具已折叠</div>
            )}
          </article>

          <article className="space-y-3">
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <p className="ops-panel-tag">岗位配置</p>
                <p className="ops-copy text-sm">先保存 JD，再在右侧候选人详情中发起匹配评分。</p>
              </div>
              <button
                type="button"
                className="control-button control-button--ghost"
                onClick={() => setJdOpen((prev: boolean) => !prev)}
              >
                {jdOpen ? "收起" : "展开"}
              </button>
            </div>
            {jdOpen ? (
              <JdPanel onSelectJob={setSelectedJobId} />
            ) : (
              <div className="panel-shell panel-shell--collapsed">JD 配置区已折叠</div>
            )}
          </article>
        </section>

        <section ref={candidatePanelRef} className="space-y-5">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <span className="ops-section-label">候选人工作台</span>
              <p className="ops-copy mt-2 text-sm">集中完成搜索、筛选、排序、视图切换和对比勾选。</p>
            </div>
            <span className="ops-section-note">30 秒自动同步一次列表</span>
          </div>

          {candidatesQuery.isLoading ? (
            <section className="panel-shell animate-pulse">候选人加载中...</section>
          ) : (
            <CandidateList
              candidates={candidatesQuery.data ?? []}
              selectedId={selectedCandidateId}
              onSelect={setSelectedCandidateId}
              compareIds={compareIds}
              onToggleCompare={(candidateId) => {
                setCompareIds((prev: string[]) => {
                  if (prev.includes(candidateId)) {
                    return prev.filter((id) => id !== candidateId)
                  }
                  if (prev.length >= 3) {
                    return prev
                  }
                  return [...prev, candidateId]
                })
              }}
            />
          )}
        </section>

        <aside className="space-y-5 xl:col-span-2 2xl:col-span-1">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <span className="ops-section-label">详情工作台</span>
              <p className="ops-copy mt-2 text-sm">查看结构化结果、提取进度、评分细节和原始 PDF。</p>
            </div>
            <span className="ops-section-note">
              {selectedCandidateId ? "已锁定当前候选人" : "请选择候选人"}
            </span>
          </div>

          <div className="2xl:sticky 2xl:top-5">
            <CandidateDetail
              candidate={candidateQuery.data ?? null}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
            />
          </div>
        </aside>
      </div>

      <section className="panel-shell panel-shell--hero mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="ops-section-label">候选人对比（2-3 人）</span>
            <p className="ops-copy mt-2 text-sm">横向查看候选人姓名、教育背景、技能与流程状态。</p>
          </div>
          <span className="ops-section-note">
            {compareItems.length ? `已加入 ${compareItems.length} 人` : "最多同时对比 3 人"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {compareItems.map((candidate) => (
            <article
              key={candidate.id}
              className="compare-card"
            >
              <span className="ops-panel-tag">对比对象</span>
              <h3 className="font-semibold">
                {candidate.structuredData?.basicInfo?.name || candidate.filename}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {candidate.structuredData?.education?.[0]?.school ?? "-"}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-strong)]">
                {(candidate.structuredData?.skillTags ?? []).join(" / ") || "暂无技能"}
              </p>
              <span className="ops-status-pill mt-3 inline-flex">
                {candidate.status}
              </span>
            </article>
          ))}
          {!compareItems.length && (
            <p className="compare-empty-state">
              在候选人列表中勾选 2-3 人即可对比。
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
