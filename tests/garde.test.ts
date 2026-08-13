import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const racineProjet = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dossierDomaine = join(racineProjet, 'domaine')
const cheminEprouvette = join(dossierDomaine, '_eprouvette-garde.ts')
const cheminScript = join(racineProjet, 'scripts', 'garde-domaine.mjs')

const executeGarde = (): void => {
  execFileSync(process.execPath, [cheminScript], {
    cwd: racineProjet,
    stdio: 'pipe',
  })
}

const prepareDossierDomaine = (): void => {
  if (!existsSync(dossierDomaine)) {
    mkdirSync(dossierDomaine, { recursive: true })
  }
}

describe('Garde architecturale « domaine/ »', () => {
  it('accepte un domaine sans import externe', () => {
    prepareDossierDomaine()
    writeFileSync(cheminEprouvette, 'export const valeur = 1\n', 'utf8')
    try {
      expect(() => executeGarde()).not.toThrow()
    } finally {
      rmSync(cheminEprouvette, { force: true })
    }
  })

  it('échoue dès que domaine/ importe l’extérieur', () => {
    prepareDossierDomaine()
    writeFileSync(
      cheminEprouvette,
      "import { app } from 'electron'\n\nexport const valeur = app\n",
      'utf8',
    )
    try {
      expect(() => executeGarde()).toThrow()
    } finally {
      rmSync(cheminEprouvette, { force: true })
    }
  })
})
