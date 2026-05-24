import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import toast from "react-hot-toast"
import { createJob, fetchJobs } from "../api"

interface Props {
  onSelectJob: (jobId: string) => void
}

export function JdPanel({ onSelectJob }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requiredSkills, setRequiredSkills] = useState("")
  const [bonusSkills, setBonusSkills] = useState("")

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  })

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      setTitle("")
      setDescription("")
      setRequiredSkills("")
      setBonusSkills("")
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      onSelectJob(job.id)
      toast.success("保存成功")
    },
  })

  return (
    <div className="panel-shell">
      <h2 className="panel-title text-lg">岗位需求配置（JD 编辑器）</h2>
      <div className="mt-3 grid gap-2">
        <input
          className="control-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="岗位名称"
        />
        <textarea
          className="control-textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="岗位描述"
          rows={4}
        />
        <input
          className="control-input"
          value={requiredSkills}
          onChange={(event) => setRequiredSkills(event.target.value)}
          placeholder="必备技能（逗号分隔）"
        />
        <input
          className="control-input"
          value={bonusSkills}
          onChange={(event) => setBonusSkills(event.target.value)}
          placeholder="加分技能（逗号分隔）"
        />
      </div>
      <button
        type="button"
        className="control-button control-button--primary mt-3 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!title || !description || createMutation.isPending}
        onClick={() =>
          createMutation.mutate({
            title,
            description,
            requiredSkills: requiredSkills
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            bonusSkills: bonusSkills
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          })
        }
      >
        保存 JD
      </button>
    </div>
  )
}
