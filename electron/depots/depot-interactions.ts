import type { Base } from '../db/connexion'

export type TypeInteraction = 'APPEL' | 'VISITE' | 'RELANCE' | 'AUTRE'

export interface Interaction {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  client_id: number
  date_interaction: string
  type_interaction: TypeInteraction
  note: string | null
}

export interface DonneesCreationInteraction {
  client_id: number
  date_interaction: string
  type_interaction: TypeInteraction
  note?: string | null
}

export const TYPES_INTERACTION: TypeInteraction[] = ['APPEL', 'VISITE', 'RELANCE', 'AUTRE']

export const creerInteraction = (base: Base, donnees: DonneesCreationInteraction): number => {
  if (!TYPES_INTERACTION.includes(donnees.type_interaction)) {
    throw new Error(
      `« type_interaction » : valeur inconnue « ${donnees.type_interaction} » (attendu parmi : ${TYPES_INTERACTION.join(', ')}).`,
    )
  }
  const resultat = base
    .prepare(
      `INSERT INTO interactions (client_id, date_interaction, type_interaction, note)
       VALUES (?, ?, ?, ?)`,
    )
    .run(
      donnees.client_id,
      donnees.date_interaction,
      donnees.type_interaction,
      donnees.note ?? null,
    )
  return Number(resultat.lastInsertRowid)
}

export const lireInteractionParId = (base: Base, id: number): Interaction | null => {
  const ligne = base
    .prepare('SELECT * FROM interactions WHERE id = ? AND supprime_le IS NULL')
    .get(id) as Interaction | undefined
  return ligne ?? null
}

export const listerInteractionsParClient = (base: Base, clientId: number): Interaction[] => {
  return base
    .prepare(
      'SELECT * FROM interactions WHERE client_id = ? AND supprime_le IS NULL ORDER BY date_interaction DESC',
    )
    .all(clientId) as Interaction[]
}

export const supprimerLogiquementInteraction = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE interactions
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
