# 공수 마감 도우미 (cost-close)

월 마감 때 ERP **프로젝트별공수집계조회(S)** 엑셀을 올리면, 제외·묶음 규칙을 적용해
**부서(또는 원가풀)별로 ERP에 붙여넣을 프로젝트번호 목록**을 만들어 주는 웹앱입니다.

- 설치 없이 브라우저에서 동작 (단일 HTML 파일 → 바탕화면에서 더블클릭으로도 실행)
- 데이터는 **브라우저(IndexedDB)에만 저장**, 외부 전송 없음, AI 기능 없음
- 주요 화면: 마감월·파일 올리기 / ERP 등록 목록(번호 복사·등록 체크·전월 비교) / 검증 / 집계표 / 제외 목록 / 설정(규칙·백업)

## 사용하기

- 인터넷 주소: `https://jeong3165.github.io/cost-close/`
- 바탕화면용: 위 주소의 **❓ 사용 방법** 화면에서 "바탕화면용 파일 받기" → 더블클릭

## 보안 규칙 (중요)

- 이 저장소는 **공개 저장소**입니다. **실제 회사 엑셀은 절대 커밋하지 않습니다.**
  (`.gitignore`가 `*.xlsx`를 막고, `demo/demo_*.xlsx` 가짜 데모 파일만 허용)
- `demo/` 폴더의 엑셀은 `npm run demo`로 만든 **가짜 값**입니다.

## 개발자용

```bash
npm install
npm run dev      # 개발 서버
npm test         # 테스트
npm run build    # dist/index.html 하나로 빌드 (JS/CSS 모두 포함)
npm run demo     # 가짜 데모 엑셀 다시 만들기
```

`main` 브랜치에 올리면 GitHub Actions가 자동으로 GitHub Pages에 배포합니다.
기술: Vite + React + TypeScript + Tailwind CSS, SheetJS(xlsx), idb-keyval, vite-plugin-singlefile
