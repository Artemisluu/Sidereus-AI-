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
      <div className="panel-shell panel-shell--dense">
        <h3 className="mb-2 font-medium text-[color:var(--text-strong)]">雷达图</h3>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#47656d" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#8ea4a2", fontSize: 12 }} />
            <Radar dataKey="value" stroke="#8bd3dd" fill="#8bd3dd" fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel-shell panel-shell--dense">
        <h3 className="mb-2 font-medium text-[color:var(--text-strong)]">维度柱状图</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData}>
            <XAxis dataKey="name" tick={{ fill: "#8ea4a2", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#8ea4a2", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(8, 19, 23, 0.92)",
                border: "1px solid rgba(150, 195, 197, 0.14)",
                borderRadius: "16px",
                color: "#ecf4f3",
              }}
            />
            <Bar dataKey="value" fill="#8bd3dd" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
