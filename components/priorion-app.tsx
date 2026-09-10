'use client'

/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/static-components */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit3,
  FileText,
  List,
  Plus,
  Save,
  SlidersHorizontal,
  Sparkles,
  Users,
  ShieldCheck,
  LogOut,
  X,
  Zap,
} from 'lucide-react'
import {
  api,
  type Demand,
  type Priority,
  type Status,
  type ReviewItem,
  type Guideline,
  type DemandAudit,
} from '@/lib/prototype-api'

// ─── Palette constants ────────────────────────────────────────────────────────

const BG = {
  canvas:      '#0A0A0B',
  surface:     '#111113',
  surface2:    '#17171A',
  surface3:    '#1E1E22',
  border:      '#232327',
  borderStrong:'#2E2E33',
  text:        '#EDEDEF',
  textSec:     '#9B9BA3',
  textTer:     '#6B6B73',
  textDis:     '#4A4A52',
  action:      '#4D7CFF',
  actionHover: '#6B93FF',
  actionSoft:  'rgba(77,124,255,0.12)',
  actionBorder:'rgba(77,124,255,0.35)',
}

type Screen  = 'queue' | 'new' | 'detail' | 'review' | 'fila' | 'demand_detail' | 'users'
type SortKey = 'score' | 'reach' | 'impact' | 'confidence' | 'client'
type SortDir = 'asc' | 'desc'

export type Viewer = {
  displayName: string
  department: string
  role: 'colaborador' | 'administrador' | 'admin'
}

function calcScore(r: number, i: number, c: number) {
  return Math.round(r * i * c * 10) / 10
}

function determinePriority(score: number): Priority {
  if (score >= 1200) return 'critico'
  if (score >= 500) return 'alto'
  if (score >= 150) return 'medio'
  return 'baixo'
}

const PRIORITY: Record<Priority, {
  text: string; bg: string; border: string; glow: string; label: string; leftBorder: string
}> = {
  'critico': {
    text: '#FF5C5C', bg: 'rgba(255,92,92,0.10)', border: 'rgba(255,92,92,0.28)',
    glow: '0 0 12px rgba(255,92,92,0.25)', label: 'CRÍTICO', leftBorder: '#FF5C5C',
  },
  'alto': {
    text: '#FFA23A', bg: 'rgba(255,162,58,0.10)', border: 'rgba(255,162,58,0.28)',
    glow: '0 0 8px rgba(255,162,58,0.20)', label: 'ALTO', leftBorder: '#FFA23A',
  },
  'medio': {
    text: '#FFD84D', bg: 'rgba(255,216,77,0.09)', border: 'rgba(255,216,77,0.25)',
    glow: '', label: 'MÉDIO', leftBorder: '#FFD84D',
  },
  'baixo': {
    text: '#3DDC97', bg: 'rgba(61,220,151,0.10)', border: 'rgba(61,220,151,0.28)',
    glow: '', label: 'BAIXO', leftBorder: '#3DDC97',
  },
}

const STATUS_LABELS: Record<Status, string> = {
  pendente_aprovacao: 'Pendente de Aprovação',
  aprovada_aberta: 'Aprovada/Em Aberto',
  em_execucao: 'Em execução',
  travada: 'Travada',
  concluida: 'Concluída',
}

