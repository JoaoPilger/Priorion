import type { Prioridade, StatusDemanda } from '../types/demanda'

export type Priority = Prioridade
export type Status = StatusDemanda

export interface Demand {
  id: string
  title: string
  client: string
  reach: number
  impact: number
  confidence: number
  score: number
  priority: Priority
  status: Status
  owner: string
  createdAt: string
  refinedAt?: string
  description?: string
  originalText?: string
  delta?: {
    delta: number
    reason: string
  }
}

export interface ReviewFactor {
  name: 'Reach' | 'Impact' | 'Confidence'
  value: number
  displayValue: string
  conf: number
  justification: string
  inferred: boolean
}

export interface ReviewItem {
  id: string
  demandId: string
  demand: Demand
  tags: string[]
  factors: ReviewFactor[]
  scoreBreakdown: {
    label: string
    detail: string
    value: string
    final: boolean
    priority?: Priority
  }[]
  reportText: {
    text: string
    inferred: boolean
    underlined?: boolean
  }[]
  corrections: {
    factor: 'Reach' | 'Impact' | 'Confidence'
    from: string
    to: string
    reason: string
  }[]
  approved?: boolean
}

export interface DashboardMetrics {
  totalDemands: number
  priorityCounts: Record<Priority, number>
  statusCounts: Record<Status, number>
  totalReach: number
  averageConfidence: number
  averageImpact: number
  stalledDemands: Demand[]
  topPriorityDemands: Demand[]
}

export interface Guideline {
  id: string
  title: string
  description: string
  factorAffected: 'Reach' | 'Impact' | 'Confidence'
  condition: string
  adjustment: string
  createdAt: string
  active: boolean
}

export interface DemandAudit {
  evaluation: null | {
    model: string
    promptVersion: string
    questions: string[]
    answers: string[]
    justification: string
    inconsistencyAlerts: string[]
    createdAt: string
  }
  history: Array<{
    id: number
    action: string
    justification: string | null
    createdAt: string
    actorName: string
  }>
}

const API_BASE = '/api'

export const api = {
  async getDemands(params?: { search?: string; priority?: string; status?: string; client?: string; owner?: string; sortKey?: string; sortDir?: string }): Promise<{ demands: Demand[]; total: number }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v)
      })
    }
    const res = await fetch(`${API_BASE}/demands?${query.toString()}`)
    if (!res.ok) throw new Error('Falha ao buscar demandas')
    return res.json()
  },

  async getDemand(id: string): Promise<{ demand: Demand; position: number; total: number }> {
    const res = await fetch(`${API_BASE}/demands/${id}`)
    if (!res.ok) throw new Error('Falha ao buscar demanda')
    return res.json()
  },

  async getDemandAudit(id: string): Promise<DemandAudit> {
    const res = await fetch(`${API_BASE}/demands/${id}/audit`)
    if (!res.ok) throw new Error('Falha ao buscar auditoria da demanda')
    return res.json()
  },

  async createDemand(data: { title: string; client: string; reach: number; impact: number; confidence: number; owner?: string; status?: Status; description?: string }): Promise<Demand> {
    const res = await fetch(`${API_BASE}/demands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Falha ao criar demanda')
    return res.json()
  },

  async updateDemand(id: string, updates: Partial<Demand> & { justification?: string }): Promise<Demand> {
    const res = await fetch(`${API_BASE}/demands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Falha ao atualizar demanda')
    return res.json()
  },

  async deleteDemand(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/demands/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Falha ao deletar demanda')
  },

  async getInterviewStatus(): Promise<{ refinementConfigured: boolean; supabaseConfigured: boolean; model: string }> {
    const res = await fetch(`${API_BASE}/interview/status`)
    if (!res.ok) throw new Error('Falha ao verificar status dos serviços')
    return res.json()
  },

  async getNextQuestion(data: { initialText: string; clientName?: string; history: Array<{ question: string; answer: string }> }): Promise<{
    question: string
    options: string[]
    factor: 'Reach' | 'Impact' | 'Confidence' | 'Contexto'
    completeness: number
    isFinished: boolean
  }> {
    const res = await fetch(`${API_BASE}/interview/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const result = await res.json().catch(() => null) as { error?: string } | null
      throw new Error(result?.error ?? 'Falha ao gerar a próxima pergunta')
    }
    return res.json()
  },

  async finalizeInterview(data: { initialText: string; clientName?: string; history: Array<{ question: string; answer: string }>; owner?: string }): Promise<{
    demand: Demand
    metrics: { title: string; reach: number; impact: number; confidence: number; structuredReport: string }
    score: number
    priority: Priority
  }> {
    const res = await fetch(`${API_BASE}/interview/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Falha ao finalizar entrevista')
    return res.json()
  },

  async completeInterview(data: { initialText: string; answers: string[]; client?: string; owner?: string; title?: string }) {
    const res = await fetch(`${API_BASE}/interview/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Falha ao concluir entrevista')
    return res.json()
  },

  async getReviews(): Promise<{ reviews: ReviewItem[]; health: { label: string; value: string }[]; total: number }> {
    const res = await fetch(`${API_BASE}/reviews`)
    if (!res.ok) throw new Error('Falha ao buscar revisões')
    return res.json()
  },

  async correctReview(id: string, correction: { factor: 'Reach' | 'Impact' | 'Confidence'; from: string; to: string; reason: string }) {
    const res = await fetch(`${API_BASE}/reviews/${id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correction),
    })
    if (!res.ok) throw new Error('Falha ao enviar correção')
    return res.json()
  },

  async approveReview(id: string) {
    const res = await fetch(`${API_BASE}/reviews/${id}/approve`, { method: 'POST' })
    if (!res.ok) throw new Error('Falha ao aprovar revisão')
    return res.json()
  },

  async getDashboard(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard`)
    if (!res.ok) throw new Error('Falha ao buscar métricas do dashboard')
    return res.json()
  },

  async getGuidelines(): Promise<{ guidelines: Guideline[]; total: number }> {
    const res = await fetch(`${API_BASE}/guidelines`)
    if (!res.ok) throw new Error('Falha ao buscar diretrizes')
    return res.json()
  },

  async createGuideline(data: { title: string; description: string; factorAffected: 'Reach' | 'Impact' | 'Confidence'; condition?: string; adjustment?: string }): Promise<Guideline> {
    const res = await fetch(`${API_BASE}/guidelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Falha ao criar diretriz')
    return res.json()
  },
}
