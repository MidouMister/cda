import type { Base } from '../db/connexion'

export interface SousFamille {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  famille_id: number
  code: string
  libelle: string
}

export interface DonneesCreationSousFamille {
  famille_id: number
  code: string
  libelle: string
}

const verifierObligatoire = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new TypeError(`« ${libelle} » est obligatoire.`)
  }
}

export const creerSousFamille = (base: Base, donnees: DonneesCreationSousFamille): number => {
  verifierObligatoire(donnees.code, 'code')
  verifierObligatoire(donnees.libelle, 'libelle')
  const resultat = base
    .prepare(
      `INSERT INTO sous_familles (famille_id, code, libelle)
       VALUES (?, ?, ?)`,
    )
    .run(donnees.famille_id, donnees.code, donnees.libelle)
  return Number(resultat.lastInsertRowid)
}

export const lireSousFamilleParId = (base: Base, id: number): SousFamille | null => {
  const ligne = base
    .prepare('SELECT * FROM sous_familles WHERE id = ? AND supprime_le IS NULL')
    .get(id) as SousFamille | undefined
  return ligne ?? null
}

export const listerSousFamilles = (base: Base): SousFamille[] => {
  return base
    .prepare('SELECT * FROM sous_familles WHERE supprime_le IS NULL ORDER BY code')
    .all() as SousFamille[]
}

export const listerSousFamillesParFamille = (base: Base, familleId: number): SousFamille[] => {
  return base
    .prepare(
      'SELECT * FROM sous_familles WHERE famille_id = ? AND supprime_le IS NULL ORDER BY code',
    )
    .all(familleId) as SousFamille[]
}

export const supprimerLogiquementSousFamille = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE sous_familles
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
