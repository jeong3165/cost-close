// 가짜 데모 엑셀 만들기:  npm run demo  → demo/ 폴더에 생성
import * as XLSX from 'xlsx'
import { mkdirSync, writeFileSync } from 'node:fs'
import { makeDemoWorkbook, demoFileName } from '../src/lib/demo'

mkdirSync('demo', { recursive: true })
for (const month of ['2026-10', '2026-11']) {
  const buf = XLSX.write(makeDemoWorkbook(month), { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(`demo/${demoFileName(month)}`, buf)
  console.log('만듦:', `demo/${demoFileName(month)}`)
}
