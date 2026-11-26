import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MonthRecord, Settings } from './lib/types'
import * as db from './lib/storage'
import { computeMonth, diffUnits, effectiveSettings, previousMonth, validate, type MonthResult, type UnitDiff } from './lib/compute'
import { defaultSettings } from './lib/defaults'
import type { Issue } from './lib/types'
import { cx } from './components/ui'
import Home from './pages/Home'
import Erp from './pages/Erp'
import Summary from './pages/Summary'
import Excluded from './pages/Excluded'
import Checks from './pages/Checks'
import SettingsPage from './pages/SettingsPage'
import Help from './pages/Help'

export type Page = 'home' | 'erp' | 'summary' | 'excluded' | 'checks' | 'settings' | 'help'

export interface Ctx {
  settings: Settings
  setSettings: (s: Settings) => Promise<void>
  months: string[]
  current: MonthRecord | null
  prev: MonthRecord | null
  eff: Settings // 이번 달에 적용되는 규칙
  res: MonthResult | null
  prevRes: MonthResult | null
  diff: Map<string, UnitDiff>
  issues: Issue[]
  openMonth: (m: string | null) => Promise<void>
  saveRecord: (r: MonthRecord) => Promise<void>
  removeMonth: (m: string) => Promise<void>
  reload: () => Promise<void>
  toast: (msg: string) => void
  go: (p: Page) => void
}

