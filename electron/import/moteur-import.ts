import type { Base } from '../db/connexion'
import type { LigneExcel } from '../excel/lecteur-excel'

export type TypeImport = 'CLIENTS' | 'PRODUITS'

export interface DefinitionImport {
  type: TypeImport
  correspondances: Map<string, string>
}

export interface ErreurImport {
  ligne: number
  colonne: string
  valeur: unknown
  erreur: string
}

export interface RapportImport {
  totalLignes: number
  lignesImportees: number
  lignesIgnorees: number
  erreurs: ErreurImport[]
  succes: boolean
  messageErreurTechnique?: string
}

export interface LigneImportee {
  donnees: Record<string, unknown>
  valide: boolean
  erreurs: ErreurImport[]
}

const TYPES_CLIENTS_VALIDES = new Set(['EPE_SPA', 'SARL', 'EURL', 'ETP', 'ETBH', 'PARTICULIER'])
const CATEGORIES_CLIENT_VALIDES = new Set(['PUBLIC', 'PRIVE'])
const MOTIF_NIF = /^\d{15}$/
const MOTIF_NIS = /^\d{15}$/

const ajouterErreur = (erreurs: ErreurImport[], ligne: number, colonne: string, valeur: unknown, erreur: string): void => {
  erreurs.push({ ligne, colonne, valeur, erreur })
}

export const validerLigneClient = (
  donnees: Record<string, unknown>,
): { valide: boolean; erreurs: ErreurImport[]; client: Record<string, unknown> | null } => {
  const erreurs: ErreurImport[] = []
  const ligne = (donnees.__numeroLigne as number) ?? 0

  const codeClient = typeof donnees.code_client === 'string' ? donnees.code_client.trim() : ''
  if (codeClient === '') {
    ajouterErreur(erreurs, ligne, 'code_client', donnees.code_client, 'code_client est obligatoire.')
  }

  const raisonSociale = typeof donnees.raison_sociale === 'string' ? donnees.raison_sociale.trim() : ''
  if (raisonSociale === '') {
    ajouterErreur(erreurs, ligne, 'raison_sociale', donnees.raison_sociale, 'raison_sociale est obligatoire.')
  }

  const typeClient = typeof donnees.type_client === 'string' ? donnees.type_client.trim().toUpperCase() : ''
  if (typeClient !== '' && !TYPES_CLIENTS_VALIDES.has(typeClient)) {
    ajouterErreur(erreurs, ligne, 'type_client', donnees.type_client, `type_client inconnu « ${typeClient} » (attendu parmi : ${[...TYPES_CLIENTS_VALIDES].join(', ')}).`)
  }

  const categorie = typeof donnees.categorie === 'string' ? donnees.categorie.trim().toUpperCase() : ''
  if (categorie !== '' && !CATEGORIES_CLIENT_VALIDES.has(categorie)) {
    ajouterErreur(erreurs, ligne, 'categorie', donnees.categorie, `categorie inconnue « ${categorie} » (attendu parmi : ${[...CATEGORIES_CLIENT_VALIDES].join(', ')}).`)
  }

  const nif = typeof donnees.nif === 'string' ? donnees.nif.trim() : ''
  if (nif !== '' && !MOTIF_NIF.test(nif)) {
    ajouterErreur(erreurs, ligne, 'nif', donnees.nif, 'nif doit contenir exactement 15 chiffres.')
  }

  const nis = typeof donnees.nis === 'string' ? donnees.nis.trim() : ''
  if (nis !== '' && !MOTIF_NIS.test(nis)) {
    ajouterErreur(erreurs, ligne, 'nis', donnees.nis, 'nis doit contenir exactement 15 chiffres.')
  }

  if (erreurs.length > 0) {
    return { valide: false, erreurs, client: null }
  }

  const client: Record<string, unknown> = {
    code_client: codeClient,
    type_client: typeClient || 'SARL',
    raison_sociale: raisonSociale,
    categorie: categorie || 'PRIVE',
    statut: typeof donnees.statut === 'string' ? donnees.statut.trim().toUpperCase() : 'PROSPECT',
    sigle: typeof donnees.sigle === 'string' ? donnees.sigle.trim() : null,
    secteur: typeof donnees.secteur === 'string' ? donnees.secteur.trim().toUpperCase() : null,
    nom_groupe: typeof donnees.nom_groupe === 'string' ? donnees.nom_groupe.trim() : null,
    adresse: typeof donnees.adresse === 'string' ? donnees.adresse.trim() : null,
    wilaya: typeof donnees.wilaya === 'string' ? donnees.wilaya.trim() : null,
    commune: typeof donnees.commune === 'string' ? donnees.commune.trim() : null,
    tel_mobile: typeof donnees.tel_mobile === 'string' ? donnees.tel_mobile.trim() : null,
    email: typeof donnees.email === 'string' ? donnees.email.trim() : null,
    nif: nif || null,
    nis: nis || null,
    rc: typeof donnees.rc === 'string' ? donnees.rc.trim() : null,
    mode_reglement_prefere: typeof donnees.mode_reglement_prefere === 'string' ? donnees.mode_reglement_prefere.trim().toUpperCase() : null,
    plafond_credit_centimes: typeof donnees.plafond_credit_centimes === 'number' ? donnees.plafond_credit_centimes : null,
  }

  return { valide: true, erreurs: [], client }
}

