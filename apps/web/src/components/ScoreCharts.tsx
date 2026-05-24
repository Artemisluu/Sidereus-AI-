import type { CandidateScore } from "@sidereus/shared"
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface Props {
  score: CandidateScore
}

export function ScoreCharts({ score }: Props) {
  const radarData = [
    { subject: "技能匹配", value: score.skill },
    { subject: "经验相关", value: score.experience },
    { subject: "教育契合", value: score.education },
  ]

  const barData = [
    { name: "综合", value: score.total },
    { name: "技能", value: score.skill },
    { name: "经验", value: score.experience },
    { name: "教育", value: score.education },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-2 font-medium">雷达图</h3>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <Radar dataKey="value" stroke="#4f8cff" fill="#4f8cff" fillOpacity={0.5} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-2 font-medium">维度柱状图</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData}>
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="value" fill="#4f8cff" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
