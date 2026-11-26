// 가짜 데모 데이터 생성기 (실제 회사 데이터 아님)
import * as XLSX from 'xlsx'
import { SAMPLE_DEPTS } from './defaults'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

interface DemoProject {
  name: string
  no: string
}

function demoProjects(): DemoProject[] {
  const list: DemoProject[] = []
  const customers = ['가나전자', '다라화학', '마바모터스', '사아에너지', '자차배터리', '카타소재']
  for (let i = 1; i <= 24; i++) {
    const c = customers[i % customers.length]
    list.push({ name: `${c} 조립라인 ${i}호기`, no: `DM24${String(10 + i).padStart(2, '0')}XY-0${(i % 3) + 1}` })
  }
  for (let i = 1; i <= 14; i++) {
    list.push({
      name: `데모 검사장비 개발 ${i}차`,
      no: `IDEMO${(i % 4) + 1}-DM25-0000QA-B${String(100 + i)}`,
    })
  }
  for (let i = 1; i <= 8; i++) list.push({ name: `해외 데모 설비 ${i}`, no: `PL-DEMO-${2500 + i}` })
  list.push({ name: '공통 업무(장비)', no: '공통_장비' })
  list.push({ name: '공통 업무(설계)', no: '공통_설계' })
  list.push({ name: '국책과제 데모', no: 'GOV-DEMO-01' })
  list.push({ name: '사내 교육', no: '공통_교육' })
  return list
}

/** 데모 엑셀 시트(2차원 배열) — month: 'YYYY-MM' */
export function makeDemoGrid(month: string): unknown[][] {
  const [y, m] = month.split('-').map(Number)
  const r = rng(y * 100 + m)
  const all = demoProjects()
  // 달마다 일부 프로젝트만 진행 (전월 비교 테스트용)
  const active = all.filter((_p, i) => {
    if (i >= all.length - 4) return true // 공통/국책은 매달
    return (i + m) % 9 !== 0
  })

  const header = ['프로젝트명', '프로젝트번호', ...SAMPLE_DEPTS]
  const body: unknown[][] = active.map((p, idx) => {
    const pi = all.indexOf(p)
    const vals = SAMPLE_DEPTS.map((_d, di) => {
      // 어느 부서가 참여하는지는 프로젝트마다 거의 고정, 달마다 조금씩만 바뀜
      const roll = rng(pi * 31 + di * 7 + 1)()
      const flip = r() < 0.06
      if ((roll < 0.62) !== flip) return 0
      if (r() < 0.05) return Math.round(r() * 4) / 10 // 0~0.4 아주 작은 값
      const base = di === 0 ? 40 : 12 + (idx % 5) * 6
      return Math.round(r() * base * 10 + 5) / 10
    })
    return [p.name, p.no, ...vals]
  })
  // 11월 데모에는 번호 끝 공백 하나를 일부러 넣음 (검증 화면 확인용)
  if (m === 11 && body.length > 3) body[3][1] = String(body[3][1]) + ' '

  const totals = SAMPLE_DEPTS.map(
    (_d, di) => Math.round(body.reduce((a, row) => a + Number(row[di + 2] || 0), 0) * 100) / 100,
  )
  return [['프로젝트별공수집계조회(S)'], header, ['TOTAL', '', ...totals], ...body]
}

export function demoFileName(month: string) {
  const [y, m] = month.split('-')
  return `demo_MH_${y}${m}26.xlsx`
}

export function makeDemoWorkbook(month: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(makeDemoGrid(month)), 'Sheet1')
  return wb
}
