import * as XLSX from 'xlsx'
import type { ParsedFile, ProjectRow } from './types'

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '').trim()

/** 셀 값을 숫자로 (빈칸·문자는 0, "1,234.5" 같은 문자열도 처리) */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v == null) return 0
  const s = String(v).replace(/,/g, '').trim()
  if (s === '' || s === '-') return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** 파일 이름에서 마감월 추정: ..._20261126.xlsx → 2026-11 */
export function guessMonth(fileName: string): string | null {
  const m8 = fileName.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?([0-3]\d)/)
  if (m8) return `${m8[1]}-${m8[2]}`
  const m6 = fileName.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])(?!\d)/)
  if (m6) return `${m6[1]}-${m6[2]}`
  return null
}

const TOTAL_WORDS = new Set(['TOTAL', '합계', '총계', '계', '총합계'])

/** 2차원 배열(엑셀 시트)을 해석 */
export function parseGrid(grid: unknown[][], fileName: string): ParsedFile {
  // 1) 머리글 행 찾기: '프로젝트번호' 칸이 있는 첫 행 (앞쪽 30행 안에서)
  let headerIdx = -1
  let noCol = -1
  let nameCol = -1
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    const row = grid[r] ?? []
    const ci = row.findIndex((c) => norm(c) === '프로젝트번호')
    if (ci >= 0) {
      headerIdx = r
      noCol = ci
      nameCol = row.findIndex((c) => norm(c) === '프로젝트명')
      break
    }
  }
  if (headerIdx < 0) {
    throw new Error(
      "머리글 행을 찾지 못했습니다. 엑셀에 '프로젝트번호' 라는 열 제목이 있는지 확인해 주세요.",
    )
  }
  const header = grid[headerIdx] ?? []

  // 제목: 머리글 위쪽에서 처음 나오는 글자
  let title = ''
  for (let r = 0; r < headerIdx && !title; r++) {
    const c = (grid[r] ?? []).find((x) => String(x ?? '').trim() !== '')
    if (c != null) title = String(c).trim()
  }

  // 2) 부서 열: 프로젝트명/번호 외의 머리글이 있는 열 (합계 열은 제외)
  const deptCols: { col: number; name: string }[] = []
  const seen = new Set<string>()
  header.forEach((c, col) => {
    if (col === noCol || col === nameCol) return
    const name = String(c ?? '').trim()
    if (!name) return
    if (TOTAL_WORDS.has(norm(name).toUpperCase())) return
    let unique = name
    let k = 2
    while (seen.has(unique)) unique = `${name}(${k++})`
    seen.add(unique)
    deptCols.push({ col, name: unique })
  })
  if (deptCols.length === 0) throw new Error('부서 열을 찾지 못했습니다.')

  // 3) 데이터 행 / TOTAL 행
  const rows: ProjectRow[] = []
  let totalRow: Record<string, number> | null = null
  let totalRowIndex: number | null = null
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? []
    const name = nameCol >= 0 ? String(row[nameCol] ?? '').trim() : ''
    const no = String(row[noCol] ?? '').trim()
    const mh: Record<string, number> = {}
    let any = false
    for (const d of deptCols) {
      const v = toNumber(row[d.col])
      mh[d.name] = v
      if (v !== 0) any = true
    }
    const isTotal =
      TOTAL_WORDS.has(norm(name).toUpperCase()) || TOTAL_WORDS.has(norm(no).toUpperCase())
    if (isTotal && totalRow == null) {
      totalRow = mh
      totalRowIndex = r + 1
      continue
    }
    if (!name && !no && !any) continue // 빈 행
    rows.push({ name, no: String(row[noCol] ?? ''), mh })
  }

  return {
    fileName,
    title,
    depts: deptCols.map((d) => d.name),
    rows,
    totalRow,
    headerRowIndex: headerIdx + 1,
    totalRowIndex,
    monthGuess: guessMonth(fileName),
  }
}

export function parseWorkbook(data: ArrayBuffer, fileName: string): ParsedFile {
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('시트를 찾을 수 없습니다.')
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
  return parseGrid(grid, fileName)
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  return parseWorkbook(buf, file.name)
}
