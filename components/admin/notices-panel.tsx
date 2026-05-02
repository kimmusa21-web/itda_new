'use client'

import { useState } from 'react'
import { Pin, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { createNotice, deleteNotice, togglePinNotice } from '@/lib/actions/notices'
import type { Notice } from '@/lib/actions/notices'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days < 7)   return `${days}일 전`
  if (days < 30)  return `${Math.floor(days / 7)}주 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

interface Props {
  initialNotices: Notice[]
}

export default function NoticesPanel({ initialNotices }: Props) {
  const [notices,    setNotices]   = useState(initialNotices)
  const [showForm,   setShowForm]  = useState(false)
  const [expanded,   setExpanded]  = useState<number | null>(null)
  const [title,      setTitle]     = useState('')
  const [content,    setContent]   = useState('')
  const [isPinned,   setIsPinned]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    const result = await createNotice({ title, content, isPinned })
    setSubmitting(false)
    if (result.success) {
      // optimistic: prepend new notice with temp id
      const now = new Date().toISOString()
      const newNotice: Notice = {
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
        created_at: now,
        updated_at: now,
      }
      setNotices(prev => isPinned ? [newNotice, ...prev] : [newNotice, ...prev.filter(n => !n.is_pinned), ...prev.filter(n => n.is_pinned)])
      setTitle(''); setContent(''); setIsPinned(false); setShowForm(false)
    }
  }

  function handleDelete(id: number) {
    setNotices(prev => prev.filter(n => n.id !== id))
    void deleteNotice(id)
  }

  function handleTogglePin(n: Notice) {
    setNotices(prev =>
      prev.map(x => x.id === n.id ? { ...x, is_pinned: !x.is_pinned } : x)
        .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    )
    void togglePinNotice(n.id, !n.is_pinned)
  }

  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">공지사항</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus size={13} />
          공지 등록
        </button>
      </div>

      {/* 작성 폼 */}
      {showForm && (
        <div className="card p-4 mb-3 border-blue-100 bg-blue-50/30">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-700">새 공지 작성</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
            <input
              className="input text-sm"
              placeholder="제목"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <textarea
              className="input text-sm min-h-[80px] resize-none"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-xs text-slate-600">상단 고정</span>
              </label>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {notices.length === 0 && !showForm ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-400">등록된 공지사항이 없습니다</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            첫 번째 공지 등록하기 →
          </button>
        </div>
      ) : notices.length > 0 ? (
        <div className="card overflow-hidden divide-y divide-slate-50">
          {notices.map(n => (
            <div key={n.id}>
              <button
                className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(prev => prev === n.id ? null : n.id)}
              >
                {n.is_pinned && (
                  <Pin size={12} className="text-blue-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${n.is_pinned ? 'text-blue-700' : 'text-slate-800'}`}>
                      {n.title}
                    </p>
                    {n.is_pinned && (
                      <span className="flex-shrink-0 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">고정</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {expanded === n.id
                  ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  : <ChevronDown size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                }
              </button>

              {expanded === n.id && (
                <div className="px-5 pb-4 bg-slate-50/50">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">
                    {n.content}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePin(n)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                        n.is_pinned
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <Pin size={11} />
                      {n.is_pinned ? '고정 해제' : '상단 고정'}
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={11} />
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
