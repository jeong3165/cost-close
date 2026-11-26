// 모든 데이터는 이 브라우저의 IndexedDB에만 저장됩니다. (외부 전송 없음)
import { createStore, get, set, del, keys } from 'idb-keyval'
import type { MonthRecord, Settings } from './types'
import { normalizeSettings } from './defaults'

const store = createStore('cost-close', 'kv')
const MONTH_PREFIX = 'month:'

export async function loadSettings(): Promise<Settings> {
  return normalizeSettings(await get('settings', store))
}
export async function saveSettings(s: Settings) {
  await set('settings', s, store)
}
export async function listMonths(): Promise<string[]> {
  const ks = await keys(store)
  return ks
    .map(String)
    .filter((k) => k.startsWith(MONTH_PREFIX))
    .map((k) => k.slice(MONTH_PREFIX.length))
    .sort()
}
export async function loadMonth(month: string): Promise<MonthRecord | undefined> {
  return get(MONTH_PREFIX + month, store)
}
export async function saveMonth(rec: MonthRecord) {
  await set(MONTH_PREFIX + rec.month, rec, store)
}
export async function deleteMonth(month: string) {
  await del(MONTH_PREFIX + month, store)
}
export async function loadAllMonths(): Promise<MonthRecord[]> {
  const ms = await listMonths()
  const out: MonthRecord[] = []
  for (const m of ms) {
    const r = await loadMonth(m)
    if (r) out.push(r)
  }
  return out
}
