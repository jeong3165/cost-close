import type {
  ExcludedRow,
  Issue,
  MonthRecord,
  ProjectRow,
  Settings,
  UnitResult,
} from './types'

const EPS = 1e-9
export const round2 = (n: number) => Math.round(n * 100) / 100
export const keyOf = (no: string) => no.trim()

/** 확정된 달은 확정 당시 규칙, 아니면 현재 규칙 */
export function effectiveSettings(rec: MonthRecord, current: Settings): Settings {
  return rec.locked && rec.settingsSnapshot ? rec.settingsSnapshot : current
}

export function exclusionReason(row: ProjectRow, s: Settings): string | null {
  const no = keyOf(row.no)
  if (s.includeNumbers.some((x) => x.trim() === no)) return null
  if (s.excludeNumbers.some((x) => x.trim() === no)) return '번호 직접 제외'
  for (const kw of s.excludeKeywords) {
    const k = kw.trim()
    if (!k) continue
    if (row.name.includes(k) || row.no.includes(k)) return `키워드 "${k}"`
  }
  return null
}

export interface MonthResult {
  included: ProjectRow[]
  excluded: ExcludedRow[]
  units: UnitResult[] // 부서 → 묶음 순
  unitMap: Map<string, UnitResult>
  emptyGroups: string[] // 구성 부서가 비어 있는 묶음
  unknownDepts: string[] // 알지 못하는 새 부서 (어떤 묶음에도 없음)
  depts: string[]
}

export function computeMonth(rec: Pick<MonthRecord, 'rows' | 'depts'>, s: Settings): MonthResult {
  const included: ProjectRow[] = []
  const excluded: ExcludedRow[] = []
  for (const row of rec.rows) {
    const reason = exclusionReason(row, s)
    if (reason) {
      const totalMh = rec.depts.reduce((a, d) => a + (row.mh[d] ?? 0), 0)
      excluded.push({ row, reason, totalMh: round2(totalMh) })
    } else included.push(row)
  }

  const build = (name: string, kind: 'dept' | 'group', members: string[]): UnitResult => {
    const present = members.filter((m) => rec.depts.includes(m))
    const byNo = new Map<string, { no: string; name: string; mh: number }>()
    for (const row of included) {
      const mh = present.reduce((a, d) => a + (row.mh[d] ?? 0), 0)
      if (mh <= EPS) continue
      const k = keyOf(row.no)
      const prev = byNo.get(k)
      if (prev) prev.mh += mh
      else byNo.set(k, { no: k, name: row.name, mh })
    }
    const projects = [...byNo.values()]
      .map((p) => ({ ...p, mh: round2(p.mh) }))
      .sort((a, b) => a.no.localeCompare(b.no, 'ko'))
    return {
      name,
      kind,
      members,
      projects,
      totalMh: round2(projects.reduce((a, p) => a + p.mh, 0)),
      missingMembers: members.filter((m) => !rec.depts.includes(m)),
    }
  }

  const units: UnitResult[] = rec.depts.map((d) => build(d, 'dept', [d]))
  const emptyGroups: string[] = []
  for (const g of s.groups) {
    if (!g.name.trim()) continue
    if (g.members.length === 0) {
      emptyGroups.push(g.name)
      continue
    }
    units.push(build(g.name, 'group', g.members))
  }
  const unitMap = new Map(units.map((u) => [u.name, u]))

  const inGroups = new Set(s.groups.flatMap((g) => g.members))
  const known = new Set(s.knownDepts)
  const unknownDepts = rec.depts.filter((d) => !known.has(d) && !inGroups.has(d))

  return { included, excluded, units, unitMap, emptyGroups, unknownDepts, depts: rec.depts }
}

export interface UnitDiff {
  added: string[]
  removed: string[]
  isNewUnit: boolean // 지난달에는 없던 부서/묶음
}

export function diffUnits(cur: MonthResult, prev: MonthResult | null): Map<string, UnitDiff> {
  const out = new Map<string, UnitDiff>()
  for (const u of cur.units) {
    if (!prev) {
      out.set(u.name, { added: [], removed: [], isNewUnit: false })
      continue
    }
    const pu = prev.unitMap.get(u.name)
    const curSet = new Set(u.projects.map((p) => p.no))
    const prevSet = new Set(pu?.projects.map((p) => p.no) ?? [])
    out.set(u.name, {
      added: [...curSet].filter((x) => !prevSet.has(x)),
      removed: [...prevSet].filter((x) => !curSet.has(x)).sort((a, b) => a.localeCompare(b, 'ko')),
      isNewUnit: !pu,
    })
  }
  return out
}

const NO_ALLOWED = /^[A-Za-z0-9가-힣_\-.()/]+$/

