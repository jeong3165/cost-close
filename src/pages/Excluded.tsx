import type { Ctx } from '../App'
import { keyOf, round2 } from '../lib/compute'
import { exportExcluded } from '../lib/export'
import { Badge, Button, Empty, PageTitle, Section, fmt } from '../components/ui'

export default function Excluded({ ctx }: { ctx: Ctx }) {
  const { current, res, eff } = ctx
  if (!current || !res) return null
  const total = round2(res.excluded.reduce((a, e) => a + e.totalMh, 0))
  const byReason = new Map<string, { n: number; mh: number }>()
  for (const e of res.excluded) {
    const x = byReason.get(e.reason) ?? { n: 0, mh: 0 }
    x.n++
    x.mh += e.totalMh
    byReason.set(e.reason, x)
  }
  const deptMh = res.depts
    .map((d) => ({ d, mh: round2(res.excluded.reduce((a, e) => a + (e.row.mh[d] ?? 0), 0)) }))
    .filter((x) => x.mh > 0)

  return (
    <div>
      <PageTitle
        icon="🚫"
        title={`제외 목록 · ${current.month}`}
        sub={`제외 규칙에 걸려 집계에서 빠진 프로젝트 ${res.excluded.length}개 · ${fmt(total)} MH`}
        right={<Button onClick={() => exportExcluded(current, eff)}>⬇️ 제외 목록 엑셀</Button>}
      />
      {res.excluded.length === 0 ? (
        <Empty>제외된 프로젝트가 없습니다.</Empty>
      ) : (
        <>
          <Section title="요약">
            <div className="flex flex-wrap gap-2">
              {[...byReason].map(([r, x]) => (
                <div key={r} className="rounded-md bg-[#f7f7f5] px-3 py-2 text-sm">
                  <div className="text-xs text-ink-faint">{r}</div>
                  <div className="tabular">{x.n}개 · {fmt(round2(x.mh))} MH</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1 text-sm">
              <span className="text-ink-soft">부서별 제외 MH:</span>
              {deptMh.map((x) => (
                <Badge key={x.d}>{x.d} {fmt(x.mh)}</Badge>
              ))}
            </div>
          </Section>
          <Section title="목록" desc="제외하면 안 되는 프로젝트가 있다면 설정 → '예외로 포함할 번호'에 추가하세요.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="py-2 pr-3 font-normal">프로젝트번호</th>
                    <th className="py-2 pr-3 font-normal">프로젝트명</th>
                    <th className="py-2 pr-3 font-normal">제외 이유</th>
                    <th className="py-2 pr-3 font-normal text-right">MH 합계</th>
                    <th className="py-2 font-normal">MH 있는 부서</th>
                  </tr>
                </thead>
                <tbody>
                  {res.excluded.map((e, i) => (
                    <tr key={i} className="border-b border-line align-top">
                      <td className="py-1.5 pr-3 font-mono text-[13px]">{keyOf(e.row.no)}</td>
                      <td className="py-1.5 pr-3">{e.row.name}</td>
                      <td className="py-1.5 pr-3"><Badge tone="red">{e.reason}</Badge></td>
                      <td className="py-1.5 pr-3 text-right tabular">{fmt(e.totalMh)}</td>
                      <td className="py-1.5 text-xs text-ink-soft">
                        {res.depts.filter((d) => (e.row.mh[d] ?? 0) > 0).map((d) => `${d} ${fmt(round2(e.row.mh[d]))}`).join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
