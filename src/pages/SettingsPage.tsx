import { useRef, useState } from 'react'
import type { Ctx } from '../App'
import type { CostPool, DeptGroup, MonthRecord, Settings } from '../lib/types'
import { defaultSettings, normalizeSettings } from '../lib/defaults'
import { downloadJson } from '../lib/download'
import * as db from '../lib/storage'
import { Badge, Button, Callout, ChipEditor, PageTitle, Section, cx } from '../components/ui'

const uid = () => Math.random().toString(36).slice(2, 9)
const lines = (s: string) => [...new Set(s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean))]

export default function SettingsPage({ ctx }: { ctx: Ctx }) {
  const { settings: s, current, res } = ctx
  const set = (patch: Partial<Settings>) => ctx.setSettings({ ...s, ...patch })
  const allDepts = [...new Set([...s.knownDepts, ...(current?.depts ?? [])])]
  const unitChoices = [...allDepts, ...s.groups.filter((g) => g.name.trim()).map((g) => g.name)]
  const unknown = res?.unknownDepts ?? []

  return (
    <div>
      <PageTitle icon="⚙️" title="설정 (규칙)" sub="바꾼 내용은 바로 저장되고, 작업 중인 마감월에 바로 반영됩니다. 확정(잠금)된 달은 확정 당시 규칙을 그대로 씁니다." />
      {current?.locked && (
        <div className="mb-6">
          <Callout icon="🔒" tone="yellow">
            지금 열린 {current.month}은(는) 확정된 달이라 여기서 규칙을 바꿔도 그 달 결과는 바뀌지 않습니다. 바꾸려면 '마감월' 화면에서 확정 해제하세요.
          </Callout>
        </div>
      )}

      <Section title="1. 제외 규칙" desc="프로젝트명 또는 프로젝트번호에 아래 글자가 들어가면 집계에서 뺍니다.">
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-sm font-medium">제외 키워드</div>
            <ChipEditor values={s.excludeKeywords} onChange={(v) => set({ excludeKeywords: v })} placeholder="예: 공통 (입력 후 Enter)" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberList
              key={'ex' + s.excludeNumbers.join('|')}
              title="직접 제외할 번호"
              desc="키워드와 상관없이 항상 뺄 프로젝트번호 (한 줄에 하나)"
              values={s.excludeNumbers}
              onChange={(v) => set({ excludeNumbers: v })}
            />
            <NumberList
              key={'in' + s.includeNumbers.join('|')}
              title="예외로 포함할 번호"
              desc="키워드·직접 제외에 걸려도 집계에 넣을 번호 (한 줄에 하나)"
              values={s.includeNumbers}
              onChange={(v) => set({ includeNumbers: v })}
            />
          </div>
        </div>
      </Section>

      <Section
        title="2. 부서 묶음 (가상 부서)"
        desc="여러 부서를 합친 '묶음'을 행으로 추가합니다. 원래 부서도 그대로 남습니다. 부서 이름을 눌러 넣고 빼세요."
        right={
          <Button size="sm" onClick={() => set({ groups: [...s.groups, { id: uid(), name: '새 묶음', members: [] }] })}>
            + 묶음 추가
          </Button>
        }
      >
        <div className="space-y-3">
          {s.groups.map((g, gi) => (
            <GroupEditor
              key={g.id}
              g={g}
              allDepts={allDepts}
              onChange={(ng) => set({ groups: s.groups.map((x, i) => (i === gi ? ng : x)) })}
              onDelete={() => confirm(`묶음 "${g.name}"을(를) 삭제할까요?`) && set({ groups: s.groups.filter((_, i) => i !== gi) })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="3. 원가풀 구조 (선택)"
        desc="ERP의 원가풀 → 하위 부서 순서대로 등록해 두면, 등록 목록을 원가풀별로 볼 수 있습니다."
        right={
          <Button size="sm" onClick={() => set({ pools: [...s.pools, { id: uid(), name: `원가풀 ${s.pools.length + 1}`, units: [] }] })}>
            + 원가풀 추가
          </Button>
        }
      >
        {s.pools.length === 0 && <p className="text-sm text-ink-faint">아직 등록된 원가풀이 없습니다.</p>}
        <div className="space-y-3">
          {s.pools.map((p, pi) => (
            <PoolEditor
              key={p.id}
              p={p}
              choices={unitChoices}
              onChange={(np) => set({ pools: s.pools.map((x, i) => (i === pi ? np : x)) })}
              onDelete={() => confirm(`원가풀 "${p.name}"을(를) 삭제할까요?`) && set({ pools: s.pools.filter((_, i) => i !== pi) })}
              onMove={(dir) => {
                const arr = [...s.pools]
                const j = pi + dir
                if (j < 0 || j >= arr.length) return
                ;[arr[pi], arr[j]] = [arr[j], arr[pi]]
                set({ pools: arr })
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="4. 알고 있는 부서" desc="여기에도 없고 어떤 묶음에도 없는 부서가 엑셀에 나오면 '새 부서'로 알려 드립니다.">
        {unknown.length > 0 && (
          <div className="mb-2">
            <Callout icon="🆕" tone="yellow">
              이번 달 새 부서: <b>{unknown.join(', ')}</b>{' '}
              <Button size="sm" onClick={() => set({ knownDepts: [...s.knownDepts, ...unknown] })}>
                알고 있는 부서로 등록
              </Button>
            </Callout>
          </div>
        )}
        <ChipEditor values={s.knownDepts} onChange={(v) => set({ knownDepts: v })} placeholder="부서 이름 입력 후 Enter" />
      </Section>

      <Section title="5. 검증 기준">
        <div className="flex flex-wrap gap-6 text-sm">
          <label>
            <div className="mb-1">아주 작은 MH 기준 (이 값 미만이면 표시)</div>
            <input
              type="number"
              step="0.1"
              min="0"
              className="w-28 rounded-md border border-line px-2 py-1.5"
              value={s.smallMhThreshold}
              onChange={(e) => set({ smallMhThreshold: Math.max(0, Number(e.target.value) || 0) })}
            />{' '}
            MH
          </label>
          <label>
            <div className="mb-1">전월 대비 급변 기준</div>±{' '}
            <input
              type="number"
              step="5"
              min="0"
              className="w-24 rounded-md border border-line px-2 py-1.5"
              value={s.changeThresholdPct}
              onChange={(e) => set({ changeThresholdPct: Math.max(0, Number(e.target.value) || 0) })}
            />{' '}
            % 이상
          </label>
        </div>
      </Section>

      <Backup ctx={ctx} />
    </div>
  )
}

function NumberList({ title, desc, values, onChange }: { title: string; desc: string; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(values.join('\n'))
  return (
    <div>
      <div className="text-sm font-medium">
        {title} <Badge>{values.length}</Badge>
      </div>
      <div className="mb-1 text-xs text-ink-faint">{desc}</div>
      <textarea
        className="h-28 w-full rounded-md border border-line p-2 font-mono text-[13px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = lines(text)
          setText(v.join('\n'))
          onChange(v)
        }}
        placeholder="여러 줄 붙여넣기 가능"
      />
    </div>
  )
}

function GroupEditor({ g, allDepts, onChange, onDelete }: { g: DeptGroup; allDepts: string[]; onChange: (g: DeptGroup) => void; onDelete: () => void }) {
  const opts = [...new Set([...allDepts, ...g.members])]
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex items-center gap-2">
        <input className="w-48 rounded-md border border-line px-2 py-1 font-medium" value={g.name} onChange={(e) => onChange({ ...g, name: e.target.value })} />
        <span className="text-sm text-ink-soft">= {g.members.length ? g.members.join(' + ') : '(부서를 골라 주세요)'}</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onDelete}>
          삭제
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {opts.map((d) => {
          const on = g.members.includes(d)
          return (
            <button
              key={d}
              onClick={() => onChange({ ...g, members: on ? g.members.filter((x) => x !== d) : [...g.members, d] })}
              className={cx('rounded-md border px-2 py-0.5 text-sm', on ? 'border-[#9a6dd7] bg-[#e8deee]' : 'border-line text-ink-soft hover:bg-hover')}
            >
              {on ? '✓ ' : ''}
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PoolEditor(props: { p: CostPool; choices: string[]; onChange: (p: CostPool) => void; onDelete: () => void; onMove: (d: number) => void }) {
  const { p, choices, onChange, onDelete, onMove } = props
  const rest = choices.filter((c) => !p.units.includes(c))
  const moveUnit = (i: number, dir: number) => {
    const arr = [...p.units]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange({ ...p, units: arr })
  }
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span>🗂️</span>
        <input className="w-56 rounded-md border border-line px-2 py-1 font-medium" value={p.name} onChange={(e) => onChange({ ...p, name: e.target.value })} />
        <Button size="sm" variant="ghost" onClick={() => onMove(-1)} title="위로">
          ↑
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onMove(1)} title="아래로">
          ↓
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onDelete}>
          삭제
        </Button>
      </div>
      <div className="ml-6 space-y-1">
        {p.units.map((u, i) => (
          <div key={u} className="flex items-center gap-2 text-sm">
            <span className="text-ink-faint">└</span>
            <span className={cx(!choices.includes(u) && 'text-[#e03e3e]')}>{u}</span>
            {!choices.includes(u) && <Badge tone="red">없는 부서</Badge>}
            <button className="text-ink-faint hover:text-ink" onClick={() => moveUnit(i, -1)}>
              ↑
            </button>
            <button className="text-ink-faint hover:text-ink" onClick={() => moveUnit(i, 1)}>
              ↓
            </button>
            <button className="text-ink-faint hover:text-[#e03e3e]" onClick={() => onChange({ ...p, units: p.units.filter((x) => x !== u) })}>
              ×
            </button>
          </div>
        ))}
        <select
          className="mt-1 rounded-md border border-line px-2 py-1 text-sm"
          value=""
          onChange={(e) => e.target.value && onChange({ ...p, units: [...p.units, e.target.value] })}
        >
          <option value="">+ 하위 부서/묶음 추가…</option>
          {rest.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function Backup({ ctx }: { ctx: Ctx }) {
  const settingsFile = useRef<HTMLInputElement>(null)
  const allFile = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const readJson = async (f: File) => JSON.parse(await f.text())

  const importSettings = async (f?: File) => {
    if (!f) return
    try {
      const j = await readJson(f)
      const raw = j?.app === 'cost-close' && j.settings ? j.settings : j
      if (!confirm('지금 설정을 파일의 설정으로 바꿀까요?')) return
      await ctx.setSettings(normalizeSettings(raw))
      ctx.toast('설정을 복원했습니다.')
    } catch (e) {
      alert('설정 파일을 읽지 못했습니다: ' + e)
    }
  }

  const importAll = async (f?: File) => {
    if (!f) return
    try {
      const j = await readJson(f)
      if (j?.app !== 'cost-close' || !Array.isArray(j.months)) throw new Error('공수 마감 도우미 전체 백업 파일이 아닙니다.')
      if (!confirm(`설정과 마감월 ${j.months.length}개를 복원합니다. 같은 마감월은 백업 내용으로 바뀝니다. 계속할까요?`)) return
      await db.saveSettings(normalizeSettings(j.settings))
      for (const m of j.months as MonthRecord[]) await db.saveMonth(m)
      await ctx.reload()
      ctx.toast('전체 백업을 복원했습니다.')
    } catch (e) {
      alert('복원 실패: ' + (e instanceof Error ? e.message : e))
    }
  }

  return (
    <Section title="6. 백업 · 복원" desc="설정만 따로, 또는 설정+모든 마감월을 JSON 파일로 저장해 둘 수 있습니다. 다른 PC나 브라우저로 옮길 때도 이 파일을 쓰세요.">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => downloadJson({ app: 'cost-close', kind: 'settings', version: 1, settings: ctx.settings }, `공수마감_설정_${today}.json`)}>⬇️ 설정 백업</Button>
        <Button onClick={() => settingsFile.current?.click()}>⬆️ 설정 복원</Button>
        <span className="mx-2 border-l border-line" />
        <Button
          onClick={async () => {
            const months = await db.loadAllMonths()
            downloadJson({ app: 'cost-close', kind: 'full', version: 1, exportedAt: new Date().toISOString(), settings: ctx.settings, months }, `공수마감_전체백업_${today}.json`)
          }}
        >
          ⬇️ 전체 백업 (설정+마감월)
        </Button>
        <Button onClick={() => allFile.current?.click()}>⬆️ 전체 복원</Button>
        <span className="mx-2 border-l border-line" />
        <Button
          variant="danger"
          onClick={() => confirm('설정을 처음 상태(기본값)로 되돌릴까요? 마감월 자료는 그대로입니다.') && ctx.setSettings(defaultSettings())}
        >
          설정 초기화
        </Button>
      </div>
      <input ref={settingsFile} type="file" accept=".json" className="hidden" onChange={(e) => (importSettings(e.target.files?.[0]), (e.target.value = ''))} />
      <input ref={allFile} type="file" accept=".json" className="hidden" onChange={(e) => (importAll(e.target.files?.[0]), (e.target.value = ''))} />
      <p className="mt-2 text-xs text-ink-faint">⚠️ 전체 백업 파일에는 공수 자료가 들어 있으니 회사 보안 규정에 맞는 곳에만 보관하세요.</p>
    </Section>
  )
}
