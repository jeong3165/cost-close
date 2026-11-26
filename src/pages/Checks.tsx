import type { Ctx } from '../App'
import type { IssueLevel } from '../lib/types'
import { Callout, PageTitle, Section } from '../components/ui'

const ICON: Record<IssueLevel, string> = { error: '⛔', warn: '⚠️', info: '✅' }
const ORDER = ['TOTAL 대조', '번호 형식', '아주 작은 MH', '전월 대비 급변', '새 부서', '묶음']
const DESC: Record<string, string> = {
  'TOTAL 대조': '엑셀의 TOTAL 행과, 프로젝트 행을 더한 값(제외 전)을 부서별로 비교합니다.',
  '번호 형식': '빈 번호, 공백, 특이한 문자, 중복 번호를 찾습니다.',
  '아주 작은 MH': '0보다 크지만 기준값보다 작은 MH입니다. 기준값은 설정에서 바꿀 수 있습니다.',
  '전월 대비 급변': '부서·묶음별 총 MH(제외 후)가 지난 마감월보다 크게 바뀐 경우입니다.',
  '새 부서': '어떤 묶음에도 없고, 알고 있는 부서 목록에도 없는 부서입니다.',
  묶음: '묶음 설정 상태입니다.',
}

export default function Checks({ ctx }: { ctx: Ctx }) {
  const { current, issues, prev, eff } = ctx
  if (!current) return null
  const cats = [...new Set([...ORDER, ...issues.map((i) => i.category)])].filter((c) => issues.some((i) => i.category === c))
  const err = issues.filter((i) => i.level === 'error').length
  const warn = issues.filter((i) => i.level === 'warn').length
  return (
    <div>
      <PageTitle icon="🔍" title={`검증 · ${current.month}`} sub={`오류 ${err}건 · 확인 필요 ${warn}건${prev ? ` · 비교 기준 ${prev.month}` : ' · 지난 마감월 자료가 없어 전월 비교는 생략'}`} />
      {err === 0 && warn === 0 && (
        <div className="mb-6">
          <Callout icon="🎉" tone="blue">특이사항이 없습니다.</Callout>
        </div>
      )}
      {cats.map((c) => (
        <Section key={c} title={c} desc={DESC[c] + (c === '아주 작은 MH' ? ` (현재 기준: ${eff.smallMhThreshold} MH)` : c === '전월 대비 급변' ? ` (현재 기준: ±${eff.changeThresholdPct}%)` : '')}>
          <ul className="space-y-1 text-sm">
            {issues
              .filter((i) => i.category === c)
              .map((i, k) => (
                <li key={k} className="flex gap-2 rounded px-2 py-1 hover:bg-[#f7f7f5]">
                  <span>{ICON[i.level]}</span>
                  <span>{i.message}</span>
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </div>
  )
}
