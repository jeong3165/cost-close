import * as XLSX from 'xlsx'
import type { MonthRecord, Settings } from './types'
import { computeMonth, keyOf, round2 } from './compute'
import { downloadBlob } from './download'

function save(wb: XLSX.WorkBook, fileName: string) {
  const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
  downloadBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
}

function setWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }))
}

/** 집계표: 프로젝트 × 부서·묶음 */
export function exportSummary(rec: MonthRecord, s: Settings) {
  const res = computeMonth(rec, s)
  const groups = res.units.filter((u) => u.kind === 'group')
  const head = ['프로젝트명', '프로젝트번호', ...rec.depts, '부서 합계', ...groups.map((g) => `[묶음] ${g.name}`)]
  const rows: (string | number)[][] = [head]
  for (const r of res.included) {
    const vals = rec.depts.map((d) => round2(r.mh[d] ?? 0))
    const sum = round2(vals.reduce((a, b) => a + b, 0))
    const gv = groups.map((g) => round2(g.members.reduce((a, d) => a + (r.mh[d] ?? 0), 0)))
    rows.push([r.name, keyOf(r.no), ...vals, sum, ...gv])
  }
  const totals = rec.depts.map((d) => round2(res.included.reduce((a, r) => a + (r.mh[d] ?? 0), 0)))
  rows.push(['합계(제외 후)', '', ...totals, round2(totals.reduce((a, b) => a + b, 0)), ...groups.map((g) => g.totalMh)])
  const ws = XLSX.utils.aoa_to_sheet(rows)
  setWidths(ws, [30, 28, ...head.slice(2).map(() => 11)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '집계표')
  save(wb, `집계표_${rec.month}.xlsx`)
}

/** 등록 목록: 부서별 번호 (가로형 + 세로형 시트) */
export function exportRegistration(rec: MonthRecord, s: Settings) {
  const res = computeMonth(rec, s)
  const units = res.units.filter((u) => u.projects.length > 0)
  // 시트1: 부서마다 한 열 (그대로 복사해서 붙여넣기 쉬움)
  const maxLen = Math.max(0, ...units.map((u) => u.projects.length))
  const wide: (string | number)[][] = [units.map((u) => (u.kind === 'group' ? `[묶음] ${u.name}` : u.name))]
  wide.push(units.map((u) => `${u.projects.length}건 / ${u.totalMh} MH`))
  for (let i = 0; i < maxLen; i++) wide.push(units.map((u) => u.projects[i]?.no ?? ''))
  const ws1 = XLSX.utils.aoa_to_sheet(wide)
  setWidths(ws1, units.map(() => 26))
  // 시트2: 한 줄에 하나씩 (필터·피벗용)
  const long: (string | number)[][] = [['구분', '부서/묶음', '프로젝트번호', '프로젝트명', 'MH']]
  for (const u of units) for (const p of u.projects) long.push([u.kind === 'group' ? '묶음' : '부서', u.name, p.no, p.name, p.mh])
  const ws2 = XLSX.utils.aoa_to_sheet(long)
  setWidths(ws2, [6, 16, 28, 30, 10])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, '부서별 번호')
  XLSX.utils.book_append_sheet(wb, ws2, '상세(한 줄씩)')
  // 시트3: 원가풀 구조가 있으면
  if (s.pools.length) {
    const pl: (string | number)[][] = [['원가풀', '부서/묶음', '프로젝트번호', '프로젝트명', 'MH']]
    for (const pool of s.pools)
      for (const un of pool.units) {
        const u = res.unitMap.get(un)
        for (const p of u?.projects ?? []) pl.push([pool.name, un, p.no, p.name, p.mh])
      }
    const ws3 = XLSX.utils.aoa_to_sheet(pl)
    setWidths(ws3, [18, 16, 28, 30, 10])
    XLSX.utils.book_append_sheet(wb, ws3, '원가풀별')
  }
  save(wb, `ERP등록목록_${rec.month}.xlsx`)
}

/** 제외 목록 */
export function exportExcluded(rec: MonthRecord, s: Settings) {
  const res = computeMonth(rec, s)
  const head = ['프로젝트명', '프로젝트번호', '제외 이유', 'MH 합계', ...rec.depts]
  const rows: (string | number)[][] = [head]
  for (const e of res.excluded)
    rows.push([e.row.name, keyOf(e.row.no), e.reason, e.totalMh, ...rec.depts.map((d) => round2(e.row.mh[d] ?? 0))])
  const ws = XLSX.utils.aoa_to_sheet(rows)
  setWidths(ws, [30, 28, 16, 10, ...rec.depts.map(() => 11)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '제외 목록')
  save(wb, `제외목록_${rec.month}.xlsx`)
}
