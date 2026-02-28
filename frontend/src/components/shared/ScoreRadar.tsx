import { memo, useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'

export interface RadarDimension {
  label: string
  value: number
}

interface ScoreRadarProps {
  dimensions: RadarDimension[]
  size?: number
}

export const ScoreRadar = memo(function ScoreRadar({ dimensions, size = 280 }: ScoreRadarProps) {
  const data = useMemo(
    () =>
      dimensions.map((d) => ({
        subject: d.label,
        score: d.value,
        fullMark: 100,
      })),
    [dimensions],
  )

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 13, fill: 'hsl(var(--foreground))' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickCount={6}
          />
          <Radar
            name="评分"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="flex gap-4">
        {dimensions.map((d) => (
          <div key={d.label} className="flex flex-col items-center">
            <span className={`text-lg font-bold ${getScoreColor(d.value)}`}>{d.value}</span>
            <span className="text-xs text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}
