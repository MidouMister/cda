import ExcelJS from 'exceljs'

export interface ColonneImportee {
  entete: string
  index: number
}

export interface LigneExcel {
  numeroLigne: number
  valeurs: Record<string, unknown>
}

export interface ResultatLectureExcel {
  colonnes: ColonneImportee[]
  lignes: LigneExcel[]
  lignesIgnorees: number
}

const estCelluleVide = (cellule: ExcelJS.Cell): boolean => {
  const valeur = cellule.value
  return valeur === null || valeur === undefined || valeur === ''
}

const normaliserChaine = (valeur: string): string =>
  valeur
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

export const correspondreColonnes = (
  entetesExcel: string[],
  entetesAttendus: string[],
): Map<string, string> => {
  const correspondance = new Map<string, string>()

  for (const attendu of entetesAttendus) {
    const normaliseAttendu = normaliserChaine(attendu)

    let trouve = entetesExcel.find((excel) => excel.trim().toLowerCase() === attendu.trim().toLowerCase())
    if (trouve !== undefined) {
      correspondance.set(trouve, attendu)
      continue
    }

    trouve = entetesExcel.find(
      (excel) => normaliserChaine(excel) === normaliseAttendu,
    )
    if (trouve !== undefined) {
      correspondance.set(trouve, attendu)
      continue
    }

    trouve = entetesExcel.find(
      (excel) =>
        normaliserChaine(excel).includes(normaliseAttendu) ||
        normaliseAttendu.includes(normaliserChaine(excel)),
    )
    if (trouve !== undefined) {
      correspondance.set(trouve, attendu)
    }
  }

  return correspondance
}

export const nettoyerValeur = <V>(valeur: unknown, typeAttendu: 'texte' | 'nombre' | 'entier' | 'date'): V => {
  if (valeur === null || valeur === undefined || valeur === '') {
    switch (typeAttendu) {
      case 'texte':
        return '' as V
      case 'nombre':
        return 0 as V
      case 'entier':
        return 0 as V
      case 'date':
        return '' as V
    }
  }

  switch (typeAttendu) {
    case 'texte':
      return String(valeur).trim() as V

    case 'nombre': {
      if (typeof valeur === 'number') return valeur as V
      const nombre = parseFloat(String(valeur))
      return (Number.isNaN(nombre) ? 0 : nombre) as V
    }

    case 'entier': {
      if (typeof valeur === 'number') return Math.trunc(valeur) as V
      const entier = parseInt(String(valeur), 10)
      return (Number.isNaN(entier) ? 0 : entier) as V
    }

    case 'date': {
      if (typeof valeur === 'number') {
        const epoch = new Date(1899, 11, 30)
        const date = new Date(epoch.getTime() + valeur * 86400000)
        return date.toISOString().slice(0, 10) as V
      }
      const chaine = String(valeur).trim()
      if (/^\d{4}-\d{2}-\d{2}/.test(chaine)) {
        return chaine.slice(0, 10) as V
      }
      const correspondanceFR = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(chaine)
      if (correspondanceFR !== null) {
        return `${correspondanceFR[3]}-${correspondanceFR[2]}-${correspondanceFR[1]}` as V
      }
      const dateParsee = new Date(chaine)
      if (!Number.isNaN(dateParsee.getTime())) {
        return dateParsee.toISOString().slice(0, 10) as V
      }
      return '' as V
    }
  }
}

export const lireExcel = async (cheminFichier: string): Promise<ResultatLectureExcel> => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(cheminFichier)
  const feuille = workbook.worksheets[0]
  if (feuille === undefined) {
    return { colonnes: [], lignes: [], lignesIgnorees: 0 }
  }

  const row1 = feuille.getRow(1)
  const colonnes: ColonneImportee[] = []
  row1.eachCell({ includeEmpty: false }, (cellule, numeroColonne) => {
    const valeur = cellule.value
    let entete: string
    if (valeur !== null && typeof valeur === 'object' && 'richText' in valeur) {
      const richText = (valeur as ExcelJS.CellRichTextValue).richText
      entete = richText.map((r) => r.text).join('')
    } else if (valeur !== null && typeof valeur === 'object') {
      const obj = valeur as unknown as Record<string, unknown>
      entete = typeof obj.text === 'string' ? obj.text : String(valeur)
    } else {
      entete = String(valeur ?? '')
    }
    colonnes.push({ entete: entete.trim(), index: numeroColonne - 1 })
  })

  const lignes: LigneExcel[] = []
  let lignesIgnorees = 0

  feuille.eachRow((row, numeroRow) => {
    if (numeroRow <= 1) return

    const toutesVides = colonnes.every((colonne) => {
      const cellule = row.getCell(colonne.index + 1)
      return estCelluleVide(cellule)
    })

    if (toutesVides) {
      lignesIgnorees += 1
      return
    }

    const valeurs: Record<string, unknown> = {}
    for (const colonne of colonnes) {
      const cellule = row.getCell(colonne.index + 1)
      valeurs[colonne.entete] = cellule.value ?? null
    }

    lignes.push({ numeroLigne: numeroRow, valeurs })
  })

  return { colonnes, lignes, lignesIgnorees }
}
