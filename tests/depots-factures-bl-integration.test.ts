import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import { creerClient } from '../electron/depots/depot-clients'
import {
  creerFacture,
  lireFactureParId,
  listerFactures,
  modifierFacture,
  supprimerLogiquementFacture,
  validerFacture,
  creerLigneFacture,
  lireLignesFacture,
  modifierLigneFacture,
  supprimerLigneFacture,
  creerAvoir,
  listerAvoirs,
} from '../electron/depots/depot-factures'
import type { DonneesCreationFactureDepot } from '../electron/depots/depot-factures'
import { machineEtatsFacture, transiter } from '../domaine/machines-etats'
import {
  creerBonLivraison,
  lireBonLivraisonParId,
  listerBonsLivraison,
  modifierBonLivraison,
  supprimerLogiquementBonLivraison,
  creerLigneBonLivraison,
  listerLignesBonLivraison,
  genererFactureDepuisBons,
} from '../electron/depots/depot-bons-livraison'
import { NumeroDocument } from '../domaine/identites'
import { formaterNumero } from '../domaine/numerotation'
import { versCentimes } from '../electron/depots/conversion-centimes'
import { creerAffaire } from '../electron/depots/depot-affaires'
import type { Base } from '../electron/db/connexion'

const CLE_TEST = 'cle-test-factures-bl-egto-j5'
const CHEMIN_ESSAI = join(tmpdir(), `egto-factures-bl-${randomUUID()}.db`)

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

let idClient: number
let idAffaire: number
let compteurBL = 0

const prochainNumeroBL = (): string => {
  compteurBL += 1
  return NumeroDocument.depuisValeur(formaterNumero('BL', 2026, compteurBL)).valeur
}

const creerFactureBase = (base: Base, overrides?: Partial<DonneesCreationFactureDepot>): number =>
  creerFacture(base, {
    statut: 'BROUILLON',
    type_document: 'FA',
    date_facture: '2026-08-20',
    client_id: idClient,
    ...overrides,
  })

const ajouterLigne = (base: Base, factureId: number, overrides?: Record<string, unknown>): number =>
  creerLigneFacture(base, {
    facture_id: factureId,
    designation: 'Prestation test',
    unite: 'U',
    quantite_milliemes: 1000,
    pu_ht_centimes: 100000,
    remise_bps: 0,
    rabais_marche_bps: 0,
    ...overrides,
  })
