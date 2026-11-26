import { useState } from 'react'
import type { Ctx } from '../App'
import { keyOf, round2 } from '../lib/compute'
import { exportSummary } from '../lib/export'
import { Button, PageTitle, cx, fmt } from '../components/ui'

export default function Summary({ ctx }: { ctx: Ctx }) {
  const { current, res, eff } = ctx
  const [q, setQ] = useState('')
  const [showGroups, setShowGroups] = useState(true)
  const [hideZeroCols, setHideZeroCols] = useState(false)
  if (!current || !res) return null
  const groups = showGroups ? res.units.filter((u) => u.kind === 'group') : []
  const deptTotals = Object.fromEntries(res.depts.map((d) => [d, round2(res.included.reduce((a, r) => a + (r.mh[d] ?? 0), 0))]))
  const depts = hideZeroCols ? res.depts.filter((d) => deptTotals[d] > 0) : res.depts
  const rows = res.included.filter((r) => !q.trim() || r.no.includes(q.trim()) || r.name.includes(q.trim()))
  const cell = (v: number) => (v ? fmt(round2(v)) : <span className="text-[#d3d3d0]">·</span>)
  const grand = round2(res.depts.reduce((a, d) => a + deptTotals[d], 0))

  return (
    <div>
      <PageTitle
        icon="📊"
        title={`집계표 · ${current.month}`}
        sub={`제외 규칙 적용 후 프로젝트 ${rows.length}개 × 부서 ${depts.length}개${groups.length ? ` + 묶음 ${groups.length}개` : ''} · 전체 ${fmt(grand)} MH`}
        right={<Button onClick={() => exportSummary(current, eff)}>⬇️ 집계표 엑셀</Button>}
      />
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <input className="w-56 rounded-md border border-line px-2 py-1.5" placeholder="🔎 프로젝트명·번호 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showGroups} onChange={(e) => setShowGroups(e.target.checked)} /> 묶음 열 보기
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hideZeroCols} onChange={(e) => setHideZeroCols(e.target.checked)} /> MH 0 부서 열 숨기기
        </label>
      </div>
      <div className="max-h-[75vh] overflow-auto rounded-lg border border-line">
        <table className="text-sm tabular">
          <thead className="sticky top-0 z-10 bg-[#f7f7f5]">
            <tr className="text-left text-xs text-ink-soft">
              <th className="sticky left-0 z-20 min-w-[13rem] bg-[#f7f7f5] px-2 py-2 font-medium">프로젝트번호 / 명</th>
              {depts.map((d) => (
                <th key={d} className="px-2 py-2 text-right font-medium whitespace-nowrap">{d}</th>
              ))}
              <th className="px-2 py-2 text-right font-semibold">합계</th>
              {groups.map((g) => (
                <th key={g.name} className="bg-[#efe9f3] px-2 py-2 text-right font-medium whitespace-nowrap">[묶음] {g.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const sum = res.depts.reduce((a, d) => a + (r.mh[d] ?? 0), 0)
              return (
                <tr key={i} className="border-t border-line hover:bg-[#fafaf9]">
                  <td className="sticky left-0 bg-white px-2 py-1">
                    <div className="font-mono text-[13px]">{keyOf(r.no)}</div>
                    <div className="max-w-[16rem] truncate text-xs text-ink-faint" title={r.name}>{r.name}</div>
                  </td>
                  {depts.map((d) => (
                    <td key={d} className="px-2 py-1 text-right">{cell(r.mh[d] ?? 0)}</td>
                  ))}
                  <td className="px-2 py-1 text-right font-medium">{cell(sum)}</td>
                  {groups.map((g) => (
                    <td key={g.name} className="bg-[#faf7fc] px-2 py-1 text-right">{cell(g.members.reduce((a, d) => a + (r.mh[d] ?? 0), 0))}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-[#f7f7f5] font-semibold">
            <tr className={cx('border-t-2 border-line')}>
              <td className="sticky left-0 bg-[#f7f7f5] px-2 py-2">합계 (제외 후)</td>
              {depts.map((d) => (
                <td key={d} className="px-2 py-2 text-right">{fmt(deptTotals[d])}</td>
              ))}
              <td className="px-2 py-2 text-right">{fmt(grand)}</td>
              {groups.map((g) => (
                <td key={g.name} className="bg-[#efe9f3] px-2 py-2 text-right">{fmt(g.totalMh)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
