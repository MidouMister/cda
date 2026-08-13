import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const CSP_PRODUCTION = "default-src 'self'"

const durcirCspEnProduction = (): Plugin => ({
  name: 'egto:csp-production',
  apply: 'build',
  transformIndexHtml(html: string) {
    return html.replace(
      /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*\/?>/i,
      `<meta http-equiv="Content-Security-Policy" content="${CSP_PRODUCTION}" />`,
    )
  },
})

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload.ts') },
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react(), durcirCspEnProduction()],
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'index.html') },
      },
    },
  },
})
