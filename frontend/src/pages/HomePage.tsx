import { useNavigate } from 'react-router-dom'
import { BookOpen, Layers, MessageSquare } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

const features = [
  {
    title: '费曼检验',
    description: '用 STAR 法则写下你的项目经历，AI 从理解深度、数据密度、因果清晰度三个维度精准诊断，帮你发现表达盲区。',
    icon: BookOpen,
    to: '/feynman',
    color: 'text-blue-500',
  },
  {
    title: '四层剖析',
    description: '描述你的职业困惑，AI 逐层拆解事件、情绪、需求、信念，帮你厘清求职动机和内在驱动。',
    icon: Layers,
    to: '/layers',
    color: 'text-emerald-500',
  },
  {
    title: '排练室',
    description: '选择面试场景和面试官风格，与 AI 进行模拟面试对话。结束后获取多维度反馈报告，无后果地反复练习。',
    icon: MessageSquare,
    to: '/rehearsal',
    color: 'text-purple-500',
  },
] as const

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          你好，{user?.name}
        </h1>
        <p className="text-muted-foreground">
          选择一个模块开始练习，提升你的职业表达能力。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <button
            key={feature.to}
            onClick={() => navigate(feature.to)}
            className="flex flex-col items-start gap-4 rounded-lg border bg-card p-6 text-left transition-colors hover:bg-accent"
          >
            <feature.icon className={`h-8 w-8 ${feature.color}`} />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