describe('Dépôts factures + BL — intégration sur base chiffrée', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_TEST)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
    const base = obtenirBase()
    idClient = creerClient(base, {
      code_client: 'CLI-FAC-01',
      type_client: 'SARL',
      raison_sociale: 'Client Facturation',
      categorie: 'PRIVE',
    })
    const insertion = base
      .prepare("INSERT INTO affaires (reference, type_affaire, client_id) VALUES (?, 'CONTRAT_PRIVE', ?)")
      .run('AFG-2026-0001', idClient)
    idAffaire = Number(insertion.lastInsertRowid)
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  describe('Factures — CRUD', () => {
    it('crée une facture BROUILLON et la relit', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      const facture = lireFactureParId(base, id)
      expect(facture).not.toBeNull()
      expect(facture?.statut).toBe('BROUILLON')
      expect(facture?.type_document).toBe('FA')
      expect(facture?.client_id).toBe(idClient)
      expect(facture?.date_facture).toBe('2026-08-20')
      expect(facture?.supprime_le).toBeNull()
    })

    it('liste les factures avec filtres', () => {
      const base = obtenirBase()
      const toutes = listerFactures(base)
      expect(toutes.length).toBeGreaterThanOrEqual(1)
      const parStatut = listerFactures(base, { statut: 'BROUILLON' })
      expect(parStatut.length).toBeGreaterThanOrEqual(1)
      expect(parStatut.every((f) => f.statut === 'BROUILLON')).toBe(true)
    })

    it('modifie une facture BROUILLON', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base, { adresse_facturation: 'Ancienne adresse' })
      const ok = modifierFacture(base, id, { adresse_facturation: 'Nouvelle adresse Oran' })
      expect(ok).toBe(true)
      const relue = lireFactureParId(base, id)
      expect(relue?.adresse_facturation).toBe('Nouvelle adresse Oran')
    })

    it('supprime logiquement une facture BROUILLON', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      expect(supprimerLogiquementFacture(base, id)).toBe(true)
      expect(lireFactureParId(base, id)).toBeNull()
    })

    it('refuse la suppression d une facture non BROUILLON', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      ajouterLigne(base, id)
      validerFacture(base, id)
      expect(() => supprimerLogiquementFacture(base, id)).toThrow(/BROUILLON/)
    })
  })

  describe('Factures — Lignes', () => {
    it('crée des lignes et les relit avec montants calculés', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      const idLigne = ajouterLigne(base, idFacture, {
        designation: 'Prestation 1',
        quantite_milliemes: 2000,
        pu_ht_centimes: 100000,
        remise_bps: 500,
      })
      expect(idLigne).toBeGreaterThan(0)
      const lignes = lireLignesFacture(base, idFacture)
      expect(lignes).toHaveLength(1)
      expect(lignes[0].montant_ht_brut_centimes).toBe(200000)
      expect(lignes[0].montant_ht_net_centimes).toBe(190000)
    })

    it('modifie une ligne et recalcule les montants', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      const idLigne = ajouterLigne(base, idFacture, { designation: 'Ligne modifiable' })
      modifierLigneFacture(base, idLigne, { pu_ht_centimes: 75000 })
      const lignes = lireLignesFacture(base, idFacture)
      expect(lignes[0].pu_ht_centimes).toBe(75000)
      expect(lignes[0].montant_ht_brut_centimes).toBe(75000)
      expect(lignes[0].montant_ht_net_centimes).toBe(75000)
    })

    it('supprime une ligne', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      const idLigne = ajouterLigne(base, idFacture, { designation: 'À supprimer' })
      expect(supprimerLigneFacture(base, idLigne)).toBe(true)
      expect(lireLignesFacture(base, idFacture)).toHaveLength(0)
    })
  })

  describe('Factures — Validation', () => {
    it('valide une BROUILLON avec lignes → VALIDE + numéro', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      ajouterLigne(base, id, { designation: 'Prestation validation' })
      const factureValidee = validerFacture(base, id)
      expect(factureValidee.statut).toBe('VALIDE')
      expect(factureValidee.numero).toMatch(/^FA-\d{4}-\d{4}$/)
      expect(factureValidee.date_validation).not.toBeNull()
    })

    it('refuse la validation sans ligne', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      expect(() => validerFacture(base, id)).toThrow()
    })

    it('refuse la validation d une facture déjà validée', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      ajouterLigne(base, id)
      validerFacture(base, id)
      expect(() => validerFacture(base, id)).toThrow()
    })
  })

  describe('Factures — Avoirs', () => {
    it('crée un avoir TOTAL sur une facture', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      ajouterLigne(base, idFacture, {
        designation: 'Produit A',
        quantite_milliemes: 5000,
        pu_ht_centimes: 100000,
      })
      validerFacture(base, idFacture)

      const idAvoir = creerAvoir(base, {
        factureOrigineId: idFacture,
        motifAvoir: 'Retour marchandise',
        modeAvoir: 'TOTAL',
        clientId: idClient,
        dateFacture: '2026-08-21',
      })
      expect(idAvoir).toBeGreaterThan(0)
      const avoir = lireFactureParId(base, idAvoir)
      expect(avoir?.type_document).toBe('AV')
      expect(avoir?.statut).toBe('BROUILLON')
      expect(avoir?.facture_origine_id).toBe(idFacture)
      expect(avoir?.motif_avoir).toBe('Retour marchandise')
      expect(avoir?.numero).toBeNull()

      const lignesAvoir = lireLignesFacture(base, idAvoir)
      expect(lignesAvoir.length).toBeGreaterThanOrEqual(1)
      expect(lignesAvoir[0].quantite_milliemes).toBeLessThan(0)
    })

    it('listerAvoirs retourne les avoirs d une facture', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      ajouterLigne(base, idFacture, {
        designation: 'Produit B',
        quantite_milliemes: 1000,
        pu_ht_centimes: 50000,
      })
      validerFacture(base, idFacture)
      creerAvoir(base, {
        factureOrigineId: idFacture,
        motifAvoir: 'Correction',
        modeAvoir: 'TOTAL',
        clientId: idClient,
        dateFacture: '2026-08-21',
      })
      const avoirs = listerAvoirs(base, idFacture)
      expect(avoirs).toHaveLength(1)
      expect(avoirs[0].type_document).toBe('AV')
    })

    it('compteur AV inchangé après création', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      ajouterLigne(base, idFacture, { designation: 'Test compteur', quantite_milliemes: 2000, pu_ht_centimes: 50000 })
      validerFacture(base, idFacture)

      const compteurAvant = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'AV' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurAvant = compteurAvant?.dernier_numero ?? 0

      creerAvoir(base, {
        factureOrigineId: idFacture,
        motifAvoir: 'Test compteur',
        modeAvoir: 'TOTAL',
        clientId: idClient,
        dateFacture: '2026-08-21',
      })

      const compteurApres = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'AV' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurApres = compteurApres?.dernier_numero ?? 0
      expect(valeurApres).toBe(valeurAvant)
    })

    it('validation AV : compteur +1 et numéro attribué', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      ajouterLigne(base, idFacture, { designation: 'Test validation', quantite_milliemes: 3000, pu_ht_centimes: 80000 })
      validerFacture(base, idFacture)

      const compteurAvant = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'AV' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurAvant = compteurAvant?.dernier_numero ?? 0

      const idAvoir = creerAvoir(base, {
        factureOrigineId: idFacture,
        motifAvoir: 'Test validation AV',
        modeAvoir: 'TOTAL',
        clientId: idClient,
        dateFacture: '2026-08-21',
      })

      const avant = lireFactureParId(base, idAvoir)
      expect(avant?.numero).toBeNull()
      expect(avant?.statut).toBe('BROUILLON')

      const validee = validerFacture(base, idAvoir)
      expect(validee.numero).toMatch(/^AV-\d{4}-\d{4}$/)
      expect(validee.statut).toBe('VALIDE')

      const compteurApres = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'AV' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurApres = compteurApres?.dernier_numero ?? 0
      expect(valeurApres).toBe(valeurAvant + 1)
    })

    it('validation AV répétée : rejet', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      ajouterLigne(base, idFacture, { designation: 'Test double', quantite_milliemes: 1000, pu_ht_centimes: 50000 })
      validerFacture(base, idFacture)
      const idAvoir = creerAvoir(base, {
        factureOrigineId: idFacture,
        motifAvoir: 'Test double validation',
        modeAvoir: 'TOTAL',
        clientId: idClient,
        dateFacture: '2026-08-21',
      })
      validerFacture(base, idAvoir)
      expect(() => validerFacture(base, idAvoir)).toThrow()
    })

    it('facture d origine inchangée après création AV', () => {
      const base = obtenirBase()
      const idFacture = creerFactureBase(base)
      ajouterLigne(base, idFacture, { designation: 'Test origine', quantite_milliemes: 1500, pu_ht_centimes: 60000 })
      validerFacture(base, idFacture)
      const origineAvant = lireFactureParId(base, idFacture)

      creerAvoir(base, {
        factureOrigineId: idFacture,
        motifAvoir: 'Test origine',
        modeAvoir: 'TOTAL',
        clientId: idClient,
        dateFacture: '2026-08-21',
      })

      const origineApres = lireFactureParId(base, idFacture)
      expect(origineApres?.statut).toBe(origineAvant?.statut)
    })

    it('transitions ENCAISSER et ARCHIVER refusées sur AV', () => {
      expect(() => transiter(machineEtatsFacture, 'VALIDE', 'ENCAISSER')).toThrow()
      expect(() => transiter(machineEtatsFacture, 'VALIDE', 'ARCHIVER')).toThrow()
    })
  })

  describe('Bons de livraison — CRUD', () => {
    it('crée un BL et le relit', () => {
      const base = obtenirBase()
      const numero = prochainNumeroBL()
      const id = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: numero,
        date_livraison: '2026-08-15',
        client_id: idClient,
        affaire_id: idAffaire,
      })
      const bl = lireBonLivraisonParId(base, id)
      expect(bl).not.toBeNull()
      expect(bl?.statut).toBe('EMIS')
      expect(bl?.numero_bl).toBe(numero)
    })

    it('liste les BL', () => {
      const base = obtenirBase()
      prochainNumeroBL()
      creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
      })
      const tous = listerBonsLivraison(base)
      expect(tous.length).toBeGreaterThanOrEqual(1)
    })

    it('modifie un BL', () => {
      const base = obtenirBase()
      const id = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
      })
      const ok = modifierBonLivraison(base, id, { poids_pesee_kg: 1500 })
      expect(ok).toBe(true)
      expect(lireBonLivraisonParId(base, id)?.poids_pesee_kg).toBe(1500)
    })

    it('supprime logiquement un BL EMIS', () => {
      const base = obtenirBase()
      const id = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
      })
      expect(supprimerLogiquementBonLivraison(base, id)).toBe(true)
      expect(lireBonLivraisonParId(base, id)).toBeNull()
    })

    it('refuse la suppression d un BL FACTURE', () => {
      const base = obtenirBase()
      const id = creerBonLivraison(base, {
        statut: 'FACTURE',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
      })
      expect(supprimerLogiquementBonLivraison(base, id)).toBe(false)
    })
  })

  describe('Bons de livraison — Lignes', () => {
    it('crée des lignes de BL et les relit', () => {
      const base = obtenirBase()
      const idBl = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
      })
      const idLigne = creerLigneBonLivraison(base, {
        bon_livraison_id: idBl,
        designation: 'Article BL',
        unite: 'U',
        quantite_milliemes: 3000,
        pu_ht_centimes: 25000,
        montant_ht_centimes: versCentimes(75000),
      })
      expect(idLigne).toBeGreaterThan(0)
      const lignes = listerLignesBonLivraison(base, idBl)
      expect(lignes).toHaveLength(1)
      expect(lignes[0].designation).toBe('Article BL')
    })
  })

  describe('Génération de facture depuis BL', () => {
    it('génère une facture depuis un BL', () => {
      const base = obtenirBase()
      const idBl = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
        affaire_id: idAffaire,
      })
      creerLigneBonLivraison(base, {
        bon_livraison_id: idBl,
        designation: 'Article facturable',
        unite: 'U',
        quantite_milliemes: 2000,
        pu_ht_centimes: 50000,
        montant_ht_centimes: versCentimes(100000),
      })

      const factureId = genererFactureDepuisBons(base, {
        blIds: [idBl],
        clientId: idClient,
        affaireId: idAffaire,
        dateFacture: '2026-08-20',
        retenueGarantieBps: 0,
        remboursementAvanceCentimes: 0,
        marchePublic: false,
      })

      expect(factureId).toBeGreaterThan(0)
      const facture = lireFactureParId(base, factureId)
      expect(facture).not.toBeNull()
      expect(facture?.type_document).toBe('FA')
      expect(facture?.statut).toBe('BROUILLON')
      expect(facture?.numero).toBeNull()
      expect(facture?.client_id).toBe(idClient)

      const blRelu = lireBonLivraisonParId(base, idBl)
      expect(blRelu?.statut).toBe('FACTURE')

      const lignesFacture = lireLignesFacture(base, factureId)
      expect(lignesFacture).toHaveLength(1)
    })

    it('le compteur FA ne bouge pas lors de la génération BL → FA', () => {
      const base = obtenirBase()
      const compteurAvant = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurAvant = compteurAvant?.dernier_numero ?? 0

      const idBl = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
        affaire_id: idAffaire,
      })
      creerLigneBonLivraison(base, {
        bon_livraison_id: idBl,
        designation: 'Article compteur',
        unite: 'U',
        quantite_milliemes: 1000,
        pu_ht_centimes: 50000,
        montant_ht_centimes: versCentimes(50000),
      })

      genererFactureDepuisBons(base, {
        blIds: [idBl],
        clientId: idClient,
        affaireId: idAffaire,
        dateFacture: '2026-08-20',
        retenueGarantieBps: 0,
        remboursementAvanceCentimes: 0,
        marchePublic: false,
      })

      const compteurApres = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurApres = compteurApres?.dernier_numero ?? 0
      expect(valeurApres).toBe(valeurAvant)
    })

    it('validation de la facture issue de BL : un seul numéro attribué', () => {
      const base = obtenirBase()
      const compteurAvant = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurAvant = compteurAvant?.dernier_numero ?? 0

      const idBl = creerBonLivraison(base, {
        statut: 'EMIS',
        numero_bl: prochainNumeroBL(),
        date_livraison: '2026-08-15',
        client_id: idClient,
        affaire_id: idAffaire,
      })
      creerLigneBonLivraison(base, {
        bon_livraison_id: idBl,
        designation: 'Article validation',
        unite: 'U',
        quantite_milliemes: 1000,
        pu_ht_centimes: 50000,
        montant_ht_centimes: versCentimes(50000),
      })

      const factureId = genererFactureDepuisBons(base, {
        blIds: [idBl],
        clientId: idClient,
        affaireId: idAffaire,
        dateFacture: '2026-08-20',
        retenueGarantieBps: 0,
        remboursementAvanceCentimes: 0,
        marchePublic: false,
      })

      const avant = lireFactureParId(base, factureId)
      expect(avant?.numero).toBeNull()

      const factureValidee = validerFacture(base, factureId)
      expect(factureValidee.numero).toMatch(/^FA-\d{4}-\d{4}$/)

      const compteurApres = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurApres = compteurApres?.dernier_numero ?? 0
      expect(valeurApres).toBe(valeurAvant + 1)
    })

    it('suppression de brouillons puis validation : aucune séquence consommée par les brouillons', () => {
      const base = obtenirBase()
      const compteurAvant = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurAvant = compteurAvant?.dernier_numero ?? 0

      const id1 = creerFactureBase(base)
      const id2 = creerFactureBase(base)
      const id3 = creerFactureBase(base)
      ajouterLigne(base, id1)
      ajouterLigne(base, id2)
      ajouterLigne(base, id3)

      supprimerLogiquementFacture(base, id1)
      supprimerLogiquementFacture(base, id2)
      supprimerLogiquementFacture(base, id3)

      const compteurApres = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurApres = compteurApres?.dernier_numero ?? 0
      expect(valeurApres).toBe(valeurAvant)
    })

    it('création d un brouillon : numero est NULL', () => {
      const base = obtenirBase()
      const id = creerFactureBase(base)
      const facture = lireFactureParId(base, id)
      expect(facture?.numero).toBeNull()
      expect(facture?.statut).toBe('BROUILLON')
    })

    it('rollback de génération BL → FA : compteur et données inchangés', () => {
      const base = obtenirBase()
      const compteurAvant = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurAvant = compteurAvant?.dernier_numero ?? 0
      const nombreFacturesAvant = base
        .prepare('SELECT COUNT(*) AS total FROM factures WHERE supprime_le IS NULL')
        .get() as { total: number }

      try {
        genererFactureDepuisBons(base, {
          blIds: [99999],
          clientId: idClient,
          dateFacture: '2026-08-20',
          retenueGarantieBps: 0,
          remboursementAvanceCentimes: 0,
          marchePublic: false,
        })
      } catch {
        // Expected: BL 99999 doesn't exist
      }

      const compteurApres = base
        .prepare("SELECT dernier_numero FROM compteurs_numerotation WHERE code_document = 'FA' AND annee = 2026")
        .get() as { dernier_numero: number } | undefined
      const valeurApres = compteurApres?.dernier_numero ?? 0
      expect(valeurApres).toBe(valeurAvant)

      const nombreFacturesApres = base
        .prepare('SELECT COUNT(*) AS total FROM factures WHERE supprime_le IS NULL')
        .get() as { total: number }
      expect(nombreFacturesApres.total).toBe(nombreFacturesAvant.total)
    })

    it('applique le rabais marché de l affaire ligne par ligne (2 BL, taux figé 1000 bps)', () => {
      const base = obtenirBase()
      const idAffaireMarche = creerAffaire(base, {
        statut: 'SIGNE',
        reference: 'AFG-2026-MARCHE-RABAIS',
        type_affaire: 'MARCHE_PUBLIC',
        client_id: idClient,
        rabais_marche_bps: 1000,
      })

      const creerBlAvecLigne = (designation: string): number => {
        const idBl = creerBonLivraison(base, {
          statut: 'EMIS',
          numero_bl: prochainNumeroBL(),
          date_livraison: '2026-08-15',
          client_id: idClient,
          affaire_id: idAffaireMarche,
        })
        creerLigneBonLivraison(base, {
          bon_livraison_id: idBl,
          designation,
          unite: 'U',
          quantite_milliemes: 1000,
          pu_ht_centimes: 50000,
          montant_ht_centimes: versCentimes(50000000),
        })
        return idBl
      }

      const idBl1 = creerBlAvecLigne('Article marché 1')
      const idBl2 = creerBlAvecLigne('Article marché 2')

      const factureId = genererFactureDepuisBons(base, {
        blIds: [idBl1, idBl2],
        clientId: idClient,
        affaireId: idAffaireMarche,
        dateFacture: '2026-08-20',
        retenueGarantieBps: 0,
        remboursementAvanceCentimes: 0,
        marchePublic: true,
      })

      const facture = lireFactureParId(base, factureId)
      expect(facture?.type_document).toBe('FA')
      expect(facture?.total_ht_lignes_centimes).toBe(100000)
      expect(facture?.net_commercial_ht_centimes).toBe(90000)
      expect(facture?.total_ttc_centimes).toBe(107100)

      const lignes = lireLignesFacture(base, factureId)
      expect(lignes).toHaveLength(2)
      for (const ligne of lignes) {
        expect(ligne.rabais_marche_bps).toBe(1000)
        expect(ligne.montant_ht_brut_centimes).toBe(50000)
        expect(ligne.montant_ht_remise_centimes).toBe(50000)
        expect(ligne.montant_rabais_marche_centimes).toBe(5000)
        expect(ligne.montant_ht_net_centimes).toBe(45000)
      }
    })
  })
})

