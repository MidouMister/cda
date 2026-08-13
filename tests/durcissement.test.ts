import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const racineProjet = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const lire = (chemin: string): string => readFileSync(join(racineProjet, chemin), 'utf8')

describe('Durcissement du renderer', () => {
  const sourceMain = lire('electron/main.ts')

  it('active contextIsolation', () => {
    expect(sourceMain).toMatch(/contextIsolation\s*:\s*true/)
  })

  it('désactive nodeIntegration', () => {
    expect(sourceMain).toMatch(/nodeIntegration\s*:\s*false/)
  })

  it('active le sandbox du renderer', () => {
    expect(sourceMain).toMatch(/sandbox\s*:\s*true/)
  })

  it('refuse la navigation externe via will-navigate', () => {
    expect(sourceMain).toMatch(/will-navigate/)
  })

  it('refuse les fenêtres ouvertes par le contenu', () => {
    expect(sourceMain).toMatch(/setWindowOpenHandler/)
  })

  it('applique une CSP restrictive avec default-src self', () => {
    const sourceHtml = lire('index.html')
    expect(sourceHtml).toMatch(/default-src\s*'self'/)
  })
})
