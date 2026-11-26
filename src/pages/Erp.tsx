import { useState } from 'react'
import type { Ctx } from '../App'
import type { UnitResult } from '../lib/types'
import type { UnitDiff } from '../lib/compute'
import { copyText } from '../lib/download'
import { exportRegistration } from '../lib/export'
import { Badge, Button, Callout, Empty, PageTitle, Progress, cx, fmt } from '../components/ui'

type View = 'unit' | 'pool'

export default function Erp({ ctx }: { ctx: Ctx }) {
  const { current, res, diff, prev, eff } = ctx
  const [view, setView] = useState<View>(() => (eff.pools.length ? 'pool' : 'unit'))
  const [hideEmpty, setHideEmpty] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  if (!current || !res) return null
  const locked = current.locked

  const setCheck = async (key: string, v: boolean) => {
    await ctx.saveRecord({ ...current, checks: { ...current.checks, [key]: v } })
  }
  const copy = async (nos: string[], label: string) => {
    if (!nos.length) return ctx.toast('복사할 번호가 없습니다.')
    const ok = await copyText(nos.join('\n'))
    ctx.toast(ok ? `${label} ${nos.length}개 번호를 복사했습니다. ERP에 붙여넣기(Ctrl+V) 하세요.` : '복사에 실패했습니다. 목록을 직접 선택해 복사해 주세요.')
  }

  const match = (u: UnitResult) => !q.trim() || u.name.includes(q.trim()) || u.projects.some((p) => p.no.includes(q.trim()) || p.name.includes(q.trim()))
  const visible = (u: UnitResult) => (!hideEmpty || u.projects.length > 0) && match(u)

  // 진행률 계산용 항목
  const items =
    view === 'unit'
      ? res.units.filter((u) => u.projects.length > 0).map((u) => `u|${u.name}`)
      : eff.pools.flatMap((p) => p.units.filter((un) => (res.unitMap.get(un)?.projects.length ?? 0) > 0).map((un) => `p|${p.id}|${un}`))
  const doneCount = items.filter((k) => current.checks[k]).length

  const totalAdded = [...diff.values()].reduce((a, d) => a + d.added.length, 0)
  const totalRemoved = [...diff.values()].reduce((a, d) => a + d.removed.length, 0)

  const card = (u: UnitResult, key: string) => (
    <UnitCard
      key={key}
      u={u}
      d={diff.get(u.name)}
      hasPrev={!!prev}
      checked={!!current.checks[key]}
      locked={locked}
      open={!!open[key]}
      onToggle={() => setOpen({ ...open, [key]: !open[key] })}
      onCheck={(v) => setCheck(key, v)}
      onCopy={copy}
    />
  )

  return (
    <div>
      <PageTitle
        icon="📋"
        title={`ERP 등록 목록 · ${current.month}`}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            {locked ? <Badge tone="green">🔒 확정됨 (체크 변경 불가)</Badge> : <Badge>작업 중</Badge>}
            <span>
              포함 프로젝트 {fmt(res.included.length)}개 · 제외 {fmt(res.excluded.length)}개
            </span>
            {prev && <span>· 비교 기준: {prev.month}</span>}
          </span>
        }
        right={
          <Button onClick={() => exportRegistration(current, eff)}>⬇️ 등록 목록 엑셀</Button>
        }
      />

      {res.unknownDepts.length > 0 && (
        <div className="mb-4">
          <Callout icon="🆕" tone="yellow">
            처음 보는 부서가 있습니다: <b>{res.unknownDepts.join(', ')}</b> — 어떤 묶음에도 없습니다.{' '}
            <button className="underline" onClick={() => ctx.go('settings')}>
              설정에서 정리하기
            </button>
          </Callout>
        </div>
      )}
      {ctx.issues.some((i) => i.level === 'error') && (
        <div className="mb-4">
          <Callout icon="⛔" tone="red">
            검증 오류가 {ctx.issues.filter((i) => i.level === 'error').length}건 있습니다. 등록 전에{' '}
            <button className="underline" onClick={() => ctx.go('checks')}>
              검증 화면
            </button>
            을 확인하세요.
          </Callout>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-line p-3">
        <div>
          <div className="mb-1 text-xs text-ink-faint">등록 진행률</div>
          <Progress value={doneCount} max={items.length} />
        </div>
        {prev && (
          <div className="text-sm">
            <div className="mb-1 text-xs text-ink-faint">지난달({prev.month}) 대비</div>
            <span className="text-[#0f7b6c]">새 번호 {totalAdded}</span> · <span className="text-[#e03e3e]">빠진 번호 {totalRemoved}</span>
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-line text-sm">
            <button className={cx('px-3 py-1.5', view === 'unit' ? 'bg-[#37352f] text-white' : 'hover:bg-hover')} onClick={() => setView('unit')}>
              부서·묶음별
            </button>
            <button className={cx('px-3 py-1.5', view === 'pool' ? 'bg-[#37352f] text-white' : 'hover:bg-hover')} onClick={() => setView('pool')}>
              원가풀별
            </button>
          </div>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> MH 없는 부서 숨기기
          </label>
          <input className="w-40 rounded-md border border-line px-2 py-1.5 text-sm" placeholder="🔎 부서·번호 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => setOpen({})}>
            모두 접기
          </Button>
        </div>
      </div>

      {view === 'unit' && (
        <>
          <GroupTitle>부서</GroupTitle>
          <div className="space-y-2">{res.units.filter((u) => u.kind === 'dept' && visible(u)).map((u) => card(u, `u|${u.name}`))}</div>
          <GroupTitle>묶음 (가상 부서)</GroupTitle>
          <div className="space-y-2">
            {res.units.filter((u) => u.kind === 'group' && visible(u)).map((u) => card(u, `u|${u.name}`))}
            {res.emptyGroups.length > 0 && (
              <p className="text-sm text-ink-faint">구성 부서가 비어 있는 묶음: {res.emptyGroups.join(', ')} (설정에서 지정)</p>
            )}
          </div>
        </>
      )}

      {view === 'pool' &&
        (eff.pools.length === 0 ? (
          <Empty>
            원가풀 구조가 아직 없습니다.{' '}
            <button className="underline" onClick={() => ctx.go('settings')}>
              설정 → 원가풀
            </button>
            에서 원가풀과 하위 부서를 등록하면 ERP 화면 순서대로 볼 수 있습니다.
          </Empty>
        ) : (
          eff.pools.map((pool) => {
            const keys = pool.units.map((un) => `p|${pool.id}|${un}`)
            const active = pool.units.filter((un) => (res.unitMap.get(un)?.projects.length ?? 0) > 0)
            const done = active.filter((un) => current.checks[`p|${pool.id}|${un}`]).length
            return (
              <div key={pool.id} className="mb-6">
                <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-line pb-1">
                  <h3 className="text-lg font-semibold">🗂️ {pool.name}</h3>
                  <span className="text-sm text-ink-soft tabular">
                    등록 {done}/{active.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pool.units.map((un, i) => {
                    const u = res.unitMap.get(un)
                    if (!u)
                      return (
                        <div key={keys[i]} className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-faint">
                          {un} — 이번 달 엑셀에 없는 부서/묶음입니다.
                        </div>
                      )
                    if (!visible(u)) return null
                    return card(u, keys[i])
                  })}
                </div>
              </div>
            )
          })
        ))}
    </div>
  )
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-sm font-medium text-ink-faint">{children}</h3>
}

function UnitCard(props: {
  u: UnitResult
  d?: UnitDiff
  hasPrev: boolean
  checked: boolean
  locked: boolean
  open: boolean
  onToggle: () => void
  onCheck: (v: boolean) => void
  onCopy: (nos: string[], label: string) => void
}) {
  const { u, d, hasPrev, checked, locked, open, onToggle, onCheck, onCopy } = props
  const added = new Set(d?.added ?? [])
  const empty = u.projects.length === 0
  return (
    <div className={cx('rounded-lg border', checked ? 'border-[#b7dbc9] bg-[#f4faf6]' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <label className={cx('flex items-center gap-2', (locked || empty) && 'opacity-60')} title="ERP에 등록을 마쳤으면 체크">
          <input type="checkbox" className="h-4 w-4" checked={checked} disabled={locked || empty} onChange={(e) => onCheck(e.target.checked)} />
        </label>
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onToggle}>
          <span className="text-ink-faint">{open ? '▾' : '▸'}</span>
          <span className={cx('font-medium', checked && 'line-through decoration-[#4dab9a]')}>{u.name}</span>
          {u.kind === 'group' && <Badge tone="purple">묶음: {u.members.join(' + ')}</Badge>}
          <span className="text-sm text-ink-soft tabular">
            {u.projects.length}건 · {fmt(u.totalMh)} MH
          </span>
          {hasPrev && d && !d.isNewUnit && d.added.length > 0 && <Badge tone="green">새 번호 {d.added.length}</Badge>}
          {hasPrev && d && !d.isNewUnit && d.removed.length > 0 && <Badge tone="red">빠진 번호 {d.removed.length}</Badge>}
          {hasPrev && d?.isNewUnit && !empty && <Badge tone="orange">지난달 없던 부서</Badge>}
        </button>
        <div className="flex gap-1">
          <Button size="sm" onClick={() => onCopy(u.projects.map((p) => p.no), u.name)} disabled={empty}>
            📋 번호 복사
          </Button>
          {hasPrev && d && d.added.length > 0 && !d.isNewUnit && (
            <Button size="sm" onClick={() => onCopy(d.added, `${u.name} 새`)}>
              새 번호만
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-line px-3 py-2">
          {empty ? (
            <p className="text-sm text-ink-faint">이번 달 MH가 있는 프로젝트가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-faint">
                    <th className="py-1 pr-3 font-normal">프로젝트번호</th>
                    <th className="py-1 pr-3 font-normal">프로젝트명</th>
                    <th className="py-1 font-normal text-right">MH</th>
                  </tr>
                </thead>
                <tbody>
                  {u.projects.map((p) => (
                    <tr key={p.no} className="border-t border-[#f1f1ef]">
                      <td className="py-1 pr-3 font-mono text-[13px] select-all">
                        {p.no} {hasPrev && !d?.isNewUnit && added.has(p.no) && <Badge tone="green">신규</Badge>}
                      </td>
                      <td className="py-1 pr-3 text-ink-soft">{p.name}</td>
                      <td className="py-1 text-right tabular">{fmt(p.mh)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasPrev && d && d.removed.length > 0 && (
            <div className="mt-3 rounded-md bg-[#fdebec] p-2">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>🗑️ 지난달엔 있었는데 이번 달엔 MH가 없는 번호 (ERP에서 삭제 검토)</span>
                <Button size="sm" onClick={() => onCopy(d.removed, `${u.name} 빠진`)}>
                  복사
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {d.removed.map((no) => (
                  <span key={no} className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-[#e03e3e] line-through">
                    {no}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
