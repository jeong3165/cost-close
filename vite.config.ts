import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 하나의 index.html 안에 JS/CSS를 모두 넣어서 빌드합니다.
// → GitHub Pages에서도, 바탕화면에 저장한 파일(file://)에서도 그대로 동작합니다.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
