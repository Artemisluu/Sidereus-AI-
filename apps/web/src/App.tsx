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
    <main className="mx-auto min-h-screen w-full max-w-[1480px] space-y-4 px-5 py-5">
      <header className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-semibold">Sidereus AI 招聘助手</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            React + Express + TypeScript + PostgreSQL + DeepSeek + SSE
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-blue-500 dark:border-slate-600"
          onClick={toggleTheme}
        >
          主题切换（Ctrl+K）
        </button>
      </header>

      {globalError && (
        <div className="rounded-lg border border-rose-400 bg-rose-100 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
          {globalError}
        </div>
      )}

      <section className="space-y-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setUploadOpen((prev: boolean) => !prev)}
          >
            <h2 className="text-lg font-semibold">简历上传与解析</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{uploadOpen ? "收起" : "展开"}</span>
          </button>
          {uploadOpen && (
            <div className="mt-3">
              <UploadPanel onUploaded={handleUploadCompleted} />
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setJdOpen((prev: boolean) => !prev)}
          >
            <h2 className="text-lg font-semibold">岗位需求配置</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{jdOpen ? "收起" : "展开"}</span>
          </button>
          {jdOpen && (
            <div className="mt-3">
              <JdPanel onSelectJob={setSelectedJobId} />
            </div>
          )}
        </article>
      </section>

      <section
        ref={candidatePanelRef}
        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="mb-3 text-lg font-semibold">候选人管理面板</h2>
        {candidatesQuery.isLoading ? (
          <section className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            候选人加载中...
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
            <CandidateDetail
              candidate={candidateQuery.data ?? null}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
            />
          </section>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold">候选人对比（2-3 人）</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {compareItems.map((candidate) => (
            <article
              key={candidate.id}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <h3 className="font-semibold">{candidate.structuredData?.basicInfo?.name || candidate.filename}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{candidate.structuredData?.education?.[0]?.school ?? "-"}</p>
              <p className="text-sm">{(candidate.structuredData?.skillTags ?? []).join(" / ") || "暂无技能"}</p>
              <span className="mt-2 inline-block rounded-full border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-600">
                {candidate.status}
              </span>
            </article>
          ))}
          {!compareItems.length && (
            <p className="text-sm text-slate-500 dark:text-slate-400">在候选人列表中勾选 2-3 人即可对比。</p>
          )}
        </div>
      </section>
    </main>
  )
}
