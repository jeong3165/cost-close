import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseGrid, parseWorkbook, guessMonth } from './parse'
import { computeMonth, diffUnits, validate } from './compute'
import { defaultSettings } from './defaults'
import { makeDemoGrid, makeDemoWorkbook } from './demo'
import type { MonthRecord } from './types'

const toRec = (month: string): MonthRecord => {
  const p = parseGrid(makeDemoGrid(month), 'x.xlsx')
  return { month, fileName: 'x', importedAt: '', depts: p.depts, rows: p.rows, totalRow: p.totalRow, locked: false, checks: {} }
}

describe('파일 읽기', () => {
  it('파일명에서 마감월 추정', () => {
    expect(guessMonth('프로젝트별공수_20261126.xlsx')).toBe('2026-11')
    expect(guessMonth('공수_2026-10.xlsx')).toBe('2026-10')
    expect(guessMonth('공수.xlsx')).toBeNull()
  })
  it('머리글/TOTAL 자동 탐지, 부서는 이름으로', () => {
    const wb = makeDemoWorkbook('2026-11')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const p = parseWorkbook(buf, 'a_20261126.xlsx')
    expect(p.headerRowIndex).toBe(2)
    expect(p.totalRowIndex).toBe(3)
    expect(p.depts).toHaveLength(15)
    expect(p.depts).toContain('구매팀(자재Part)')
    expect(p.rows.length).toBeGreaterThan(40)
    expect(p.rows.some((r) => r.name === 'TOTAL')).toBe(false)
  })
  it('열 순서가 바뀌고 빈 행·합계 열이 있어도 읽음', () => {
    const grid = [
      [],
      ['메모'],
      ['프로젝트번호', '설계1팀', '프로젝트명', '합계', '제조1팀'],
      ['A-1', 1, '가', 3, '2'],
      [],
      ['TOTAL', 1, '', 3, 2],
    ]
    const p = parseGrid(grid, 'x')
    expect(p.depts).toEqual(['설계1팀', '제조1팀'])
    expect(p.rows).toHaveLength(1)
    expect(p.rows[0].mh['제조1팀']).toBe(2)
    expect(p.totalRow).toEqual({ 설계1팀: 1, 제조1팀: 2 })
  })
})

describe('규칙 적용', () => {
  it('키워드 제외, 직접 제외, 예외 포함, 묶음', () => {
    const s = defaultSettings()
    const rec: MonthRecord = {
      month: '2026-11', fileName: '', importedAt: '', locked: false, checks: {},
      depts: ['제조1팀', '제조2팀', '설계1팀'], totalRow: null,
      rows: [
        { name: '가', no: 'A-1', mh: { 제조1팀: 1, 제조2팀: 2, 설계1팀: 0 } },
        { name: '공통 업무', no: 'B-1', mh: { 제조1팀: 5, 제조2팀: 0, 설계1팀: 0 } },
        { name: '나', no: 'C-1', mh: { 제조1팀: 0, 제조2팀: 3, 설계1팀: 1 } },
        { name: '국책 과제', no: 'D-1', mh: { 제조1팀: 1, 제조2팀: 0, 설계1팀: 0 } },
      ],
    }
    s.excludeNumbers = ['C-1']
    s.includeNumbers = ['D-1']
    const r = computeMonth(rec, s)
    expect(r.excluded.map((e) => e.row.no)).toEqual(['B-1', 'C-1'])
    const mfg = r.unitMap.get('제조통합')!
    expect(mfg.projects.map((p) => p.no)).toEqual(['A-1', 'D-1'])
    expect(mfg.totalMh).toBe(4)
    expect(r.unitMap.get('설계1팀')!.projects).toHaveLength(0)
    expect(r.emptyGroups).toContain('본부')
  })
  it('전월 비교와 검증', () => {
    const s = defaultSettings()
    const oct = toRec('2026-10'), nov = toRec('2026-11')
    const ro = computeMonth(oct, s), rn = computeMonth(nov, s)
    const d = diffUnits(rn, ro)
    const anyChange = [...d.values()].some((x) => x.added.length + x.removed.length > 0)
    expect(anyChange).toBe(true)
    const issues = validate(nov, rn, s, { month: '2026-10', res: ro })
    expect(issues.some((i) => i.category === 'TOTAL 대조' && i.level === 'info')).toBe(true)
    expect(issues.some((i) => i.message.includes('공백'))).toBe(true)
  })
  it('TOTAL 불일치 탐지', () => {
    const s = defaultSettings()
    const rec = toRec('2026-11')
    rec.totalRow = { ...rec.totalRow!, 설계1팀: (rec.totalRow!['설계1팀'] ?? 0) + 10 }
    const issues = validate(rec, computeMonth(rec, s), s, null)
    expect(issues.some((i) => i.level === 'error' && i.message.startsWith('설계1팀'))).toBe(true)
  })
})
