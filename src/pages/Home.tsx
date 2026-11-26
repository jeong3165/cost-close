import { useEffect, useRef, useState } from 'react'
import type { Ctx } from '../App'
import type { MonthRecord, ParsedFile } from '../lib/types'
import { parseFile, parseGrid } from '../lib/parse'
import { makeDemoGrid, demoFileName } from '../lib/demo'
import * as db from '../lib/storage'
import { computeMonth, effectiveSettings } from '../lib/compute'
import { Badge, Button, Callout, PageTitle, Section, Empty, cx, fmt } from '../components/ui'

const thisMonth = () => {
  const d = new Date()
  // 마감은 보통 지난달 기준이지만, 파일명에서 못 찾으면 이번 달을 기본으로
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Row {
  rec: MonthRecord
  done: number
  total: number
  projects: number
}

export default function Home({ ctx }: { ctx: Ctx }) {
  const { months, settings } = ctx
  const [pending, setPending] = useState<ParsedFile | null>(null)
  const [month, setMonth] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const all = await db.loadAllMonths()
      setRows(
        all.reverse().map((rec) => {
          const res = computeMonth(rec, effectiveSettings(rec, settings))
          const units = res.units.filter((u) => u.projects.length > 0)
          const done = units.filter((u) => rec.checks[`u|${u.name}`]).length
          return { rec, done, total: units.length, projects: res.included.length }
        }),
      )
    })()
  }, [months, settings, ctx.current])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setError(null)
    try {
      const p = await parseFile(f)
      setPending(p)
      setMonth(p.monthGuess ?? thisMonth())
    } catch (e) {
      setPending(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const loadDemo = (m: string) => {
    setError(null)
    const p = parseGrid(makeDemoGrid(m), demoFileName(m))
    setPending(p)
    setMonth(p.monthGuess ?? m)
  }

  const save = async () => {
    if (!pending || !/^\d{4}-\d{2}$/.test(month)) return
    const existing = await db.loadMonth(month)
    if (existing?.locked) {
      setError(`${month}은(는) 확정(잠금)된 달입니다. 먼저 아래 목록에서 '확정 해제'를 해야 다시 올릴 수 있습니다.`)
      return
    }
    if (existing && !confirm(`${month} 자료가 이미 있습니다. 새 파일로 바꿀까요?\n(등록 완료 체크는 그대로 둡니다)`)) return
    const rec: MonthRecord = {
      month,
      fileName: pending.fileName,
      importedAt: new Date().toISOString(),
      depts: pending.depts,
      rows: pending.rows,
      totalRow: pending.totalRow,
      locked: false,
      checks: existing?.checks ?? {},
      memo: existing?.memo,
    }
    await ctx.saveRecord(rec)
    setPending(null)
    ctx.toast(`${month} 마감 자료를 저장했습니다.`)
    ctx.go('erp')
  }

  const toggleLock = async (rec: MonthRecord) => {
    if (rec.locked) {
      if (!confirm(`${rec.month} 확정을 해제할까요?\n해제하면 '현재 설정의 규칙'으로 다시 계산됩니다.`)) return
      await db.saveMonth({ ...rec, locked: false, lockedAt: undefined, settingsSnapshot: undefined })
    } else {
      if (!confirm(`${rec.month}을(를) 확정(잠금)할까요?\n지금의 규칙이 함께 저장되어, 나중에 설정을 바꿔도 이 달의 결과는 바뀌지 않습니다.`)) return
      await db.saveMonth({ ...rec, locked: true, lockedAt: new Date().toISOString(), settingsSnapshot: structuredClone(settings) })
    }
    await ctx.openMonth(ctx.current?.month === rec.month ? rec.month : (ctx.current?.month ?? rec.month))
    ctx.toast(rec.locked ? '확정을 해제했습니다.' : '확정(잠금)했습니다.')
  }

  const remove = async (rec: MonthRecord) => {
    if (rec.locked) return alert('확정된 달은 삭제할 수 없습니다. 먼저 확정 해제를 하세요.')
    if (!confirm(`${rec.month} 자료를 삭제할까요? 되돌릴 수 없습니다.`)) return
    await ctx.removeMonth(rec.month)
    ctx.toast(`${rec.month} 삭제됨`)
  }

  const pendingUnknown = pending ? computeMonth({ rows: pending.rows, depts: pending.depts }, settings).unknownDepts : []

  return (
    <div>
      <PageTitle icon="🏠" title="마감월 · 파일 올리기" sub="ERP에서 내려받은 '프로젝트별공수집계조회(S)' 엑셀을 올리면 부서별 등록 목록을 만들어 드립니다." />

      <Section title="1. 이번 달 엑셀 올리기">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            onFile(e.dataTransfer.files[0])
          }}
          className={cx(
            'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            drag ? 'border-[#2383e2] bg-[#e7f3f8]' : 'border-line bg-[#fbfbfa]',
          )}
        >
          <div className="text-3xl">📥</div>
          <p className="mt-2 text-sm">엑셀 파일을 여기로 끌어다 놓거나</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              파일 선택
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <p className="mt-4 text-xs text-ink-faint">
            처음이라면 가짜 데모 자료로 먼저 체험해 보세요:{' '}
            <button className="underline" onClick={() => loadDemo('2026-10')}>
              데모 10월
            </button>{' '}
            ·{' '}
            <button className="underline" onClick={() => loadDemo('2026-11')}>
              데모 11월
            </button>
          </p>
        </div>

        {error && (
          <div className="mt-3">
            <Callout icon="⚠️" tone="red">
              {error}
            </Callout>
          </div>
        )}

        {pending && (
          <div className="mt-4 rounded-lg border border-line p-4">
            <div className="mb-3 font-medium">📄 {pending.fileName}</div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label="제목" value={pending.title || '(없음)'} />
              <Info label="머리글 / TOTAL 행" value={`${pending.headerRowIndex}행 / ${pending.totalRowIndex ? pending.totalRowIndex + '행' : '못 찾음'}`} />
              <Info label="부서 열" value={`${pending.depts.length}개`} />
              <Info label="프로젝트 행" value={`${pending.rows.length}개`} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {pending.depts.map((d) => (
                <Badge key={d} tone={pendingUnknown.includes(d) ? 'orange' : 'gray'}>
                  {d}
                  {pendingUnknown.includes(d) && ' (새 부서)'}
                </Badge>
              ))}
            </div>
            {pendingUnknown.length > 0 && (
              <div className="mt-3">
                <Callout icon="🆕" tone="yellow">
                  처음 보는 부서가 있습니다: <b>{pendingUnknown.join(', ')}</b>. 저장 후 <b>설정</b>에서 묶음에 넣거나 '알고 있는 부서'로 등록하세요.
                </Callout>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <div className="mb-1 text-ink-soft">마감월 {pending.monthGuess ? '(파일 이름에서 찾음)' : '(직접 선택하세요)'}</div>
                <input type="month" className="rounded-md border border-line px-2 py-1.5" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
              <Button variant="primary" onClick={save} disabled={!month}>
                {months.includes(month) ? `${month} 자료 바꾸기` : `${month || '마감월'}로 저장`}
              </Button>
              <Button variant="ghost" onClick={() => setPending(null)}>
                취소
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="2. 저장된 마감월" desc="마감월을 누르면 그 달 자료를 엽니다. 확정(잠금)하면 규칙을 바꿔도 결과가 그대로 유지됩니다.">
        {rows.length === 0 ? (
          <Empty>아직 저장된 마감월이 없습니다. 위에서 엑셀을 올려 주세요.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-normal">마감월</th>
                  <th className="py-2 pr-3 font-normal">파일</th>
                  <th className="py-2 pr-3 font-normal text-right">프로젝트</th>
                  <th className="py-2 pr-3 font-normal">ERP 등록</th>
                  <th className="py-2 pr-3 font-normal">상태</th>
                  <th className="py-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ rec, done, total, projects }) => (
                  <tr key={rec.month} className={cx('border-b border-line', ctx.current?.month === rec.month && 'bg-[#f7f7f5]')}>
                    <td className="py-2 pr-3">
                      <button
                        className="font-medium underline decoration-line underline-offset-4 hover:decoration-ink"
                        onClick={async () => {
                          await ctx.openMonth(rec.month)
                          ctx.go('erp')
                        }}
                      >
                        {rec.month}
                      </button>
                    </td>
                    <td className="max-w-[16rem] truncate py-2 pr-3 text-ink-soft" title={rec.fileName}>
                      {rec.fileName}
                    </td>
                    <td className="py-2 pr-3 text-right tabular">{fmt(projects)}</td>
                    <td className="py-2 pr-3 tabular">
                      {done}/{total}
                      {total > 0 && done === total && ' ✅'}
                    </td>
                    <td className="py-2 pr-3">{rec.locked ? <Badge tone="green">🔒 확정</Badge> : <Badge>작업 중</Badge>}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => toggleLock(rec)}>
                          {rec.locked ? '확정 해제' : '확정'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => remove(rec)} disabled={rec.locked}>
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Callout icon="🔒">
        올린 엑셀과 결과는 <b>이 PC의 이 브라우저 안(IndexedDB)</b>에만 저장되고, 인터넷으로 보내지 않습니다. 브라우저 기록을 지우면 함께 지워질 수 있으니,
        가끔 <b>설정 → 백업</b>에서 전체 백업 파일을 받아 두세요.
      </Callout>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f7f5] px-3 py-2">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="truncate">{value}</div>
    </div>
  )
}
