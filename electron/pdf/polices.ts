import fs from 'node:fs'
import path from 'node:path'

export const POLICE_PAR_DEFAUT = 'Roboto'
export const POLICE_ARABE = 'NotoNaskhArabic'

export interface PolicesPdfmake {
  [cle: string]: { normal: string; bold?: string; italics?: string; bolditalics?: string }
}

export const resoudreDossierFontes = (): string => {
  const processus = process as NodeJS.Process & { resourcesPath?: string }
  const candidates = [
    processus.resourcesPath !== undefined
      ? path.join(processus.resourcesPath, 'assets', 'fonts')
      : null,
    path.join(__dirname, 'assets', 'fonts'),
    path.join(__dirname, '..', 'assets', 'fonts'),
    path.join(__dirname, '..', '..', 'assets', 'fonts'),
  ].filter((candidat): candidat is string => candidat !== null)

  const dossier = candidates.find((candidat) => fs.existsSync(candidat))
  if (dossier === undefined) {
    throw new Error(`Dossier de polices introuvable. Chemins essayés : ${candidates.join(', ')}`)
  }
  return dossier
}

let policesChargees: PolicesPdfmake | null = null

export const chargerPolices = (): PolicesPdfmake => {
  if (policesChargees !== null) return policesChargees

  const dossierPolices = resoudreDossierFontes()
  const nomFichier: Record<string, string> = {
    'Roboto': 'Roboto-Regular.ttf',
    'Roboto bold': 'Roboto-Medium.ttf',
    'NotoNaskhArabic': 'NotoNaskhArabic-Regular.ttf',
  }

  for (const [nom, fichier] of Object.entries(nomFichier)) {
    const chemin = path.join(dossierPolices, fichier)
    if (!fs.existsSync(chemin)) {
      throw new Error(`Police "${nom}" introuvable : ${chemin}`)
    }
  }

  policesChargees = {
    Roboto: {
      normal: path.join(dossierPolices, 'Roboto-Regular.ttf'),
      bold: path.join(dossierPolices, 'Roboto-Medium.ttf'),
    },
    NotoNaskhArabic: { normal: path.join(dossierPolices, 'NotoNaskhArabic-Regular.ttf') },
  }
  return policesChargees
}