const NAV: { id: Page; icon: string; label: string; needMonth?: boolean }[] = [
  { id: 'home', icon: '🏠', label: '마감월 · 파일 올리기' },
  { id: 'erp', icon: '📋', label: 'ERP 등록 목록', needMonth: true },
  { id: 'checks', icon: '🔍', label: '검증', needMonth: true },
  { id: 'summary', icon: '📊', label: '집계표', needMonth: true },
  { id: 'excluded', icon: '🚫', label: '제외 목록', needMonth: true },
  { id: 'settings', icon: '⚙️', label: '설정 (규칙)' },
  { id: 'help', icon: '❓', label: '사용 방법' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [settings, setSettingsState] = useState<Settings>(defaultSettings())
  const [months, setMonths] = useState<string[]>([])
  const [current, setCurrent] = useState<MonthRecord | null>(null)
  const [prev, setPrev] = useState<MonthRecord | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout((toast as unknown as { t?: number }).t)
    ;(toast as unknown as { t?: number }).t = window.setTimeout(() => setToastMsg(null), 2500)
  }, [])

  const loadPrev = async (month: string, list: string[]) => {
    const pm = previousMonth(list, month)
    setPrev(pm ? ((await db.loadMonth(pm)) ?? null) : null)
  }

  const openMonth = useCallback(async (m: string | null) => {
    if (!m) {
      setCurrent(null)
      setPrev(null)
      return
    }
    const list = await db.listMonths()
    setMonths(list)
    const rec = (await db.loadMonth(m)) ?? null
    setCurrent(rec)
    if (rec) await loadPrev(m, list)
    try {
      localStorage.setItem('cost-close:lastMonth', m)
    } catch {
      /* 무시 */
    }
  }, [])

  const reload = useCallback(async () => {
    const list = await db.listMonths()
    setMonths(list)
    setSettingsState(await db.loadSettings())
    if (current && list.includes(current.month)) await openMonth(current.month)
    else await openMonth(list.length ? list[list.length - 1] : null)
  }, [current, openMonth])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await db.loadSettings()
        setSettingsState(s)
        const list = await db.listMonths()
        setMonths(list)
        let last: string | null = null
        try {
          last = localStorage.getItem('cost-close:lastMonth')
        } catch {
          last = null
        }
        const pick = last && list.includes(last) ? last : list[list.length - 1]
        if (pick) await openMonth(pick)
      } catch (e) {
        setDbError(String(e))
      }
      setReady(true)
    })()
  }, [openMonth])

  const setSettings = useCallback(async (s: Settings) => {
    setSettingsState(s)
    await db.saveSettings(s)
  }, [])

  const saveRecord = useCallback(
    async (r: MonthRecord) => {
      await db.saveMonth(r)
      const list = await db.listMonths()
      setMonths(list)
      setCurrent(r)
      await loadPrev(r.month, list)
    },
    [],
  )

  const removeMonth = useCallback(
    async (m: string) => {
      await db.deleteMonth(m)
      const list = await db.listMonths()
      setMonths(list)
      if (current?.month === m) await openMonth(list.length ? list[list.length - 1] : null)
      else if (current) await loadPrev(current.month, list)
    },
    [current, openMonth],
  )

  const eff = current ? effectiveSettings(current, settings) : settings
  const res = useMemo(() => (current ? computeMonth(current, eff) : null), [current, eff])
  const prevRes = useMemo(() => (prev ? computeMonth(prev, effectiveSettings(prev, settings)) : null), [prev, settings])
  const diff = useMemo(() => (res ? diffUnits(res, prevRes) : new Map<string, UnitDiff>()), [res, prevRes])
  const issues = useMemo(
    () => (current && res ? validate(current, res, eff, prev && prevRes ? { month: prev.month, res: prevRes } : null) : []),
    [current, res, eff, prev, prevRes],
  )

  const go = (p: Page) => {
    setPage(p)
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }

  const ctx: Ctx = { settings, setSettings, months, current, prev, eff, res, prevRes, diff, issues, openMonth, saveRecord, removeMonth, reload, toast, go }
  const errCount = issues.filter((i) => i.level === 'error').length
  const warnCount = issues.filter((i) => i.level === 'warn').length

  if (!ready) return <div className="p-10 text-ink-soft">불러오는 중…</div>

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3 text-sm">
      <div className="mb-3 flex items-center gap-2 px-2 py-1 font-semibold">
        <span className="text-lg">📊</span> 공수 마감 도우미
      </div>
      <label className="px-2 text-xs text-ink-faint">작업 중인 마감월</label>
      <select
        className="mx-1 mb-3 rounded-md border border-line bg-white px-2 py-1.5"
        value={current?.month ?? ''}
        onChange={(e) => openMonth(e.target.value || null)}
      >
        {months.length === 0 && <option value="">(아직 없음)</option>}
        {[...months].reverse().map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {NAV.map((n) => {
        const disabled = n.needMonth && !current
        return (
          <button
            key={n.id}
            disabled={disabled}
            onClick={() => go(n.id)}
            className={cx(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left',
              page === n.id ? 'bg-hover font-medium' : 'hover:bg-hover text-ink-soft',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            <span>{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {n.id === 'checks' && current && (errCount > 0 || warnCount > 0) && (
              <span className={cx('rounded px-1.5 text-xs', errCount ? 'bg-[#ffe2dd] text-[#5d1715]' : 'bg-[#fadec9] text-[#49290e]')}>
                {errCount || warnCount}
              </span>
            )}
          </button>
        )
      })}
      <div className="mt-auto px-2 pt-4 text-xs leading-relaxed text-ink-faint">
        🔒 데이터는 이 PC의 이 브라우저 안에만 저장됩니다. 외부로 전송하지 않습니다.
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen md:flex">
      {/* PC: 왼쪽 메뉴 */}
      <aside className="hidden md:block w-60 shrink-0 border-r border-line bg-side">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>
      {/* 휴대폰: 위쪽 바 */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-side px-4 py-2">
        <span className="font-semibold">📊 공수 마감 도우미</span>
        <button className="rounded-md border border-line bg-white px-2 py-1 text-sm" onClick={() => setMenuOpen(!menuOpen)}>
          ☰ 메뉴
        </button>
      </header>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMenuOpen(false)}>
          <div className="h-full w-72 bg-side" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 md:px-12 md:py-10">
        <div className="mx-auto max-w-6xl">
          {dbError && (
            <div className="mb-4 rounded-md bg-[#fdebec] p-3 text-sm">
              ⚠️ 브라우저 저장소(IndexedDB)를 열 수 없습니다. 시크릿 창이거나 브라우저 설정에서 저장이 막혀 있을 수 있습니다. ({dbError})
            </div>
          )}
          {page === 'home' && <Home ctx={ctx} />}
          {page === 'erp' && current && <Erp ctx={ctx} />}
          {page === 'checks' && current && <Checks ctx={ctx} />}
          {page === 'summary' && current && <Summary ctx={ctx} />}
          {page === 'excluded' && current && <Excluded ctx={ctx} />}
          {page === 'settings' && <SettingsPage ctx={ctx} />}
          {page === 'help' && <Help />}
          {!current && NAV.find((n) => n.id === page)?.needMonth && <Home ctx={ctx} />}
        </div>
      </main>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-[#37352f] px-4 py-2 text-sm text-white shadow-lg">{toastMsg}</div>
      )}
    </div>
  )
}
