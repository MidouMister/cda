import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
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

const copierAssetsSql = (): Plugin => ({
  name: 'egto:copier-assets-sql',
  apply: 'build',
  writeBundle(outputOptions) {
    const dossierSortie = outputOptions.dir ?? dirname(outputOptions.file!)
    const dossierSource = join(process.cwd(), 'electron', 'db')
    const dossierCible = dossierSortie
    cpSync(join(dossierSource, 'schema.sql'), join(dossierCible, 'schema.sql'))
    mkdirSync(join(dossierCible, 'migrations'), { recursive: true })
    cpSync(join(dossierSource, 'migrations'), join(dossierCible, 'migrations'), { recursive: true })
    cpSync(
      join(process.cwd(), 'electron', 'pdf', 'polices'),
      join(dossierCible, 'polices'),
      { recursive: true },
    )
  },
})

export default defineConfig({
  main: {
    plugins: [copierAssetsSql(), externalizeDepsPlugin({ exclude: ['pdfmake'] })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts'),
          'egto-admin-reset': resolve(__dirname, 'electron/securite/egto-admin-reset.ts'),
        },
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
