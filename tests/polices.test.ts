import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { PolicesPdfmake } from '../electron/pdf/polices'

const DOSSIER_FONTES_DEPOT = join(__dirname, '..', 'assets', 'fonts')

type ProcessusAvecResources = Omit<NodeJS.Process, 'resourcesPath'> & { resourcesPath?: string }

const chargerModule = async (): Promise<{
  POLICE_PAR_DEFAUT: string
  POLICE_ARABE: string
  chargerPolices: () => PolicesPdfmake
  resoudreDossierFontes: () => string
}> => {
  vi.resetModules()
  const module = await import('../electron/pdf/polices')
  return {
    POLICE_PAR_DEFAUT: module.POLICE_PAR_DEFAUT,
    POLICE_ARABE: module.POLICE_ARABE,
    chargerPolices: module.chargerPolices,
    resoudreDossierFontes: module.resoudreDossierFontes,
  }
}

describe('polices PDF — résolution du dossier de fontes', () => {
  it("résout le dossier assets/fonts à la racine du dépôt (exécution Vitest)", async () => {
    const { resoudreDossierFontes } = await chargerModule()
    expect(resoudreDossierFontes()).toBe(DOSSIER_FONTES_DEPOT)
    expect(existsSync(DOSSIER_FONTES_DEPOT)).toBe(true)
  })

  it('privilégie process.resourcesPath/assets/fonts lorsqu’il contient les fontes', async () => {
    const dossierTemp = mkdtempSync(join(tmpdir(), 'egto-polices-'))
    const dossierRessources = join(dossierTemp, 'ressources')
    const dossierFontes = join(dossierRessources, 'assets', 'fonts')
    mkdirSync(dossierFontes, { recursive: true })
    for (const fichier of ['Roboto-Regular.ttf', 'Roboto-Medium.ttf', 'NotoNaskhArabic-Regular.ttf']) {
      writeFileSync(join(dossierFontes, fichier), '')
    }

    const processus = process as ProcessusAvecResources
    const ancien = processus.resourcesPath
    processus.resourcesPath = dossierRessources

    try {
      const { resoudreDossierFontes, chargerPolices, POLICE_PAR_DEFAUT, POLICE_ARABE } =
        await chargerModule()
      expect(resoudreDossierFontes()).toBe(dossierFontes)
      const polices = chargerPolices()
      expect(polices[POLICE_PAR_DEFAUT].normal).toBe(join(dossierFontes, 'Roboto-Regular.ttf'))
      expect(polices[POLICE_PAR_DEFAUT].bold).toBe(join(dossierFontes, 'Roboto-Medium.ttf'))
      expect(polices[POLICE_ARABE].normal).toBe(join(dossierFontes, 'NotoNaskhArabic-Regular.ttf'))
    } finally {
      if (ancien === undefined) {
        delete processus.resourcesPath
      } else {
        processus.resourcesPath = ancien
      }
      rmSync(dossierTemp, { recursive: true, force: true })
    }
  })

  it('chargerPolices retourne les trois entrées (Roboto normal/bold, NotoNaskhArabic)', async () => {
    const { chargerPolices, POLICE_PAR_DEFAUT, POLICE_ARABE } = await chargerModule()
    const polices = chargerPolices()
    expect(polices[POLICE_PAR_DEFAUT]).toEqual({
      normal: join(DOSSIER_FONTES_DEPOT, 'Roboto-Regular.ttf'),
      bold: join(DOSSIER_FONTES_DEPOT, 'Roboto-Medium.ttf'),
    })
    expect(polices[POLICE_ARABE]).toEqual({
      normal: join(DOSSIER_FONTES_DEPOT, 'NotoNaskhArabic-Regular.ttf'),
    })
    expect(Object.keys(polices)).toEqual([POLICE_PAR_DEFAUT, POLICE_ARABE])
  })
})