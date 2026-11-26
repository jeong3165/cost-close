import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react'

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }
export function Button({ variant = 'default', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1 rounded-md whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        variant === 'primary' && 'bg-[#2383e2] text-white hover:bg-[#1a6fc4]',
        variant === 'default' && 'border border-line bg-white hover:bg-hover',
        variant === 'ghost' && 'hover:bg-hover text-ink-soft',
        variant === 'danger' && 'border border-red-200 text-red-600 bg-white hover:bg-red-50',
        className,
      )}
    />
  )
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple' }) {
  const tones = {
    gray: 'bg-[#e3e2e0] text-[#32302c]',
    blue: 'bg-[#d3e5ef] text-[#183347]',
    green: 'bg-[#dbeddb] text-[#1c3829]',
    red: 'bg-[#ffe2dd] text-[#5d1715]',
    orange: 'bg-[#fadec9] text-[#49290e]',
    purple: 'bg-[#e8deee] text-[#412454]',
  }
  return <span className={cx('inline-flex items-center rounded px-1.5 py-0.5 text-xs whitespace-nowrap', tones[tone])}>{children}</span>
}

export function PageTitle({ icon, title, sub, right }: { icon: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-4xl mb-2">{icon}</div>
        <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        {sub && <div className="mt-1 text-sm text-ink-soft">{sub}</div>}
      </div>
      {right && <div className="flex flex-wrap gap-2">{right}</div>}
    </div>
  )
}

export function Section({ title, desc, children, right }: { title: string; desc?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {desc && <p className="mb-3 text-sm text-ink-soft">{desc}</p>}
      {children}
    </section>
  )
}

export function Callout({ icon = '💡', children, tone = 'gray' }: { icon?: string; children: ReactNode; tone?: 'gray' | 'yellow' | 'red' | 'blue' }) {
  const bg = { gray: 'bg-[#f1f1ef]', yellow: 'bg-[#fbf3db]', red: 'bg-[#fdebec]', blue: 'bg-[#e7f3f8]' }[tone]
  return (
    <div className={cx('flex gap-3 rounded-md p-3 text-sm leading-relaxed', bg)}>
      <span className="text-base">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-40 overflow-hidden rounded-full bg-[#e9e9e7]">
        <div className={cx('h-full rounded-full', pct === 100 ? 'bg-[#4dab9a]' : 'bg-[#2383e2]')} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm tabular text-ink-soft">
        {value}/{max} ({pct}%)
      </span>
    </div>
  )
}

/** 짧은 글자 목록 편집 (칩 + 입력) */
export function ChipEditor({ values, onChange, placeholder, disabled }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string; disabled?: boolean }) {
  const [text, setText] = useState('')
  const add = () => {
    const items = text.split(/[\n,]/).map((x) => x.trim()).filter(Boolean)
    const next = [...values]
    for (const it of items) if (!next.includes(it)) next.push(it)
    onChange(next)
    setText('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line p-2">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded bg-[#e3e2e0] px-2 py-0.5 text-sm">
          {v}
          {!disabled && (
            <button className="text-ink-faint hover:text-ink" onClick={() => onChange(values.filter((x) => x !== v))} title="삭제">
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          className="min-w-[10rem] flex-1 px-1 py-0.5 text-sm outline-none"
          value={text}
          placeholder={placeholder ?? '입력 후 Enter'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          onBlur={() => text.trim() && add()}
        />
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line p-8 text-center text-sm text-ink-soft">{children}</div>
}

export const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
