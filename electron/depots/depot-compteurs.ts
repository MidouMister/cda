import type { Base } from '../db/connexion'
import { versCentimes } from './conversion-centimes'

export interface Compteur {
  dernierNumero: number
}

const selectionCompteur =
  `WHERE code_document = ? AND annee = ? AND COALESCE(affaire_id, 0) = COALESCE(?, 0)
    AND supprime_le IS NULL`

export const lireCompteur = (
  base: Base,
  codeDocument: string,
  annee: number,
  affaireId: number | null = null,
): Compteur | null => {
  const ligne = base
    .prepare(`SELECT dernier_numero AS dernierNumero FROM compteurs_numerotation ${selectionCompteur}`)
    .get(codeDocument, annee, affaireId) as { dernierNumero: number } | undefined
  return ligne ?? null
}

export const creerCompteur = (
  base: Base,
  codeDocument: string,
  annee: number,
  affaireId: number | null = null,
  dernierNumero = 0,
): Compteur => {
  base
    .prepare(
      `INSERT OR IGNORE INTO compteurs_numerotation (code_document, annee, affaire_id, dernier_numero)
       VALUES (?, ?, ?, ?)`,
    )
    .run(codeDocument, annee, affaireId, versCentimes(dernierNumero))
  const compteur = lireCompteur(base, codeDocument, annee, affaireId)
  if (compteur === null) {
    throw new Error(`Compteur « ${codeDocument}/${annee} » introuvable après création.`)
  }
  return compteur
}

export const incrementerCompteur = (
  base: Base,
  codeDocument: string,
  annee: number,
  affaireId: number | null = null,
): number => {
  const incrementer = base.transaction(() => {
    creerCompteur(base, codeDocument, annee, affaireId, 0)
    const resultat = base
      .prepare(
        `UPDATE compteurs_numerotation
            SET dernier_numero = dernier_numero + 1,
                modifie_le = datetime('now')
          ${selectionCompteur}`,
      )
      .run(codeDocument, annee, affaireId)
    if (resultat.changes !== 1) {
      throw new Error(`Compteur « ${codeDocument}/${annee} » introuvable avant incrément.`)
    }
    const compteur = lireCompteur(base, codeDocument, annee, affaireId)
    if (compteur === null) {
      throw new Error(`Compteur « ${codeDocument}/${annee} » introuvable après incrément.`)
    }
    return compteur.dernierNumero
  })
  return incrementer()
}
