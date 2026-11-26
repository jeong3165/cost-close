import type { Settings } from './types'

export const SAMPLE_DEPTS = [
  '폴란드법인',
  '설계1팀',
  '설계2팀',
  '제어팀',
  '전장팀',
  '제조1팀',
  '제조2팀',
  '설계3팀',
  'PM팀',
  'SF팀',
  '품질경영실',
  'CS기술팀',
  'CS관리팀',
  '설계4팀',
  '구매팀(자재Part)',
]

export function defaultSettings(): Settings {
  return {
    excludeKeywords: ['공통', '국책'],
    excludeNumbers: [],
    includeNumbers: [],
    groups: [
      { id: 'g-mfg', name: '제조통합', members: ['제조1팀', '제조2팀'] },
      { id: 'g-cs', name: 'CS사업부', members: ['CS기술팀', 'CS관리팀'] },
      { id: 'g-hq', name: '본부', members: [] },
    ],
    pools: [],
    knownDepts: [...SAMPLE_DEPTS],
    smallMhThreshold: 0.5,
    changeThresholdPct: 50,
  }
}

/** 예전 버전에서 저장된 설정에 빠진 항목이 있으면 기본값으로 채움 */
export function normalizeSettings(s: Partial<Settings> | null | undefined): Settings {
  const d = defaultSettings()
  if (!s) return d
  return {
    excludeKeywords: Array.isArray(s.excludeKeywords) ? s.excludeKeywords : d.excludeKeywords,
    excludeNumbers: Array.isArray(s.excludeNumbers) ? s.excludeNumbers : d.excludeNumbers,
    includeNumbers: Array.isArray(s.includeNumbers) ? s.includeNumbers : d.includeNumbers,
    groups: Array.isArray(s.groups) ? s.groups : d.groups,
    pools: Array.isArray(s.pools) ? s.pools : d.pools,
    knownDepts: Array.isArray(s.knownDepts) ? s.knownDepts : d.knownDepts,
    smallMhThreshold:
      typeof s.smallMhThreshold === 'number' ? s.smallMhThreshold : d.smallMhThreshold,
    changeThresholdPct:
      typeof s.changeThresholdPct === 'number' ? s.changeThresholdPct : d.changeThresholdPct,
  }
}
