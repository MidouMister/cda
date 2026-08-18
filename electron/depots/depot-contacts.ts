import type { Base } from '../db/connexion'

export interface Contact {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  client_id: number
  nom: string
  fonction: string | null
  telephone: string | null
  email: string | null
  contact_principal: 0 | 1
}

export interface DonneesCreationContact {
  client_id: number
  nom: string
  fonction?: string | null
  telephone?: string | null
  email?: string | null
  contact_principal?: 0 | 1
}

const verifierObligatoire = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new TypeError(`« ${libelle} » est obligatoire.`)
  }
}

export const creerContact = (base: Base, donnees: DonneesCreationContact): number => {
  verifierObligatoire(donnees.nom, 'nom')
  const resultat = base
    .prepare(
      `INSERT INTO contacts (client_id, nom, fonction, telephone, email, contact_principal)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.client_id,
      donnees.nom,
      donnees.fonction ?? null,
      donnees.telephone ?? null,
      donnees.email ?? null,
      donnees.contact_principal ?? 0,
    )
  return Number(resultat.lastInsertRowid)
}

export const lireContactParId = (base: Base, id: number): Contact | null => {
  const ligne = base
    .prepare('SELECT * FROM contacts WHERE id = ? AND supprime_le IS NULL')
    .get(id) as Contact | undefined
  return ligne ?? null
}

export const listerContactsParClient = (base: Base, clientId: number): Contact[] => {
  return base
    .prepare(
      'SELECT * FROM contacts WHERE client_id = ? AND supprime_le IS NULL ORDER BY contact_principal DESC, nom',
    )
    .all(clientId) as Contact[]
}

export const modifierContact = (
  base: Base,
  id: number,
  donneesPartielles: Partial<DonneesCreationContact>,
): boolean => {
  const existant = lireContactParId(base, id)
  if (existant === null) {
    return false
  }
  const champs: string[] = []
  const valeurs: unknown[] = []

  if (donneesPartielles.nom !== undefined) {
    verifierObligatoire(donneesPartielles.nom, 'nom')
    champs.push('nom = ?')
    valeurs.push(donneesPartielles.nom)
  }
  if (donneesPartielles.fonction !== undefined) {
    champs.push('fonction = ?')
    valeurs.push(donneesPartielles.fonction ?? null)
  }
  if (donneesPartielles.telephone !== undefined) {
    champs.push('telephone = ?')
    valeurs.push(donneesPartielles.telephone ?? null)
  }
  if (donneesPartielles.email !== undefined) {
    champs.push('email = ?')
    valeurs.push(donneesPartielles.email ?? null)
  }
  if (donneesPartielles.contact_principal !== undefined) {
    champs.push('contact_principal = ?')
    valeurs.push(donneesPartielles.contact_principal)
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE contacts SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementContact = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE contacts
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
