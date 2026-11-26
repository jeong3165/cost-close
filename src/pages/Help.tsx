import { Callout, PageTitle, Section } from '../components/ui'

export default function Help() {
  return (
    <div className="max-w-3xl leading-relaxed">
      <PageTitle icon="❓" title="사용 방법" />

      <Section title="매달 마감 순서">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>ERP에서 <b>프로젝트별공수집계조회(S)</b> 엑셀을 내려받습니다.</li>
          <li><b>🏠 마감월 · 파일 올리기</b>에서 파일을 올리고, 마감월을 확인한 뒤 저장합니다. (파일 이름에 20261126 같은 날짜가 있으면 자동으로 찾아요)</li>
          <li><b>🔍 검증</b>에서 TOTAL 대조·번호 형식·작은 MH·급변 항목을 확인합니다.</li>
          <li><b>📋 ERP 등록 목록</b>에서 부서(또는 원가풀)마다 <b>번호 복사</b> → ERP 원가풀 &gt; 부서 하위에 붙여넣기(Ctrl+V) → <b>등록 완료 체크</b>.</li>
          <li>지난달과 비교해 <span className="text-[#0f7b6c]">새 번호</span>는 추가 등록, <span className="text-[#e03e3e]">빠진 번호</span>는 ERP에서 삭제할지 검토합니다.</li>
          <li>필요하면 집계표·등록 목록·제외 목록을 엑셀로 내려받아 보관합니다.</li>
          <li>마감이 끝나면 <b>마감월 목록에서 '확정'</b>을 눌러 잠급니다. 그 뒤로 규칙을 바꿔도 그 달 결과는 바뀌지 않습니다.</li>
        </ol>
      </Section>

      <Section title="바탕화면에서 여는 방법 (설치 없이)">
        {location.protocol !== 'file:' && (
          <div className="mb-3">
            <a href="./cost-close-app.html" download="공수마감도우미.html" className="inline-flex rounded-md bg-[#2383e2] px-3 py-1.5 text-sm text-white hover:bg-[#1a6fc4]">
              ⬇️ 바탕화면용 파일 받기 (공수마감도우미.html)
            </a>
            <p className="mt-1 text-xs text-ink-faint">받은 파일을 바탕화면으로 옮긴 뒤 더블클릭하면 됩니다. 버튼이 안 되면 아래 방법을 쓰세요.</p>
          </div>
        )}
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>인터넷 주소(GitHub Pages)로 이 앱을 연 상태에서 <b>Ctrl + S</b>(다른 이름으로 저장)를 누릅니다.</li>
          <li>파일 형식은 <b>"웹페이지, HTML만"</b>을 고르고 바탕화면에 저장합니다. (파일 하나에 앱 전체가 들어 있어요)</li>
          <li>다음부터는 바탕화면의 파일을 <b>더블클릭</b>하면 Chrome/Edge에서 열립니다. 인터넷이 없어도 동작합니다.</li>
        </ol>
        <div className="mt-3">
          <Callout icon="⚠️" tone="yellow">
            저장된 자료는 <b>'어느 주소로 열었는지'</b>에 따라 따로 보관됩니다. 인터넷 주소로 연 앱과 바탕화면 파일로 연 앱은 서로 자료가 보이지 않으니, 한 가지 방법으로 꾸준히 쓰시고,
            옮길 때는 <b>설정 → 전체 백업/복원</b>을 쓰세요. 바탕화면 파일은 위치·이름을 바꾸지 않는 것이 안전합니다.
          </Callout>
        </div>
      </Section>

      <Section title="규칙 요약">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><b>제외 규칙</b>: 프로젝트명·번호에 키워드(기본 "공통", "국책")가 들어가면 제외. 번호를 직접 제외하거나, 예외로 포함할 수 있어요. (예외 포함이 가장 우선)</li>
          <li><b>부서 묶음</b>: 제조통합 = 제조1팀 + 제조2팀처럼 가상 부서를 만들어 행을 추가합니다. 원래 부서도 그대로 남습니다.</li>
          <li><b>원가풀</b>: ERP의 원가풀 → 부서 구조를 등록하면 그 순서대로 등록 목록을 볼 수 있습니다.</li>
          <li>엑셀의 부서 열은 <b>이름으로</b> 읽기 때문에 열 순서가 바뀌어도 괜찮습니다. 머리글('프로젝트번호' 칸이 있는 행)과 TOTAL 행은 자동으로 찾습니다.</li>
        </ul>
      </Section>

      <Section title="보안">
        <Callout icon="🔒">
          이 앱은 인터넷으로 아무것도 보내지 않습니다. 올린 엑셀은 이 브라우저의 저장소(IndexedDB)에만 저장되며, AI 기능도 없습니다.
        </Callout>
      </Section>
    </div>
  )
}
