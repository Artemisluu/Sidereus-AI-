import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as pdfjs from "pdfjs-dist"
import { useState } from "react"
import toast from "react-hot-toast"
import { uploadResumes } from "../api"

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

interface PreviewFile {
  file: File
  thumbnail: string
}

interface Props {
  onUploaded: () => void
}

async function buildPdfThumbnail(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 0.4 })
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  canvas.width = viewport.width
  canvas.height = viewport.height

  if (!context) {
    return ""
  }

  await page.render({ canvasContext: context, viewport }).promise
  return canvas.toDataURL("image/png")
}

export function UploadPanel({ onUploaded }: Props) {
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<PreviewFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: async () => uploadResumes(files.map((item) => item.file)),
    onSuccess: (data) => {
      const nextCount = uploadedCount + data.length
      setUploadedCount(nextCount)
      toast.success(`上传成功，当前已经上传${nextCount}份，请至候选人管理面板查看详情`)
      setFiles([])
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
      onUploaded()
    },
  })

  async function handleFiles(list: FileList | null) {
    if (!list) {
      return
    }

    const onlyPdf = Array.from(list).filter((file) => file.type === "application/pdf")
    const previews = await Promise.all(
      onlyPdf.map(async (file) => ({
        file,
        thumbnail: await buildPdfThumbnail(file),
      }))
    )
    setFiles((prev: PreviewFile[]) => [...prev, ...previews].slice(0, 10))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">简历上传与解析</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        支持拖拽 / 点击上传，仅 PDF，建议单次上传 5-10 份。
      </p>

      <label
        className={`mt-3 grid min-h-[120px] cursor-pointer place-items-center rounded-xl border-2 border-dashed p-3 text-sm ${
          dragging
            ? "border-blue-500 bg-blue-100/40 dark:bg-blue-950/20"
            : "border-slate-300 dark:border-slate-600"
        }`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
      >
        <input
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files)
          }}
        />
        <span>拖拽 PDF 到这里，或点击选择文件</span>
      </label>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={files.length < 5 || uploadMutation.isPending}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm enabled:hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending ? "上传中..." : `确认上传 (${files.length})`}
        </button>
        {files.length < 5 && <small className="text-xs text-amber-500">至少选择 5 份简历后可上传</small>}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {files.map((item, index) => (
          <div
            className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
            key={`${item.file.name}-${index}`}
          >
            {item.thumbnail ? (
              <img className="h-[120px] w-full object-cover" src={item.thumbnail} alt={item.file.name} />
            ) : (
              <div className="grid h-[120px] place-items-center bg-blue-100 text-sm dark:bg-blue-950/30">PDF</div>
            )}
            <div className="grid gap-1 p-2 text-xs">
              <strong>{item.file.name}</strong>
              <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