export const validerLigneProduit = (
  donnees: Record<string, unknown>,
): { valide: boolean; erreurs: ErreurImport[]; produit: Record<string, unknown> | null } => {
  const erreurs: ErreurImport[] = []
  const ligne = (donnees.__numeroLigne as number) ?? 0

  const codeProduit = typeof donnees.code_produit === 'string' ? donnees.code_produit.trim() : ''
  if (codeProduit === '') {
    ajouterErreur(erreurs, ligne, 'code_produit', donnees.code_produit, 'code_produit est obligatoire.')
  }

  const libelle = typeof donnees.libelle === 'string' ? donnees.libelle.trim() : ''
  if (libelle === '') {
    ajouterErreur(erreurs, ligne, 'libelle', donnees.libelle, 'libelle est obligatoire.')
  }

  const familleIdRaw = donnees.famille_id
  const familleId = typeof familleIdRaw === 'number' ? Math.trunc(familleIdRaw) : parseInt(String(familleIdRaw ?? ''), 10)
  if (Number.isNaN(familleId) || familleId < 1) {
    ajouterErreur(erreurs, ligne, 'famille_id', donnees.famille_id, 'famille_id doit être un entier strictement positif.')
  }

  if (erreurs.length > 0) {
    return { valide: false, erreurs, produit: null }
  }

  const produit: Record<string, unknown> = {
    code_produit: codeProduit,
    libelle,
    famille_id: familleId,
    sous_famille_id: typeof donnees.sous_famille_id === 'number' ? donnees.sous_famille_id : null,
    unite: typeof donnees.unite === 'string' ? donnees.unite.trim().toUpperCase() : 'U',
    pu_reference_centimes: typeof donnees.pu_reference_centimes === 'number' ? donnees.pu_reference_centimes : 0,
    type_tarification: typeof donnees.type_tarification === 'string' ? donnees.type_tarification.trim().toUpperCase() : 'FIXE',
  }

  return { valide: true, erreurs: [], produit }
}

