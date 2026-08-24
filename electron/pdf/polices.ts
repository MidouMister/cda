import fs from 'node:fs'
import path from 'node:path'

const DOSSIER_POLICES = path.join(__dirname, 'polices')
const DOSSIERRoboto = path.join(
  __dirname, '..', '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto',
)

export const POLICE_PAR_DEFAUT = 'Roboto'
export const POLICE_ARABE = 'NotoNaskhArabic'

export interface PolicesPdfmake {
  [cle: string]: { normal: string; bold?: string; italics?: string; bolditalics?: string }
}

let policesChargees: PolicesPdfmake | null = null

export const chargerPolices = (): PolicesPdfmake => {
  if (policesChargees !== null) return policesChargees

  const robotoRegular = path.join(DOSSIERRoboto, 'Roboto-Regular.ttf')
  const robotoBold = path.join(DOSSIERRoboto, 'Roboto-Medium.ttf')
  const notoArabic = path.join(DOSSIER_POLICES, 'NotoNaskhArabic-Regular.ttf')

  for (const [nom, chemin] of [['Roboto', robotoRegular], ['Roboto bold', robotoBold], ['NotoNaskhArabic', notoArabic]] as const) {
    if (!fs.existsSync(chemin)) {
      throw new Error(`Police "${nom}" introuvable : ${chemin}`)
    }
  }

  policesChargees = {
    Roboto: { normal: robotoRegular, bold: robotoBold },
    NotoNaskhArabic: { normal: notoArabic },
  }
  return policesChargees
}