export function validate(
  rec: MonthRecord,
  res: MonthResult,
  s: Settings,
  prev: { month: string; res: MonthResult } | null,
): Issue[] {
  const issues: Issue[] = []

  // 1) TOTAL 행 대조 (제외 포함 전체 행 합계 기준)
  if (!rec.totalRow) {
    issues.push({ level: 'warn', category: 'TOTAL 대조', message: '엑셀에서 TOTAL 행을 찾지 못해 합계 대조를 하지 못했습니다.' })
  } else {
    let ok = 0
    for (const d of rec.depts) {
      const sum = rec.rows.reduce((a, r) => a + (r.mh[d] ?? 0), 0)
      const tot = rec.totalRow[d] ?? 0
      if (Math.abs(sum - tot) > 0.01) {
        issues.push({
          level: 'error',
          category: 'TOTAL 대조',
          message: `${d}: 프로젝트 합계 ${round2(sum)} ≠ TOTAL ${round2(tot)} (차이 ${round2(sum - tot)})`,
        })
      } else ok++
    }
    if (ok === rec.depts.length)
      issues.push({ level: 'info', category: 'TOTAL 대조', message: `부서 ${ok}개 모두 TOTAL 행과 일치합니다.` })
  }

  // 2) 프로젝트번호 형식
  const counts = new Map<string, number>()
  for (const r of rec.rows) {
    const k = keyOf(r.no)
    counts.set(k, (counts.get(k) ?? 0) + 1)
    const total = rec.depts.reduce((a, d) => a + (r.mh[d] ?? 0), 0)
    const label = `"${r.no}" (${r.name || '이름 없음'})`
    if (!k) {
      issues.push({ level: total > 0 ? 'error' : 'warn', category: '번호 형식', message: `프로젝트번호가 비어 있습니다: ${r.name || '(이름 없음)'} · MH ${round2(total)}` })
      continue
    }
    if (k !== r.no) issues.push({ level: 'warn', category: '번호 형식', message: `번호 앞뒤에 공백이 있습니다: ${label} — 자동으로 공백을 지우고 사용합니다.` })
    if (/\s/.test(k)) issues.push({ level: 'warn', category: '번호 형식', message: `번호 가운데에 공백이 있습니다: ${label}` })
    else if (!NO_ALLOWED.test(k)) issues.push({ level: 'warn', category: '번호 형식', message: `번호에 특이한 문자가 있습니다: ${label}` })
    if (/[a-z]/.test(k) && /[A-Z]/.test(k)) issues.push({ level: 'info', category: '번호 형식', message: `대문자·소문자가 섞여 있습니다: ${label}` })
  }
  for (const [k, n] of counts) {
    if (k && n > 1) issues.push({ level: 'warn', category: '번호 형식', message: `같은 번호가 ${n}번 나옵니다: "${k}" — 등록 목록에서는 MH를 합쳐 한 번만 표시합니다.` })
  }

  // 3) 아주 작은 MH (0 초과, 기준 미만)
  const th = s.smallMhThreshold
  if (th > 0) {
    for (const r of res.included) {
      for (const d of rec.depts) {
        const v = r.mh[d] ?? 0
        if (v > EPS && v < th)
          issues.push({ level: 'warn', category: '아주 작은 MH', message: `${d} · ${keyOf(r.no)} (${r.name}): ${round2(v)} MH (기준 ${th} 미만) — 입력 실수인지 확인해 보세요.` })
      }
    }
  }

  // 4) 전월 대비 급변
  if (prev) {
    const pct = s.changeThresholdPct
    for (const u of res.units) {
      const pu = prev.res.unitMap.get(u.name)
      const before = pu?.totalMh ?? 0
      const after = u.totalMh
      if (before <= EPS && after <= EPS) continue
      if (before <= EPS) {
        issues.push({ level: 'warn', category: '전월 대비 급변', message: `${u.name}: 지난달(${prev.month}) 0 → 이번 달 ${after} MH` })
        continue
      }
      const change = ((after - before) / before) * 100
      if (Math.abs(change) >= pct)
        issues.push({ level: 'warn', category: '전월 대비 급변', message: `${u.name}: ${before} → ${after} MH (${change > 0 ? '+' : ''}${round2(change)}%)` })
    }
  }

  // 5) 새 부서 / 비어 있는 묶음
  for (const d of res.unknownDepts)
    issues.push({ level: 'warn', category: '새 부서', message: `처음 보는 부서가 엑셀에 있습니다: "${d}" — 어떤 묶음에도 들어 있지 않습니다. 설정에서 묶음에 넣거나 '알고 있는 부서'로 등록하세요.` })
  for (const g of res.emptyGroups)
    issues.push({ level: 'info', category: '묶음', message: `묶음 "${g}"의 구성 부서가 비어 있어 목록에 나오지 않습니다. 설정에서 부서를 지정하세요.` })
  for (const u of res.units)
    if (u.kind === 'group' && u.missingMembers.length)
      issues.push({ level: 'warn', category: '묶음', message: `묶음 "${u.name}"의 구성 부서 중 이번 엑셀에 없는 부서: ${u.missingMembers.join(', ')}` })
  return issues
}

/** 마감월 목록에서 이전 달 찾기 */
export function previousMonth(months: string[], month: string): string | null {
  const before = months.filter((m) => m < month).sort()
  return before.length ? before[before.length - 1] : null
}