export const detecterDoublons = <T extends { code_client?: string; code_produit?: string }>(
  lignes: T[],
  type: 'CLIENTS' | 'PRODUITS',
  base: Base,
): { doublons: number; indicesDoublons: Set<number> } => {
  const indicesDoublons = new Set<number>()
  const vues = base.transaction(() => {
    if (type === 'CLIENTS') {
      const existants = base
        .prepare('SELECT code_client FROM clients WHERE supprime_le IS NULL')
        .all() as { code_client: string }[]
      return existants.map((e) => e.code_client)
    }
    const existants = base
      .prepare('SELECT code_produit FROM produits WHERE supprime_le IS NULL')
      .all() as { code_produit: string }[]
    return existants.map((e) => e.code_produit)
  })()

  const clesVues = new Set<string>(vues)
  const clesBatch = new Map<string, number>()

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i]
    const cle = type === 'CLIENTS' ? (ligne.code_client ?? '') : (ligne.code_produit ?? '')
    if (cle === '') continue

    if (clesVues.has(cle) || clesBatch.has(cle)) {
      indicesDoublons.add(i)
    } else {
      clesBatch.set(cle, i)
    }
  }

  return { doublons: indicesDoublons.size, indicesDoublons }
}

const projeterChamps = (
  donnees: Record<string, unknown>,
  correspondances: Map<string, string>,
): Record<string, unknown> => {
  const resultat: Record<string, unknown> = {}
  for (const [cle, valeur] of Object.entries(donnees)) {
    if (cle.startsWith('__')) continue
    const champCible = correspondances.get(cle)
    if (champCible !== undefined) {
      resultat[champCible] = valeur
    }
  }
  return resultat
}

export const executerImport = (
  base: Base,
  definition: DefinitionImport,
  lignes: LigneExcel[],
  creerFn: (base: Base, donnees: Record<string, unknown>) => number,
): RapportImport => {
  const rapport: RapportImport = {
    totalLignes: lignes.length,
    lignesImportees: 0,
    lignesIgnorees: 0,
    erreurs: [],
    succes: true,
  }

  const lignesValidees: { index: number; donnees: Record<string, unknown> }[] = []

  for (const ligne of lignes) {
    const donneesProjetees = projeterChamps(ligne.valeurs, definition.correspondances)
    donneesProjetees.__numeroLigne = ligne.numeroLigne

    let valide = false
    let erreurs: ErreurImport[] = []
    let donneesValidees: Record<string, unknown> | null = null

    if (definition.type === 'CLIENTS') {
      const resultat = validerLigneClient(donneesProjetees)
      valide = resultat.valide
      erreurs = resultat.erreurs
      donneesValidees = resultat.client
    } else {
      const resultat = validerLigneProduit(donneesProjetees)
      valide = resultat.valide
      erreurs = resultat.erreurs
      donneesValidees = resultat.produit
    }

    if (!valide) {
      rapport.erreurs.push(...erreurs)
      rapport.lignesIgnorees += 1
      continue
    }

    const donneesFinales = donneesValidees ?? donneesProjetees
    lignesValidees.push({ index: ligne.numeroLigne, donnees: donneesFinales })
  }

  const donneesClees = lignesValidees.map((l) => l.donnees as unknown as { code_client?: string; code_produit?: string })
  const doublons = detecterDoublons(donneesClees, definition.type, base)

  for (const indice of doublons.indicesDoublons) {
    const ligne = lignesValidees[indice]
    if (ligne !== undefined) {
      const cle = definition.type === 'CLIENTS' ? 'code_client' : 'code_produit'
      ajouterErreur(rapport.erreurs, ligne.index, cle, ligne.donnees[cle], 'doublon détecté (clé déjà existante).')
      rapport.lignesIgnorees += 1
    }
  }

  const lignesAInserer = lignesValidees.filter((_, i) => !doublons.indicesDoublons.has(i))

  try {
    base.transaction(() => {
      for (const ligne of lignesAInserer) {
        const donneesInsertion = { ...ligne.donnees }
        delete donneesInsertion.__numeroLigne
        creerFn(base, donneesInsertion)
        rapport.lignesImportees += 1
      }
    })()
  } catch (erreur) {
    rapport.succes = false
    rapport.messageErreurTechnique = erreur instanceof Error ? erreur.message : String(erreur)
  }

  return rapport
}
