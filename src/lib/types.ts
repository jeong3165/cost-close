// 앱 전반에서 쓰는 데이터 형태

export interface ProjectRow {
  name: string // 프로젝트명
  no: string // 프로젝트번호
  mh: Record<string, number> // 부서명 → MH
}

/** 엑셀 한 개를 읽은 결과 */
export interface ParsedFile {
  fileName: string
  title: string
  depts: string[] // 엑셀에 나온 부서 열 (순서 유지)
  rows: ProjectRow[]
  totalRow: Record<string, number> | null // TOTAL 행 (없으면 null)
  headerRowIndex: number // 1부터 시작하는 엑셀 행 번호
  totalRowIndex: number | null
  monthGuess: string | null // 파일명에서 추정한 마감월 YYYY-MM
}

export interface DeptGroup {
  id: string
  name: string // 묶음 이름 (예: 제조통합)
  members: string[] // 원래 부서 이름들
}

export interface CostPool {
  id: string
  name: string // 원가풀 이름
  units: string[] // 하위 부서 또는 묶음 이름
}

export interface Settings {
  excludeKeywords: string[] // 프로젝트명/번호에 들어가면 제외
  excludeNumbers: string[] // 번호 직접 제외
  includeNumbers: string[] // 키워드에 걸려도 예외로 포함
  groups: DeptGroup[]
  pools: CostPool[]
  knownDepts: string[] // 알고 있는 부서 (새 부서 알림용)
  smallMhThreshold: number // 이 값 미만(0 초과) MH는 '아주 작은 MH'로 표시
  changeThresholdPct: number // 전월 대비 이 % 이상 변하면 '급변'
}

export interface MonthRecord {
  month: string // YYYY-MM
  fileName: string
  importedAt: string
  depts: string[]
  rows: ProjectRow[]
  totalRow: Record<string, number> | null
  locked: boolean
  lockedAt?: string
  settingsSnapshot?: Settings // 확정 시점의 규칙 (확정된 달은 이 규칙으로 계속 보여줌)
  checks: Record<string, boolean> // 등록 완료 체크 (키: 보기방식|단위)
  memo?: string
}

export type UnitKind = 'dept' | 'group'

export interface UnitProject {
  no: string
  name: string
  mh: number
}

export interface UnitResult {
  name: string
  kind: UnitKind
  members: string[] // 부서는 자기 자신, 묶음은 구성 부서
  projects: UnitProject[] // MH > 0 인 프로젝트 (번호순)
  totalMh: number
  missingMembers: string[] // 묶음 구성 부서 중 이번 엑셀에 없는 부서
}

export interface ExcludedRow {
  row: ProjectRow
  reason: string
  totalMh: number
}

export type IssueLevel = 'error' | 'warn' | 'info'

export interface Issue {
  level: IssueLevel
  category: string
  message: string
}