function PriorityBadge({ priority, size = 'md' }: { priority: Priority; size?: 'sm' | 'md' }) {
  const p = PRIORITY[priority] || PRIORITY['medio']
  const animate = priority === 'critico' || priority === 'alto'
  return (
    <span
      style={{
        color: p.text,
        backgroundColor: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: '4px',
        boxShadow: p.glow || undefined,
        animation: animate
          ? priority === 'critico'
            ? 'glowPulse 2.2s ease-in-out infinite'
            : 'glowPulseHigh 2.5s ease-in-out infinite'
          : undefined,
        letterSpacing: '0.04em',
        lineHeight: '1',
        height: '20px',
        padding: size === 'sm' ? '0 5px' : '0 6px',
        fontSize: '11px',
        fontWeight: '600',
      }}
      className="inline-flex items-center uppercase"
    >
      {p.label}
    </span>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const isDone = status === 'concluida'
  const isExec = status === 'em_execucao'
  const isRef = status === 'pendente_aprovacao'
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-medium"
      style={{
        backgroundColor: isDone ? 'rgba(61,220,151,0.12)' : isExec ? 'rgba(77,124,255,0.12)' : isRef ? 'rgba(255,216,77,0.12)' : BG.surface3,
        color: isDone ? '#3DDC97' : isExec ? '#4D7CFF' : isRef ? '#FFD84D' : BG.textSec,
        border: `1px solid ${isDone ? 'rgba(61,220,151,0.3)' : isExec ? 'rgba(77,124,255,0.3)' : isRef ? 'rgba(255,216,77,0.3)' : BG.border}`,
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function RicBar({ demand, allDemands }: { demand: Demand; allDemands: Demand[] }) {
  function percentile(values: number[], val: number) {
    if (values.length === 0) return 0.5
    const sorted = [...values].sort((a, b) => a - b)
    const rank = sorted.findIndex(v => v >= val) + 1
    return rank / sorted.length
  }

  const rP = percentile(allDemands.map(d => d.reach), demand.reach)
  const iP = percentile(allDemands.map(d => d.impact), demand.impact)
  const cP = percentile(allDemands.map(d => d.confidence), demand.confidence)

  const maxH = 14
  const p = PRIORITY[demand.priority] || PRIORITY['medio']

  const segments = [
    { label: 'R', pct: rP, color: p.text },
    { label: 'I', pct: iP, color: p.text },
    { label: 'C', pct: cP, color: p.text },
  ]

  const tooltip = `Reach ${demand.reach.toLocaleString('pt-BR')} · Impact ${demand.impact}× · Confiança ${Math.round(demand.confidence * 100)}%`

  return (
    <div className="flex items-end gap-px" title={tooltip} style={{ height: `${maxH}px` }}>
      {segments.map(s => {
        const h = Math.max(2, Math.round(s.pct * maxH))
        return (
          <div
            key={s.label}
            style={{
              width: '4px',
              height: `${maxH}px`,
              display: 'flex',
              flexDirection: 'column-reverse',
              alignItems: 'stretch',
            }}
          >
            <div style={{ height: `${h}px`, backgroundColor: s.color, borderRadius: '1px', opacity: 0.9 }} />
            <div style={{ flex: 1, backgroundColor: s.color, borderRadius: '1px', opacity: 0.12 }} />
          </div>
        )
      })}
    </div>
  )
}

function DeltaPosition({ delta }: { delta?: { delta: number; reason: string } }) {
  if (!delta || delta.delta === 0) {
    return <span className="font-mono text-center block" style={{ fontSize: '11px', color: BG.textDis }}>—</span>
  }
  const isUp = delta.delta > 0
  return (
    <span
      title={delta.reason}
      className="font-mono font-medium inline-flex items-center gap-0.5 cursor-help"
      style={{ fontSize: '11px', color: isUp ? '#3DDC97' : '#FF5C5C' }}
    >
      {isUp ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
      {Math.abs(delta.delta)}
    </span>
  )
}

// ─── Screen 1 — Fila priorizada ───────────────────────────────────────────────

function QueueScreen({
  onSelectDemand,
  onNewDemand,
  demands,
  loading,
  onRefresh,
  isAdmin,
}: {
  onSelectDemand: (d: Demand) => void
  onNewDemand: () => void
  demands: Demand[]
  loading: boolean
  onRefresh: () => void
  isAdmin: boolean
}) {
  const [queueView, setQueueView] = useState<'triage' | 'prioritized'>(isAdmin ? 'triage' : 'prioritized')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterClient, setFilterClient] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  const sorted = useMemo(() => {
    let list = isAdmin
      ? demands.filter(d => queueView === 'triage'
        ? d.status === 'pendente_aprovacao'
        : !['pendente_aprovacao', 'concluida'].includes(d.status))
      : [...demands]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.client.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q)
      )
    }
    if (filterClient) list = list.filter(d => d.client === filterClient)
    if (filterOwner) list = list.filter(d => d.owner === filterOwner)
    if (filterPriority) list = list.filter(d => d.priority === filterPriority)

    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'score') cmp = a.score - b.score
      else if (sortKey === 'reach') cmp = a.reach - b.reach
      else if (sortKey === 'impact') cmp = a.impact - b.impact
      else if (sortKey === 'confidence') cmp = a.confidence - b.confidence
      else if (sortKey === 'client') cmp = a.client.localeCompare(b.client)
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [demands, isAdmin, queueView, sortKey, sortDir, filterClient, filterOwner, filterPriority, searchQuery])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const criticalCount = sorted.filter(d => d.priority === 'critico').length
  const triageCount = demands.filter(d => d.status === 'pendente_aprovacao').length
  const prioritizedCount = demands.filter(d => !['pendente_aprovacao', 'concluida'].includes(d.status)).length
  const clients = [...new Set(demands.map(d => d.client))].sort()
  const owners  = [...new Set(demands.map(d => d.owner))].sort()
  const hasFilters = !!(filterClient || filterOwner || filterPriority || searchQuery)

  const selectStyle = {
    height: '28px', padding: '0 24px 0 8px', fontSize: '12px',
    color: BG.textSec, border: `1px solid ${BG.border}`, borderRadius: '4px',
    backgroundColor: BG.surface, cursor: 'pointer', outline: 'none', appearance: 'none' as const,
  }

  function ThSort({ label, k, right }: { label: string; k: SortKey; right?: boolean }) {
    const active = sortKey === k
    return (
      <th
        onClick={() => handleSort(k)}
        className="select-none cursor-pointer px-4 py-2 whitespace-nowrap"
        style={{
          fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
          color: active ? BG.textSec : BG.textTer, textAlign: right ? 'right' : 'left',
        }}
      >
        <span className={`inline-flex items-center gap-1 ${right ? 'justify-end w-full' : ''}`}>
          {label}
          {active
            ? sortDir === 'desc' ? <ArrowDown size={11} strokeWidth={2} /> : <ArrowUp size={11} strokeWidth={2} />
            : <ArrowUpDown size={11} strokeWidth={1.5} style={{ opacity: 0.3 }} />}
        </span>
      </th>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG.canvas }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold leading-tight tracking-tight" style={{ fontSize: '20px', color: BG.text }}>
                {isAdmin && queueView === 'triage' ? 'Inbox de Triagem' : isAdmin ? 'Fila priorizada' : 'Minhas solicitações'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Reach × Impact × Confidence
              </span>
            </div>
            <p className="font-mono mt-1" style={{ fontSize: '12px', color: BG.textTer }}>
              {sorted.length} demandas nesta visão · {criticalCount} críticas · ordenadas por Valor & Certeza
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-2.5 py-1.5 rounded transition-colors text-xs font-mono"
              style={{ border: `1px solid ${BG.border}`, color: BG.textSec, backgroundColor: BG.surface }}
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            {!isAdmin ? <button
              onClick={onNewDemand}
              className="flex items-center gap-1.5 px-3 shrink-0 transition-colors"
              style={{
                height: '30px', backgroundColor: BG.action, color: '#fff',
                fontSize: '13px', fontWeight: '500', borderRadius: '6px',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = BG.actionHover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = BG.action)}
            >
              <Plus size={14} strokeWidth={2} />
              Nova demanda
            </button> : null}
          </div>
        </div>

        {isAdmin ? (
          <div className="mb-4 flex w-fit rounded-[6px] border p-0.5" style={{ borderColor: BG.border, backgroundColor: BG.surface }}>
            <button
              type="button"
              onClick={() => setQueueView('triage')}
              className="rounded-[4px] px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: queueView === 'triage' ? BG.actionSoft : 'transparent', color: queueView === 'triage' ? BG.action : BG.textSec }}
            >
              Inbox de Triagem <span className="ml-1 font-mono">{triageCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setQueueView('prioritized')}
              className="rounded-[4px] px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: queueView === 'prioritized' ? BG.actionSoft : 'transparent', color: queueView === 'prioritized' ? BG.action : BG.textSec }}
            >
              Fila priorizada <span className="ml-1 font-mono">{prioritizedCount}</span>
            </button>
          </div>
        ) : null}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <input
            type="text"
            placeholder="Buscar por título, cliente ou ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-2.5 py-1 text-xs rounded outline-none"
            style={{
              backgroundColor: BG.surface, border: `1px solid ${BG.border}`,
              color: BG.text, width: '220px', height: '28px',
            }}
          />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
            <option value="">Todos os clientes</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={selectStyle}>
            <option value="">Todos os responsáveis</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | '')} style={selectStyle}>
            <option value="">Todas as prioridades</option>
            <option value="critico">Crítico</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilterClient(''); setFilterOwner(''); setFilterPriority(''); setSearchQuery('') }}
              className="flex items-center gap-1 transition-colors ml-1"
              style={{ fontSize: '12px', color: BG.textTer }}
              onMouseEnter={e => (e.currentTarget.style.color = BG.textSec)}
              onMouseLeave={e => (e.currentTarget.style.color = BG.textTer)}
            >
              <X size={12} strokeWidth={2} /> Limpar
            </button>
          )}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: BG.border }} />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: BG.canvas }}>
            <tr style={{ borderBottom: `1px solid ${BG.border}` }}>
              <th className="px-3 py-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer, width: '32px' }} />
              <th className="px-3 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer, width: '80px' }}>ID</th>
              <th className="px-4 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Demanda</th>
              <ThSort label="Cliente" k="client" />
              <ThSort label="Reach" k="reach" right />
              <ThSort label="Impact" k="impact" right />
              <ThSort label="Confiança" k="confidence" right />
              <th className="px-3 py-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer, width: '70px', textAlign: 'center' }}>Sinal</th>
              <ThSort label="Score Valor" k="score" right />
              <th className="px-4 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Prioridade</th>
              <th className="px-4 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => {
              const isCrit = d.priority === 'critico'
              const p = PRIORITY[d.priority] || PRIORITY['medio']
              return (
                <tr
                  key={d.id}
                  onClick={() => onSelectDemand(d)}
                  className="row-enter cursor-pointer group"
                  style={{
                    height: '42px',
                    borderBottom: `1px solid ${BG.border}`,
                    borderLeft: isCrit ? `2px solid ${p.leftBorder}` : '2px solid transparent',
                    boxShadow: isCrit ? `inset 2px 0 8px -4px rgba(255,92,92,0.4)` : undefined,
                    animationDelay: `${i * 18}ms`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = BG.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Delta */}
                  <td className="px-2 text-right">
                    <DeltaPosition delta={d.delta} />
                  </td>
                  {/* ID */}
                  <td className="px-3">
                    <span className="font-mono" style={{ fontSize: '11px', color: BG.textTer }}>{d.id}</span>
                  </td>
                  {/* Title */}
                  <td className="px-4 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium" style={{ fontSize: '13px', color: BG.text }}>
                        {d.title}
                      </span>
                    </div>
                  </td>
                  {/* Client */}
                  <td className="px-4 whitespace-nowrap">
                    <span style={{ fontSize: '12px', color: BG.textSec }}>{d.client}</span>
                  </td>
                  {/* Reach */}
                  <td className="px-4 text-right">
                    <span className="font-mono tabular-nums" style={{ fontSize: '12px', color: BG.textSec }}>
                      {d.reach.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  {/* Impact */}
                  <td className="px-4 text-right">
                    <span className="font-mono tabular-nums" style={{ fontSize: '12px', color: BG.textSec }}>{d.impact}×</span>
                  </td>
                  {/* Confidence */}
                  <td className="px-4 text-right">
                    <span className="font-mono tabular-nums" style={{ fontSize: '12px', color: BG.textSec }}>{Math.round(d.confidence * 100)}%</span>
                  </td>
                  {/* RIC micro-bar */}
                  <td className="px-3 text-center">
                    <div className="flex items-center justify-center">
                      <RicBar demand={d} allDemands={demands} />
                    </div>
                  </td>
                  {/* Score */}
                  <td className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div
                        style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          backgroundColor: p.text, boxShadow: `0 0 6px ${p.text}`,
                        }}
                      />
                      <span className="font-mono tabular-nums font-bold" style={{ fontSize: '13px', color: BG.text }}>
                        {d.score.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </td>
                  {/* Priority */}
                  <td className="px-4">
                    <PriorityBadge priority={d.priority} />
                  </td>
                  {/* Status */}
                  <td className="px-4">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && sorted.length === 0 ? (
          <div className="flex h-40 items-center justify-center font-mono text-xs" style={{ color: BG.textTer }}>
            Nenhuma demanda nesta visão.
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Screen 2 — Nova demanda ──────────────────────────────────────────────────

function NewDemandScreen({ onDemandCreated }: { onDemandCreated?: (d: Demand) => void }) {
  const [initialText, setInitialText] = useState('')
  const [clientName, setClientName] = useState('')
  const [started, setStarted] = useState(false)
  const [history, setHistory] = useState<Array<{ question: string; answer: string; factor?: string }>>([])
  const [currentQuestion, setCurrentQuestion] = useState<{
    question: string
    options: string[]
    factor: 'Reach' | 'Impact' | 'Confidence' | 'Contexto'
    completeness: number
    isFinished: boolean
  } | null>(null)
  const [customAnswer, setCustomAnswer] = useState('')
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedDemand, setSavedDemand] = useState<Demand | null>(null)
  const [interviewError, setInterviewError] = useState('')
  const requestInFlight = useRef(false)

  const completeness = currentQuestion ? currentQuestion.completeness : (started ? 25 : 0)
  const done = currentQuestion ? currentQuestion.isFinished || currentQuestion.completeness >= 100 : false

  async function handleStartInterview() {
    if (!initialText.trim() || requestInFlight.current) return
    requestInFlight.current = true
    setInterviewError('')
    setStarted(true)
    setLoadingAi(true)
    try {
      const q = await api.getNextQuestion({
        initialText,
        clientName: clientName || 'Cliente',
        history: [],
      })
      setCurrentQuestion(q)
    } catch (e) {
      setStarted(false)
      setInterviewError(e instanceof Error ? e.message : 'Não foi possível iniciar o refinamento.')
    } finally {
      requestInFlight.current = false
      setLoadingAi(false)
    }
  }

  async function handleSendAnswer(ans: string) {
    if (!ans.trim() || !currentQuestion || loadingAi || requestInFlight.current) return
    requestInFlight.current = true
    setInterviewError('')
    setPendingAnswer(ans)
    const newHistory = [...history, { question: currentQuestion.question, answer: ans, factor: currentQuestion.factor }]
    setHistory(newHistory)
    setCustomAnswer('')
    setLoadingAi(true)

    try {
      const nextQ = await api.getNextQuestion({
        initialText,
        clientName: clientName || 'Cliente',
        history: newHistory,
      })
      setCurrentQuestion(nextQ)
    } catch (e) {
      setHistory(history)
      setCustomAnswer(ans)
      setInterviewError(e instanceof Error ? e.message : 'Não foi possível continuar o refinamento.')
    } finally {
      requestInFlight.current = false
      setPendingAnswer(null)
      setLoadingAi(false)
    }
  }

  async function handleFinalizeDemand() {
    if (saving) return
    setSaving(true)
    try {
      const res = await api.finalizeInterview({
        initialText,
        clientName: clientName || 'Cliente Geral',
        history: history.map(h => ({ question: h.question, answer: h.answer })),
      })
      setSavedDemand(res.demand)
      if (onDemandCreated) {
        setTimeout(() => onDemandCreated(res.demand), 1200)
      }
    } catch (e) {
      alert('Não foi possível salvar a demanda: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '100px', padding: '10px 12px', fontSize: '13px',
    color: BG.text, backgroundColor: BG.surface, border: `1px solid ${BG.border}`,
    borderRadius: '6px', resize: 'none', outline: 'none',
    lineHeight: '1.6', fontFamily: 'inherit',
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG.canvas }}>
      <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${BG.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold tracking-tight" style={{ fontSize: '20px', color: BG.text }}>Nova demanda</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Sparkles size={10} /> Refinamento assistido
              </span>
            </div>
            <p className="mt-1" style={{ fontSize: '12px', color: BG.textTer }}>
              Responda perguntas contextuais para estruturar Reach, Impact e Confidence.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left column */}
        <div className="w-1/2 flex flex-col p-6 overflow-y-auto" style={{ borderRight: `1px solid ${BG.border}` }}>
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: BG.textTer }}>
              Setor impactado
            </label>
            <input
              type="text"
              placeholder="Ex: Financeiro, Operações, Atendimento..."
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              disabled={started}
              className="w-full px-3 py-1.5 text-xs rounded mb-3 outline-none"
              style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}`, color: BG.text }}
            />
            <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: BG.textTer }}>
              Como o cliente escreveu (texto livre)
            </label>
            <textarea
              style={inputStyle}
              disabled={started}
              value={initialText}
              onChange={e => setInitialText(e.target.value)}
              placeholder="Cole aqui o e-mail, áudio transcrito ou mensagem de WhatsApp do cliente..."
            />
            {!started && (
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    setInitialText('O leitor de código de barras no caixa da loja central tá travando e não lê os produtos após o meio-dia.')
                    setClientName('Supermercado União')
                  }}
                  className="text-xs transition-colors"
                  style={{ color: BG.textTer }}
                  onMouseEnter={e => (e.currentTarget.style.color = BG.action)}
                  onMouseLeave={e => (e.currentTarget.style.color = BG.textTer)}
                >
                  + Usar texto de exemplo
                </button>
                <button
                  onClick={handleStartInterview}
                  disabled={!initialText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-xs font-semibold"
                  style={{
                    backgroundColor: initialText.trim() ? BG.action : BG.surface3,
                    color: initialText.trim() ? '#fff' : BG.textDis,
                  }}
                >
                  <Sparkles size={13} strokeWidth={2} /> Iniciar refinamento
                </button>
              </div>
            )}
          </div>

          {/* Interactive interview questions */}
          {started && currentQuestion && !done && (
            <div className="mt-2 p-4 rounded-[6px]" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase" style={{ backgroundColor: BG.actionSoft, color: BG.action }}>
                  Pergunta {history.length + 1} · Foco: {currentQuestion.factor}
                </span>
                {loadingAi && <span className="text-[11px] text-blue-400 flex items-center gap-1"><Sparkles size={11} className="animate-spin" /> Analisando...</span>}
              </div>
              <p className="font-medium text-sm mb-3" style={{ color: BG.text }}>{currentQuestion.question}</p>

              {/* Suggested options */}
              <div className="space-y-2 mb-3">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSendAnswer(opt)}
                    disabled={loadingAi || !!pendingAnswer}
                    className="w-full text-left p-2.5 rounded transition-all text-xs flex items-center justify-between"
                    style={{
                      backgroundColor: pendingAnswer === opt ? BG.surface3 : BG.surface2,
                      border: `1px solid ${pendingAnswer === opt ? BG.action : BG.border}`,
                      color: BG.text,
                    }}
                  >
                    <span>{opt}</span>
                    {pendingAnswer === opt ? <Sparkles size={12} className="animate-spin text-blue-400" /> : <ChevronRight size={13} style={{ color: BG.textTer }} />}
                  </button>
                ))}
              </div>

              {/* Or type custom response */}
              <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ou digite sua própria resposta..."
                  value={customAnswer}
                  onChange={e => setCustomAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendAnswer(customAnswer) }}
                  disabled={loadingAi}
                  className="flex-1 px-3 py-1.5 text-xs rounded outline-none"
                  style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}`, color: BG.text }}
                />
                <button
                  onClick={() => handleSendAnswer(customAnswer)}
                  disabled={!customAnswer.trim() || loadingAi}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: customAnswer.trim() ? BG.action : BG.surface3 }}
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {interviewError ? (
            <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-[6px] border border-[rgba(255,92,92,0.28)] bg-[rgba(255,92,92,0.10)] p-3 text-xs text-[#FF5C5C]">
              <span>{interviewError}</span>
              {started && currentQuestion ? (
                <button type="button" onClick={() => handleSendAnswer(customAnswer)} className="shrink-0 font-medium underline">Tentar novamente</button>
              ) : null}
            </div>
          ) : null}

          {done && (
            <div className="mt-4 p-4 rounded-[6px]" style={{ backgroundColor: 'rgba(61,220,151,0.08)', border: '1px solid rgba(61,220,151,0.25)' }}>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                <Check size={14} strokeWidth={2.5} /> Refinamento concluído
              </div>
              <p className="text-xs text-stone-300 mb-3">
                As evidências necessárias para categorizar Reach, Impact e Confidence foram reunidas.
              </p>
              {savedDemand ? (
                <div className="p-3 rounded bg-black/50 text-xs font-mono text-emerald-300 border border-emerald-500/30">
                  <p className="font-bold mb-1">Demanda salva com sucesso!</p>
                  <p>ID: {savedDemand.id} · Score: {savedDemand.score} · Prioridade: {savedDemand.priority.toUpperCase()}</p>
                </div>
              ) : (
                <button
                  onClick={handleFinalizeDemand}
                  disabled={saving}
                  className="w-full py-2.5 px-3 rounded text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: BG.action }}
                >
                  {saving ? (
                    <>
                      <Sparkles size={13} className="animate-spin" /> Extraindo fatores e salvando...
                    </>
                  ) : (
                    'Categorizar e Gravar Demanda na Fila'
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column: Live report */}
        <div className="w-1/2 flex flex-col p-6 overflow-y-auto" style={{ backgroundColor: BG.canvas }}>
          <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: `1px solid ${BG.border}` }}>
            <span className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: BG.textTer }}>
              Histórico da Triagem em Tempo Real
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs" style={{ color: BG.action }}>{completeness}%</span>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BG.surface2 }}>
                <div className="h-full transition-all duration-300" style={{ width: `${completeness}%`, backgroundColor: BG.action }} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-xs" style={{ color: BG.textTer }}>
                Inicie o refinamento para acompanhar o diálogo e a extração dos fatores.
              </p>
            ) : (
              history.map((h, idx) => (
                <div key={idx} className="p-3 rounded text-xs space-y-1.5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
                  <p className="font-medium text-blue-400">P{idx + 1}: {h.question}</p>
                  <p className="text-stone-300">R: {h.answer}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 4 — Detalhes & Transparência da Demanda ─────────────────────────

function DetailScreen({
  demand,
  onDemandUpdated,
  onNavigateReview,
}: {
  demand: Demand
  onDemandUpdated?: () => void
  onNavigateReview?: () => void
}) {
  const [audit, setAudit] = useState<DemandAudit | null>(null)
  const [approving, setApproving] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    let active = true
    api.getDemandAudit(demand.id)
      .then(result => { if (active) setAudit(result) })
      .catch(error => console.error('Falha ao carregar auditoria:', error))
    return () => { active = false }
  }, [demand.id])

  async function handleQuickApprove() {
    setApproving(true)
    try {
      await api.updateDemand(demand.id, {
        status: 'aprovada_aberta',
        justification: 'Classificação revisada e aprovada sem alterações.',
      })
      setToastMsg('Demanda aprovada com sucesso e liberada na fila!')
      setTimeout(() => setToastMsg(''), 2500)
      if (onDemandUpdated) onDemandUpdated()
    } catch (e) {
      alert('Erro ao aprovar demanda: ' + String(e))
    } finally {
      setApproving(false)
    }
  }

  const calculatedScore = calcScore(demand.reach, demand.impact, demand.confidence)
  const calculatedPriority = determinePriority(calculatedScore)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: BG.canvas }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${BG.border}` }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-stone-400">{demand.id}</span>
              <PriorityBadge priority={calculatedPriority} />
              <StatusBadge status={demand.status} />
            </div>
            <h1 className="font-semibold tracking-tight text-xl" style={{ color: BG.text }}>
              {demand.title}
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="font-mono font-bold tabular-nums text-3xl leading-none" style={{ color: BG.text }}>
                {calculatedScore.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
              <p className="font-mono text-xs text-stone-400 mt-1">
                {demand.reach.toLocaleString('pt-BR')} × {demand.impact}× × {Math.round(demand.confidence * 100)}%
              </p>
            </div>
            {demand.status === 'pendente_aprovacao' && (
              <button
                onClick={handleQuickApprove}
                disabled={approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-xs font-semibold text-stone-900 transition-opacity hover:opacity-90 shadow-sm cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#3DDC97' }}
              >
                <Check size={14} strokeWidth={2.5} /> {approving ? 'Aprovando...' : 'Aprovar Demanda'}
              </button>
            )}
            {onNavigateReview ? (
              <button
                onClick={onNavigateReview}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-sm cursor-pointer"
                style={{ backgroundColor: BG.action }}
              >
                <Edit3 size={13} strokeWidth={2} /> Editar na aba de revisão
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body: Visualização Completa de Transparência e Auditoria */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Painel de Métricas Auditáveis */}
        <div className="p-5 rounded-[6px]" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase font-bold tracking-wider text-stone-400">
              Métricas de Valor &amp; Certeza (Auditáveis)
            </p>
            <span className="text-[11px] font-mono text-stone-400">Fórmula: Reach × Impact × Confidence</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-[6px]" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">Reach (Alcance)</span>
                <span className="text-[10px] font-mono text-stone-400">fator absoluto</span>
              </div>
              <p className="font-mono text-2xl font-bold text-blue-400 mt-1">
                {demand.reach.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-stone-300 mt-1">usuários ou terminais afetados</p>
              <p className="text-[10px] text-stone-400 mt-2">
                Estimativa de alcance informada pelo solicitante ou inferida no relato.
              </p>
            </div>

            <div className="p-4 rounded-[6px]" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">Impact (Gravidade)</span>
                <span className="text-[10px] font-mono text-stone-400">multiplicador</span>
              </div>
              <p className="font-mono text-2xl font-bold text-blue-400 mt-1">
                {demand.impact}×
              </p>
              <p className="text-xs text-stone-300 mt-1">
                {demand.impact >= 3 ? 'Crítico / Parada Total' : demand.impact >= 2 ? 'Alto / Prejuízo Operacional' : demand.impact >= 1 ? 'Moderado / Rotina' : demand.impact >= 0.5 ? 'Baixo' : 'Mínimo / Cosmético'}
              </p>
              <p className="text-[10px] text-stone-400 mt-2">
                Grau de severidade direta no faturamento e operação da empresa.
              </p>
            </div>

            <div className="p-4 rounded-[6px]" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">Confidence (Certeza)</span>
                <span className="text-[10px] font-mono text-stone-400">grau de evidência</span>
              </div>
              <p className="font-mono text-2xl font-bold text-blue-400 mt-1">
                {Math.round(demand.confidence * 100)}%
              </p>
              <p className="text-xs text-stone-300 mt-1">
                {demand.confidence >= 1 ? '100% - Comprovado por logs / evidências' : demand.confidence >= 0.8 ? '80% - Relato formal do cliente' : '50% - Percepção preliminar'}
              </p>
              <p className="text-[10px] text-stone-400 mt-2">
                Nível de certeza fática sem invenção de dados.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between text-xs border-t border-stone-800 text-stone-400">
            <span>
              {demand.status === 'pendente_aprovacao'
                ? 'Esta demanda aguarda aprovação. Você pode aprová-la diretamente ou calibrar seus fatores na aba de edição.'
                : 'Para calibrar ou alterar os fatores manualmente, utilize a aba Editar e aprovar.'}
            </span>
            <div className="flex items-center gap-3">
              {demand.status === 'pendente_aprovacao' && (
                <button
                  onClick={handleQuickApprove}
                  disabled={approving}
                  className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check size={13} strokeWidth={2.5} /> {approving ? 'Aprovando...' : 'Aprovar sem alterações'}
                </button>
              )}
              {onNavigateReview ? (
                <button
                  onClick={onNavigateReview}
                  className="text-xs font-semibold text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Abrir edição <ChevronRight size={12} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Informações Gerais (Somente Leitura) */}
        <div className="p-5 rounded-[6px]" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
          <p className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-4">Informações Gerais da Demanda</p>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Status da Demanda</span>
              <div className="mt-0.5">
                <StatusBadge status={demand.status} />
              </div>
            </div>

            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Cliente / Setor</span>
              <p className="text-xs font-medium text-stone-200 mt-0.5">{demand.client}</p>
            </div>

            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Responsável</span>
              <p className="text-xs font-medium text-stone-200 mt-0.5">{demand.owner || 'Não atribuído'}</p>
            </div>

            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Criado em</span>
              <p className="text-xs font-mono text-stone-300 mt-0.5">{demand.createdAt}</p>
            </div>
          </div>
        </div>

        {/* Relatos */}
        <div className="grid grid-cols-2 gap-4">
          <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Relato original</p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-300">
              {demand.originalText || 'Relato original não disponível.'}
            </p>
          </section>
          <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Relatório estruturado</p>
              {audit?.evaluation ? (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {audit.evaluation.model}
                </span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-300">
              {demand.description || 'Relatório ainda não disponível.'}
            </p>
          </section>
        </div>

        {audit?.evaluation ? (
          <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Justificativa da avaliação</p>
            <p className="text-xs leading-relaxed text-stone-300">{audit.evaluation.justification}</p>
            {audit.evaluation.inconsistencyAlerts.length ? (
              <div className="mt-3 space-y-2">
                {audit.evaluation.inconsistencyAlerts.map(alert => (
                  <p key={alert} className="flex items-start gap-2 rounded border border-[rgba(255,162,58,0.28)] bg-[rgba(255,162,58,0.10)] p-2.5 text-xs text-[#FFA23A]">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {alert}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Histórico operacional</p>
          {audit?.history.length ? (
            <div className="space-y-3">
              {audit.history.map(entry => (
                <div key={entry.id} className="flex gap-3 border-l border-[#2E2E33] pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium capitalize text-stone-200">{entry.action.replaceAll('_', ' ')}</p>
                      <time className="shrink-0 font-mono text-[10px] text-stone-500">
                        {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-400">{entry.actorName}</p>
                    {entry.justification ? <p className="mt-1 text-xs text-stone-300">{entry.justification}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-stone-500">Nenhum evento registrado.</p>
          )}
        </section>
      </div>

      {toastMsg && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded shadow-lg text-xs font-medium z-50 bg-stone-900 border border-emerald-500/40 text-emerald-400">
          <Check size={13} /> {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─── Screen 6 — Revisão e Auditoria Humana (Todas as demandas) ───────────────

function ReviewScreen({
  demands,
  initialSelectedId,
  onDemandUpdated,
}: {
  demands: Demand[]
  initialSelectedId?: string
  onDemandUpdated?: () => void
}) {
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId || demands[0]?.id || '')
  const [toastMsg, setToastMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [reach, setReach] = useState(0)
  const [impact, setImpact] = useState(1)
  const [confidence, setConfidence] = useState(0.5)
  const [status, setStatus] = useState<Status>('pendente_aprovacao')
  const [justification, setJustification] = useState('')

  const item = demands.find(d => d.id === selectedId) || demands[0]

  useEffect(() => {
    if (initialSelectedId && demands.some(d => d.id === initialSelectedId)) {
      setSelectedId(initialSelectedId)
    }
  }, [initialSelectedId, demands])

  useEffect(() => {
    if (!item) return
    setReach(item.reach)
    setImpact(item.impact)
    setConfidence(item.confidence)
    setStatus(item.status)
    setJustification('')
  }, [item])

  async function handleApprove() {
    if (!item) return
    const isPending = item.status === 'pendente_aprovacao'
    const factorsChanged = reach !== item.reach || impact !== item.impact || confidence !== item.confidence
    const statusChanged = status !== item.status

    // Se a demanda está pendente e o status não foi alterado para outro estado no select,
    // o ato de aprovar transiciona a demanda para 'aprovada_aberta'
    const targetStatus: Status = (isPending && status === 'pendente_aprovacao')
      ? 'aprovada_aberta'
      : status

    // Justificativa só é obrigatória se o usuário alterou os fatores de cálculo (Reach, Impact, Confidence)
    // ou se mudou o status manualmente para outro estado (como 'travada')
    const requiresJustification = factorsChanged || (statusChanged && targetStatus !== 'aprovada_aberta')

    if (requiresJustification && justification.trim().length < 5) {
      alert('Informe uma justificativa para a alteração manual dos fatores ou status.')
      return
    }

    setSaving(true)
    try {
      const finalJustification = requiresJustification
        ? justification.trim()
        : 'Classificação revisada e aprovada sem alterações.'

      await api.updateDemand(item.id, {
        reach,
        impact,
        confidence,
        status: targetStatus,
        justification: finalJustification,
      })

      setStatus(targetStatus)
      setToastMsg(
        isPending && targetStatus === 'aprovada_aberta'
          ? 'Demanda aprovada com sucesso e liberada na fila!'
          : 'Alterações da demanda salvas com sucesso!'
      )
      setTimeout(() => setToastMsg(''), 2500)
      if (onDemandUpdated) onDemandUpdated()
    } catch (e) {
      alert('Erro ao salvar demanda: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono" style={{ backgroundColor: BG.canvas, color: BG.textTer }}>
        Nenhuma demanda cadastrada no momento para auditar.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG.canvas }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ backgroundColor: BG.surface, borderBottom: `1px solid ${BG.border}` }}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm" style={{ color: BG.text }}>Auditoria Humana de Demandas</span>
          <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {demands.length} demandas ativas
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Lista de Demandas para Selecionar */}
        <div className="w-80 flex flex-col overflow-y-auto" style={{ borderRight: `1px solid ${BG.border}`, backgroundColor: BG.surface }}>
          <div className="p-3 border-b border-stone-800 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Selecione uma Demanda para Revisar
          </div>
          <div className="divide-y divide-stone-800/60">
            {demands.map(d => {
              const active = d.id === item.id
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="w-full text-left p-3 transition-colors flex flex-col gap-1"
                  style={{
                    backgroundColor: active ? BG.surface3 : 'transparent',
                    borderLeft: active ? `3px solid ${BG.action}` : '3px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-stone-400">{d.id}</span>
                    <PriorityBadge priority={d.priority} size="sm" />
                  </div>
                  <p className="text-xs font-medium truncate text-stone-200">{d.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>{d.client}</span>
                    <span className="font-mono font-semibold text-stone-300">{d.score} pts</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Detalhes da Auditoria */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="p-5 rounded-[6px]" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs text-stone-400">{item.id}</span>
                  <PriorityBadge priority={item.priority} size="sm" />
                  <span className="text-xs text-stone-400">· {item.client} · {item.owner}</span>
                  <span className="text-stone-600">·</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase text-stone-400">Status:</span>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as Status)}
                      className="px-2.5 py-1 text-xs rounded font-medium outline-none cursor-pointer"
                      style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}`, color: BG.text }}
                    >
                      <option value="pendente_aprovacao">Pendente de Aprovação</option>
                      <option value="aprovada_aberta">Aprovada / Aberta</option>
                      <option value="em_execucao">Em Execução</option>
                      <option value="travada">Travada</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>
                <h2 className="text-lg font-semibold" style={{ color: BG.text }}>{item.title}</h2>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold" style={{ color: BG.text }}>
                  {item.score.toLocaleString('pt-BR')}
                </span>
                <p className="text-[11px] text-stone-400">Score de Valor</p>
              </div>
            </div>

            {/* Fatores editáveis — valores persistidos */}
            <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: `1px solid ${BG.border}` }}>
              <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Reach (Alcance)</span>
                  <span className="font-mono text-xs text-blue-400">{reach.toLocaleString('pt-BR')}</span>
                </div>
                <input
                  aria-label="Reach"
                  type="range"
                  min={0}
                  max={Math.max(100, item.reach * 2)}
                  step={1}
                  value={reach}
                  onChange={event => setReach(Number(event.target.value))}
                  className="my-3 w-full"
                />
                <p className="text-[11px] text-stone-400 mt-1">usuários/clientes afetados</p>
              </div>

              <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Impact (Gravidade)</span>
                  <span className="font-mono text-xs text-blue-400">{impact}×</span>
                </div>
                <input
                  aria-label="Impact"
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={[0.25, 0.5, 1, 2, 3].indexOf(impact)}
                  onChange={event => setImpact([0.25, 0.5, 1, 2, 3][Number(event.target.value)])}
                  className="my-3 w-full"
                />
                <p className="text-[11px] text-stone-400 mt-1">multiplicador operacional</p>
              </div>

              <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Confidence (Evidência)</span>
                  <span className="font-mono text-xs text-blue-400">{Math.round(confidence * 100)}%</span>
                </div>
                <input
                  aria-label="Confidence"
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={[0.5, 0.8, 1].indexOf(confidence)}
                  onChange={event => setConfidence([0.5, 0.8, 1][Number(event.target.value)])}
                  className="my-3 w-full"
                />
                <p className="text-[11px] text-stone-400 mt-1">grau de comprovação</p>
              </div>
            </div>

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Justificativa da alteração manual
              <textarea
                value={justification}
                onChange={event => setJustification(event.target.value)}
                placeholder="Obrigatória quando algum fator for alterado"
                rows={2}
                className="mt-1.5 w-full rounded p-2.5 text-xs font-normal normal-case tracking-normal outline-none"
                style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}`, color: BG.text }}
              />
            </label>

            {/* Relatório Técnico */}
            <div className="mt-5 p-3 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Relatório da Demanda</p>
              <div className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">
                {item.description || 'Sem relatório detalhado.'}
              </div>
            </div>

            {/* Botão de Aprovação */}
            <div className="mt-5 flex items-center justify-end">
              <button
                onClick={handleApprove}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded text-xs font-semibold text-stone-900 transition-opacity hover:opacity-90 cursor-pointer shadow-sm disabled:opacity-50"
                style={{ backgroundColor: '#3DDC97' }}
              >
                <Check size={14} strokeWidth={2.5} />{' '}
                {saving
                  ? 'Processando...'
                  : item.status === 'pendente_aprovacao'
                    ? 'Aprovar Classificação da Demanda'
                    : 'Salvar Alterações da Demanda'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded shadow-lg text-xs font-medium z-50 bg-stone-900 border border-emerald-500/40 text-emerald-400">
          <Check size={13} /> {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ADMIN_NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'queue', label: 'Fila priorizada', icon: <List size={15} strokeWidth={1.5} /> },
  { id: 'detail', label: 'Transparência', icon: <FileText size={15} strokeWidth={1.5} /> },
  { id: 'review', label: 'Editar e aprovar', icon: <ClipboardCheck size={15} strokeWidth={1.5} /> },
]

const SUPER_ADMIN_NAV_ITEMS: typeof ADMIN_NAV_ITEMS = [
  { id: 'queue', label: 'Fila priorizada', icon: <List size={15} strokeWidth={1.5} /> },
  { id: 'detail', label: 'Transparência', icon: <FileText size={15} strokeWidth={1.5} /> },
  { id: 'review', label: 'Editar e aprovar', icon: <ClipboardCheck size={15} strokeWidth={1.5} /> },
  { id: 'users', label: 'Gestão de Usuários', icon: <Users size={15} strokeWidth={1.5} /> },
]

const COLLABORATOR_NAV_ITEMS: typeof ADMIN_NAV_ITEMS = [
  { id: 'new', label: 'Nova demanda', icon: <Plus size={15} strokeWidth={1.5} /> },
  { id: 'queue', label: 'Minhas solicitações', icon: <List size={15} strokeWidth={1.5} /> },
  { id: 'fila', label: 'Fila ativa', icon: <FileText size={15} strokeWidth={1.5} /> },
]

function Sidebar({ screen, onNavigate, viewer }: { screen: Screen; onNavigate: (s: Screen) => void; viewer: Viewer }) {
  const isSuperAdmin = viewer.role === 'admin'
  const navItems = isSuperAdmin
    ? SUPER_ADMIN_NAV_ITEMS
    : viewer.role === 'administrador' ? ADMIN_NAV_ITEMS : COLLABORATOR_NAV_ITEMS

  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) window.location.reload()
  }

  return (
    <div className="shrink-0 flex flex-col h-full" style={{ width: '208px', backgroundColor: BG.canvas, borderRight: `1px solid ${BG.border}` }}>
      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: `1px solid ${BG.border}` }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center rounded-[4px]" style={{ backgroundColor: BG.action }}>
            <SlidersHorizontal size={13} strokeWidth={2} style={{ color: '#fff' }} />
          </div>
          <div>
            <span className="font-semibold tracking-tight block leading-tight" style={{ fontSize: '14px', color: BG.text }}>Priorion</span>
            <span className="text-[10px] font-mono" style={{ color: BG.textTer }}>Valor &amp; Certeza</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {navItems.map(item => {
          const active = screen === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center justify-between px-2 py-2 rounded-[4px] text-left transition-colors"
              style={{
                backgroundColor: active ? BG.actionSoft : 'transparent',
                color: active ? BG.action : BG.textSec,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = BG.surface2 }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</span>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-3" style={{ borderTop: `1px solid ${BG.border}` }}>
        <div className="mb-2 min-w-0">
          <p className="truncate text-xs font-medium" style={{ color: BG.text }}>{viewer.displayName}</p>
          <p className="truncate text-[10px]" style={{ color: BG.textTer }}>
            {viewer.department} · {viewer.role === 'admin' ? 'Super Admin' : viewer.role === 'administrador' ? 'Administrador' : 'Colaborador'}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-[#17171A]"
          style={{ color: BG.textSec }}
        >
          <LogOut size={13} strokeWidth={1.5} /> Sair
        </button>
      </div>
    </div>
  )
}

// ─── Active Queue Screen for Collaborators ───────────────────────────────────

function ActiveQueueScreen({
  demands,
  loading,
  onRefresh,
  onSelectDemand,
}: {
  demands: Demand[]
  loading: boolean
  onRefresh: () => void
  onSelectDemand: (d: Demand) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')

  // Collaborators see all active demands (everything except pendente_aprovacao)
  const activeDemands = useMemo(() => {
    let list = demands.filter(d => d.status !== 'pendente_aprovacao')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.client.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      )
    }
    if (filterPriority) list = list.filter(d => d.priority === filterPriority)
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'score') cmp = a.score - b.score
      else if (sortKey === 'reach') cmp = a.reach - b.reach
      else if (sortKey === 'impact') cmp = a.impact - b.impact
      else if (sortKey === 'confidence') cmp = a.confidence - b.confidence
      else if (sortKey === 'client') cmp = a.client.localeCompare(b.client)
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [demands, sortKey, sortDir, searchQuery, filterPriority])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const selectStyle = {
    height: '28px', padding: '0 24px 0 8px', fontSize: '12px',
    color: BG.textSec, border: `1px solid ${BG.border}`, borderRadius: '4px',
    backgroundColor: BG.surface, cursor: 'pointer', outline: 'none', appearance: 'none' as const,
  }

  function ThSort({ label, k, right }: { label: string; k: SortKey; right?: boolean }) {
    const active = sortKey === k
    return (
      <th
        onClick={() => handleSort(k)}
        className="select-none cursor-pointer px-4 py-2 whitespace-nowrap"
        style={{
          fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
          color: active ? BG.textSec : BG.textTer, textAlign: right ? 'right' : 'left',
        }}
      >
        <span className={`inline-flex items-center gap-1 ${right ? 'justify-end w-full' : ''}`}>
          {label}
          {active
            ? sortDir === 'desc' ? <ArrowDown size={11} strokeWidth={2} /> : <ArrowUp size={11} strokeWidth={2} />
            : <ArrowUpDown size={11} strokeWidth={1.5} style={{ opacity: 0.3 }} />}
        </span>
      </th>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG.canvas }}>
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold leading-tight tracking-tight" style={{ fontSize: '20px', color: BG.text }}>
                Fila de Demandas Ativas
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Somente leitura
              </span>
            </div>
            <p className="font-mono mt-1" style={{ fontSize: '12px', color: BG.textTer }}>
              {activeDemands.length} demandas ativas visíveis · clique para ver detalhes
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-2.5 py-1.5 rounded transition-colors text-xs font-mono"
            style={{ border: `1px solid ${BG.border}`, color: BG.textSec, backgroundColor: BG.surface }}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-4">
          <input
            type="text"
            placeholder="Buscar por título, cliente ou ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-2.5 py-1 text-xs rounded outline-none"
            style={{
              backgroundColor: BG.surface, border: `1px solid ${BG.border}`,
              color: BG.text, width: '220px', height: '28px',
            }}
          />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | '')} style={selectStyle}>
            <option value="">Todas as prioridades</option>
            <option value="critico">Crítico</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
          {(searchQuery || filterPriority) && (
            <button
              onClick={() => { setSearchQuery(''); setFilterPriority('') }}
              className="flex items-center gap-1 transition-colors ml-1"
              style={{ fontSize: '12px', color: BG.textTer }}
              onMouseEnter={e => (e.currentTarget.style.color = BG.textSec)}
              onMouseLeave={e => (e.currentTarget.style.color = BG.textTer)}
            >
              <X size={12} strokeWidth={2} /> Limpar
            </button>
          )}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: BG.border }} />

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: BG.canvas }}>
            <tr style={{ borderBottom: `1px solid ${BG.border}` }}>
              <th className="px-3 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer, width: '80px' }}>ID</th>
              <th className="px-4 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Demanda</th>
              <ThSort label="Cliente" k="client" />
              <ThSort label="Reach" k="reach" right />
              <ThSort label="Impact" k="impact" right />
              <ThSort label="Confiança" k="confidence" right />
              <ThSort label="Score" k="score" right />
              <th className="px-4 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Prioridade</th>
              <th className="px-4 py-2 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {activeDemands.map((d, i) => {
              const isCrit = d.priority === 'critico'
              const p = PRIORITY[d.priority] || PRIORITY['medio']
              return (
                <tr
                  key={d.id}
                  onClick={() => onSelectDemand(d)}
                  className="row-enter cursor-pointer group"
                  style={{
                    height: '42px',
                    borderBottom: `1px solid ${BG.border}`,
                    borderLeft: isCrit ? `2px solid ${p.leftBorder}` : '2px solid transparent',
                    boxShadow: isCrit ? `inset 2px 0 8px -4px rgba(255,92,92,0.4)` : undefined,
                    animationDelay: `${i * 18}ms`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = BG.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-3">
                    <span className="font-mono" style={{ fontSize: '11px', color: BG.textTer }}>{d.id}</span>
                  </td>
                  <td className="px-4 max-w-xs">
                    <span className="truncate font-medium" style={{ fontSize: '13px', color: BG.text }}>{d.title}</span>
                  </td>
                  <td className="px-4 whitespace-nowrap">
                    <span style={{ fontSize: '12px', color: BG.textSec }}>{d.client}</span>
                  </td>
                  <td className="px-4 text-right">
                    <span className="font-mono tabular-nums" style={{ fontSize: '12px', color: BG.textSec }}>{d.reach.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-4 text-right">
                    <span className="font-mono tabular-nums" style={{ fontSize: '12px', color: BG.textSec }}>{d.impact}×</span>
                  </td>
                  <td className="px-4 text-right">
                    <span className="font-mono tabular-nums" style={{ fontSize: '12px', color: BG.textSec }}>{Math.round(d.confidence * 100)}%</span>
                  </td>
                  <td className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.text, boxShadow: `0 0 6px ${p.text}` }} />
                      <span className="font-mono tabular-nums font-bold" style={{ fontSize: '13px', color: BG.text }}>
                        {d.score.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4">
                    <PriorityBadge priority={d.priority} />
                  </td>
                  <td className="px-4">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && activeDemands.length === 0 ? (
          <div className="flex h-40 items-center justify-center font-mono text-xs" style={{ color: BG.textTer }}>
            Nenhuma demanda ativa no momento.
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Read-only Demand Detail for Collaborators ───────────────────────────────

function CollaboratorDemandDetail({
  demand,
  onBack,
}: {
  demand: Demand
  onBack: () => void
}) {
  const [audit, setAudit] = useState<DemandAudit | null>(null)

  useEffect(() => {
    let active = true
    api.getDemandAudit(demand.id)
      .then(result => { if (active) setAudit(result) })
      .catch(error => console.error('Falha ao carregar auditoria:', error))
    return () => { active = false }
  }, [demand.id])

  const calculatedScore = calcScore(demand.reach, demand.impact, demand.confidence)
  const calculatedPriority = determinePriority(calculatedScore)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: BG.canvas }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${BG.border}` }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 mb-3 text-xs transition-colors"
              style={{ color: BG.textTer }}
              onMouseEnter={e => (e.currentTarget.style.color = BG.textSec)}
              onMouseLeave={e => (e.currentTarget.style.color = BG.textTer)}
            >
              <ArrowUp size={12} strokeWidth={2} style={{ transform: 'rotate(-90deg)' }} />
              Voltar para a fila
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-stone-400">{demand.id}</span>
              <PriorityBadge priority={calculatedPriority} />
              <StatusBadge status={demand.status} />
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: BG.surface3, color: BG.textTer, border: `1px solid ${BG.border}` }}>Somente leitura</span>
            </div>
            <h1 className="font-semibold tracking-tight text-xl" style={{ color: BG.text }}>
              {demand.title}
            </h1>
          </div>

          <div className="text-right shrink-0">
            <p className="font-mono font-bold tabular-nums text-3xl leading-none" style={{ color: BG.text }}>
              {calculatedScore.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </p>
            <p className="font-mono text-xs text-stone-400 mt-1">
              {demand.reach.toLocaleString('pt-BR')} × {demand.impact}× × {Math.round(demand.confidence * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Body: Read-only view */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* RIC Metrics — read-only */}
        <div className="p-5 rounded-[6px]" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase font-bold tracking-wider text-stone-400">
              Métricas de Valor &amp; Certeza
            </p>
            <span className="text-[11px] font-mono text-stone-400">Reach × Impact × Confidence</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-[6px]" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">Reach (Alcance)</span>
                <span className="text-[10px] font-mono text-stone-400">fator absoluto</span>
              </div>
              <p className="font-mono text-2xl font-bold text-blue-400 mt-1">
                {demand.reach.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-stone-300 mt-1">usuários ou terminais afetados</p>
            </div>

            <div className="p-4 rounded-[6px]" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">Impact (Gravidade)</span>
                <span className="text-[10px] font-mono text-stone-400">multiplicador</span>
              </div>
              <p className="font-mono text-2xl font-bold text-blue-400 mt-1">
                {demand.impact}×
              </p>
              <p className="text-xs text-stone-300 mt-1">
                {demand.impact >= 3 ? 'Crítico / Parada Total' : demand.impact >= 2 ? 'Alto / Prejuízo Operacional' : demand.impact >= 1 ? 'Moderado / Rotina' : demand.impact >= 0.5 ? 'Baixo' : 'Mínimo / Cosmético'}
              </p>
            </div>

            <div className="p-4 rounded-[6px]" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">Confidence (Certeza)</span>
                <span className="text-[10px] font-mono text-stone-400">grau de evidência</span>
              </div>
              <p className="font-mono text-2xl font-bold text-blue-400 mt-1">
                {Math.round(demand.confidence * 100)}%
              </p>
              <p className="text-xs text-stone-300 mt-1">
                {demand.confidence >= 1 ? '100% - Comprovado por logs' : demand.confidence >= 0.8 ? '80% - Relato formal' : '50% - Percepção preliminar'}
              </p>
            </div>
          </div>
        </div>

        {/* General info */}
        <div className="p-5 rounded-[6px]" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
          <p className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-4">Informações Gerais</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Cliente / Setor</span>
              <p className="text-xs font-medium text-stone-200 mt-0.5">{demand.client}</p>
            </div>
            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Responsável</span>
              <p className="text-xs font-medium text-stone-200 mt-0.5">{demand.owner || 'Não atribuído'}</p>
            </div>
            <div className="p-3.5 rounded" style={{ backgroundColor: BG.surface2, border: `1px solid ${BG.border}` }}>
              <span className="block text-[10px] font-semibold text-stone-400 uppercase mb-1">Criado em</span>
              <p className="text-xs font-mono text-stone-300 mt-0.5">{demand.createdAt}</p>
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="grid grid-cols-2 gap-4">
          <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Relato original</p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-300">
              {demand.originalText || 'Relato original não disponível.'}
            </p>
          </section>
          <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Relatório estruturado</p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-300">
              {demand.description || 'Relatório ainda não disponível.'}
            </p>
          </section>
        </div>

        {audit?.evaluation ? (
          <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Justificativa da avaliação</p>
            <p className="text-xs leading-relaxed text-stone-300">{audit.evaluation.justification}</p>
            {audit.evaluation.inconsistencyAlerts.length ? (
              <div className="mt-3 space-y-2">
                {audit.evaluation.inconsistencyAlerts.map(alert => (
                  <p key={alert} className="flex items-start gap-2 rounded border border-[rgba(255,162,58,0.28)] bg-[rgba(255,162,58,0.10)] p-2.5 text-xs text-[#FFA23A]">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {alert}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[6px] p-5" style={{ backgroundColor: BG.surface, border: `1px solid ${BG.border}` }}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Histórico operacional</p>
          {audit?.history.length ? (
            <div className="space-y-3">
              {audit.history.map(entry => (
                <div key={entry.id} className="flex gap-3 border-l border-[#2E2E33] pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium capitalize text-stone-200">{entry.action.replaceAll('_', ' ')}</p>
                      <time className="shrink-0 font-mono text-[10px] text-stone-500">
                        {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-400">{entry.actorName}</p>
                    {entry.justification ? <p className="mt-1 text-xs text-stone-300">{entry.justification}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-stone-500">Nenhum evento registrado.</p>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── User Management Screen (Super Admin only) ──────────────────────────────

type UserProfile = {
  id: string
  display_name: string
  department: string
  role: 'colaborador' | 'administrador' | 'admin'
  created_at: string
}

function UserManagementScreen({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [toastError, setToastError] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json() as { users?: UserProfile[] }
      setUsers(data.users ?? [])
    } catch {
      setToastMsg('Falha ao carregar usuários.')
      setToastError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function handleToggleRole(user: UserProfile) {
    if (pendingId) return
    const newRole = user.role === 'administrador' ? 'colaborador' : 'administrador'
    setPendingId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Erro')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      setToastMsg(`${user.display_name} agora é ${newRole === 'administrador' ? 'Administrador' : 'Colaborador'}.`)
      setToastError(false)
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'Não foi possível alterar o papel.')
      setToastError(true)
    } finally {
      setPendingId(null)
      setTimeout(() => setToastMsg(''), 3000)
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter(u =>
      u.display_name.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  const ROLE_COLORS: Record<string, { text: string; bg: string; border: string; label: string }> = {
    admin:        { text: '#C084FC', bg: 'rgba(192,132,252,0.10)', border: 'rgba(192,132,252,0.28)', label: 'Super Admin' },
    administrador:{ text: '#4D7CFF', bg: 'rgba(77,124,255,0.10)', border: 'rgba(77,124,255,0.28)', label: 'Administrador' },
    colaborador:  { text: '#9B9BA3', bg: 'rgba(155,155,163,0.08)', border: 'rgba(155,155,163,0.20)', label: 'Colaborador' },
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG.canvas }}>
      <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${BG.border}` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold tracking-tight" style={{ fontSize: '20px', color: BG.text }}>Gestão de Usuários</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono border" style={{ backgroundColor: 'rgba(192,132,252,0.10)', color: '#C084FC', borderColor: 'rgba(192,132,252,0.28)' }}>
                Super Admin
              </span>
            </div>
            <p className="mt-1 font-mono" style={{ fontSize: '12px', color: BG.textTer }}>
              {users.length} usuários cadastrados · promova ou rebaixe colaboradores
            </p>
          </div>
          <button
            onClick={loadUsers}
            className="px-2.5 py-1.5 rounded transition-colors text-xs font-mono"
            style={{ border: `1px solid ${BG.border}`, color: BG.textSec, backgroundColor: BG.surface }}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Buscar por nome, setor ou papel..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-2.5 py-1 text-xs rounded outline-none"
            style={{
              backgroundColor: BG.surface, border: `1px solid ${BG.border}`,
              color: BG.text, width: '260px', height: '28px',
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: BG.canvas }}>
            <tr style={{ borderBottom: `1px solid ${BG.border}` }}>
              <th className="px-6 py-2.5 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Usuário</th>
              <th className="px-4 py-2.5 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Setor</th>
              <th className="px-4 py-2.5 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Papel atual</th>
              <th className="px-4 py-2.5 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Cadastrado em</th>
              <th className="px-6 py-2.5 text-right" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: BG.textTer }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isSelf = u.id === currentUserId
              const isSuperAdminUser = u.role === 'admin'
              const rc = ROLE_COLORS[u.role] || ROLE_COLORS['colaborador']
              const isPending = pendingId === u.id
              return (
                <tr
                  key={u.id}
                  className="group"
                  style={{ height: '52px', borderBottom: `1px solid ${BG.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = BG.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-6">
                    <div>
                      <p className="text-sm font-medium" style={{ color: BG.text }}>{u.display_name}</p>
                      {isSelf && <span className="text-[10px] font-mono" style={{ color: BG.textTer }}>Você</span>}
                    </div>
                  </td>
                  <td className="px-4">
                    <span className="text-xs" style={{ color: BG.textSec }}>{u.department}</span>
                  </td>
                  <td className="px-4">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{ color: rc.text, backgroundColor: rc.bg, border: `1px solid ${rc.border}` }}
                    >
                      {rc.label}
                    </span>
                  </td>
                  <td className="px-4">
                    <span className="font-mono text-xs" style={{ color: BG.textTer }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 text-right">
                    {isSelf || isSuperAdminUser ? (
                      <span className="text-[11px]" style={{ color: BG.textDis }}>—</span>
                    ) : (
                      <button
                        onClick={() => handleToggleRole(u)}
                        disabled={!!pendingId}
                        className="px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40"
                        style={{
                          backgroundColor: u.role === 'colaborador' ? BG.actionSoft : 'rgba(255,92,92,0.10)',
                          color: u.role === 'colaborador' ? BG.action : '#FF5C5C',
                          border: `1px solid ${u.role === 'colaborador' ? BG.actionBorder : 'rgba(255,92,92,0.28)'}`,
                        }}
                      >
                        {isPending ? 'Salvando...' : u.role === 'colaborador' ? '↑ Promover a Admin' : '↓ Rebaixar a Colaborador'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="flex h-40 items-center justify-center font-mono text-xs" style={{ color: BG.textTer }}>
            Nenhum usuário encontrado.
          </div>
        )}
      </div>

      {toastMsg && (
        <div
          className="fixed bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded shadow-lg text-xs font-medium z-50"
          style={{
            backgroundColor: BG.surface,
            border: `1px solid ${toastError ? 'rgba(255,92,92,0.4)' : 'rgba(61,220,151,0.4)'}`,
            color: toastError ? '#FF5C5C' : '#3DDC97',
          }}
        >
          <Check size={13} /> {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App({ viewer }: { viewer: Viewer }) {
  const isAdmin = viewer.role === 'administrador' || viewer.role === 'admin'
  const isSuperAdmin = viewer.role === 'admin'
  const [screen, setScreen] = useState<Screen>(isAdmin ? 'queue' : 'new')
  const [demands, setDemands] = useState<Demand[]>([])
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null)
  const [collaboratorSelected, setCollaboratorSelected] = useState<Demand | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const demandsRes = await api.getDemands()
      setDemands(demandsRes.demands)
      if (demandsRes.demands.length > 0) {
        setSelectedDemand(prev => {
          if (!prev) return demandsRes.demands[0]
          const updated = demandsRes.demands.find(d => d.id === prev.id)
          return updated || demandsRes.demands[0]
        })
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleSelectDemand(d: Demand) {
    if (!isAdmin) return
    setSelectedDemand(d)
    setScreen('detail')
  }

  function handleCollaboratorSelectDemand(d: Demand) {
    setCollaboratorSelected(d)
    setScreen('demand_detail')
  }

  function handleDemandCreated(d: Demand) {
    setSelectedDemand(d)
    loadData()
    setScreen('queue')
  }

  return (
    <div className="flex h-full" style={{ backgroundColor: BG.canvas }}>
      <Sidebar screen={screen} onNavigate={setScreen} viewer={viewer} />
      <main className="flex-1 overflow-hidden" style={{ backgroundColor: BG.canvas }}>
        {screen === 'queue' && (
          <QueueScreen
            demands={demands}
            loading={loading}
            onRefresh={loadData}
            onSelectDemand={handleSelectDemand}
            onNewDemand={() => setScreen('new')}
            isAdmin={isAdmin}
          />
        )}
        {screen === 'new' && (
          <NewDemandScreen onDemandCreated={handleDemandCreated} />
        )}
        {isAdmin && screen === 'detail' && selectedDemand && (
          <DetailScreen
            demand={selectedDemand}
            onDemandUpdated={loadData}
            onNavigateReview={() => setScreen('review')}
          />
        )}
        {isAdmin && screen === 'review' && (
          <ReviewScreen
            demands={demands}
            initialSelectedId={selectedDemand?.id}
            onDemandUpdated={loadData}
          />
        )}
        {!isAdmin && screen === 'fila' && (
          <ActiveQueueScreen
            demands={demands}
            loading={loading}
            onRefresh={loadData}
            onSelectDemand={handleCollaboratorSelectDemand}
          />
        )}
        {!isAdmin && screen === 'demand_detail' && collaboratorSelected && (
          <CollaboratorDemandDetail
            demand={collaboratorSelected}
            onBack={() => setScreen('fila')}
          />
        )}
        {isSuperAdmin && screen === 'users' && (
          <UserManagementScreen />
        )}
      </main>
    </div>
  )
}
