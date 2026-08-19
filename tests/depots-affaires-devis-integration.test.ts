import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import {
  creerAffaire,
  lireAffaireParId,
  listerAffaires,
  modifierAffaire,
  supprimerLogiquementAffaire,
} from '../electron/depots/depot-affaires'
import {
  creerDevis,
  listerDevis,
  modifierDevis,
  supprimerLogiquementDevis,
  creerLigneDevis,
  listerLignesDevis,
} from '../electron/depots/depot-devis'
import {
  creerPosteDqe,
  listerPostesDqeParAffaire,
  modifierPosteDqe,
  supprimerLogiquementPosteDqe,
} from '../electron/depots/depot-postes-dqe'
import {
  creerAvenant,
  modifierStatutAvenant,
  supprimerLogiquementAvenant,
  creerAvenantPoste,
  listerAvenantsPostes,
} from '../electron/depots/depot-avenants'
import {
  creerEvenementDelai,
  listerEvenementsDelaiParAffaire,
  supprimerLogiquementEvenementDelai,
} from '../electron/depots/depot-evenements-delais'
import { creerClient } from '../electron/depots/depot-clients'

const CLE_VALIDE = 'clé-de-test-depots-egto-q13'
const CHEMIN_ESSAI = join(tmpdir(), `egto-affaires-devis-${randomUUID()}.db`)

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

let compteurClients = 0
let compteurRef = 0

const CREER_CLIENT_BASE = (): number => {
  compteurClients += 1
  return creerClient(obtenirBase(), {
    code_client: `TEST-AFF-${String(compteurClients).padStart(3, '0')}`,
    type_client: 'EURL',
    raison_sociale: 'Test Affaires SA',
    categorie: 'PRIVE',
  })
}

const DONNEES_AFFAIRE_BASE = (clientId: number) => ({
  statut: 'SIGNE' as const,
  reference: `AFG-2026-${String(++compteurRef).padStart(8, '0')}`,
  type_affaire: 'CONTRAT_PRIVE' as const,
  client_id: clientId,
  objet: 'Travaux de réhabilitation',
  montant_initial_ht_centimes: 50000000,
  taux_tva_bps: 1900,
})

describe('Dépôts affaires, devis, postes DQE, avenants, événements délai — intégration Q13', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  describe('depot-affaires', () => {
    it('creerAffaire retourne un id > 0', () => {
      const clientId = CREER_CLIENT_BASE()
      const id = creerAffaire(obtenirBase(), DONNEES_AFFAIRE_BASE(clientId))
      expect(id).toBeGreaterThan(0)
    })

    it('lireAffaireParId retourne la bonne ligne', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const id = creerAffaire(base, {
        ...DONNEES_AFFAIRE_BASE(clientId),
        reference: 'AFG-2026-0101',
      })
      const affaire = lireAffaireParId(base, id)
      expect(affaire).not.toBeNull()
      expect(affaire?.id).toBe(id)
      expect(affaire?.reference).toBe('AFG-2026-0101')
      expect(affaire?.client_id).toBe(clientId)
      expect(affaire?.supprime_le).toBeNull()
    })

    it('listerAffaires retourne toutes les affaires non supprimées', () => {
      const base = obtenirBase()
      const avant = listerAffaires(base).length
      const clientId = CREER_CLIENT_BASE()
      creerAffaire(base, { ...DONNEES_AFFAIRE_BASE(clientId), reference: 'AFG-2026-0102' })
      creerAffaire(base, { ...DONNEES_AFFAIRE_BASE(clientId), reference: 'AFG-2026-0103' })
      const apres = listerAffaires(base)
      expect(apres.length).toBe(avant + 2)
      expect(apres.every((a) => a.supprime_le === null)).toBe(true)
    })

    it('modifierAffaire met à jour les champs et retourne true', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const id = creerAffaire(base, { ...DONNEES_AFFAIRE_BASE(clientId), reference: 'AFG-2026-0104' })
      const resultat = modifierAffaire(base, id, {
        objet: 'Objet modifié',
        statut: 'EN_COURS',
      })
      expect(resultat).toBe(true)
      const affaire = lireAffaireParId(base, id)
      expect(affaire?.objet).toBe('Objet modifié')
      expect(affaire?.statut).toBe('EN_COURS')
    })

    it('supprimerLogiquementAffaire positionne supprime_le', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const id = creerAffaire(base, { ...DONNEES_AFFAIRE_BASE(clientId), reference: 'AFG-2026-0105' })
      expect(lireAffaireParId(base, id)).not.toBeNull()
      expect(supprimerLogiquementAffaire(base, id)).toBe(true)
      expect(lireAffaireParId(base, id)).toBeNull()
      expect(supprimerLogiquementAffaire(base, id)).toBe(false)
    })

    it('modifierAffaire retourne false pour un id inexistant', () => {
      const resultat = modifierAffaire(obtenirBase(), 999999, { objet: 'Inexistant' })
      expect(resultat).toBe(false)
    })

    it('lireAffaireParId retourne null pour un id inexistant', () => {
      expect(lireAffaireParId(obtenirBase(), 999999)).toBeNull()
    })
  })

  describe('depot-devis', () => {
    it('creerDevis retourne un id > 0', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const id = creerDevis(base, {
        statut: 'BROUILLON',
        numero_devis: 'DEV-2026-0001',
        client_id: clientId,
        date_devis: '2026-08-19',
      })
      expect(id).toBeGreaterThan(0)
    })

    it('listerLignesDevis retourne un tableau vide pour un devis nouveau', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const devisId = creerDevis(base, {
        statut: 'BROUILLON',
        numero_devis: 'DEV-2026-0002',
        client_id: clientId,
        date_devis: '2026-08-19',
      })
      const lignes = listerLignesDevis(base, devisId)
      expect(lignes).toHaveLength(0)
    })

    it('creerLigneDevis puis listerLignesDevis retourne 1 ligne', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const devisId = creerDevis(base, {
        statut: 'BROUILLON',
        numero_devis: 'DEV-2026-0003',
        client_id: clientId,
        date_devis: '2026-08-19',
      })
      const ligneId = creerLigneDevis(base, {
        devis_id: devisId,
        designation: 'Fourniture matériel BTP',
        unite: 'U',
        quantite_milliemes: 1000000,
        pu_ht_centimes: 2500000,
        montant_ht_centimes: 2500000,
      })
      expect(ligneId).toBeGreaterThan(0)
      const lignes = listerLignesDevis(base, devisId)
      expect(lignes).toHaveLength(1)
      expect(lignes[0].designation).toBe('Fourniture matériel BTP')
    })

    it('modifierDevis met à jour le statut', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const devisId = creerDevis(base, {
        statut: 'BROUILLON',
        numero_devis: 'DEV-2026-0004',
        client_id: clientId,
        date_devis: '2026-08-19',
      })
      const resultat = modifierDevis(base, devisId, { statut: 'ACCEPTE' })
      expect(resultat).toBe(true)
      const devis = base.prepare('SELECT statut FROM devis WHERE id = ?').get(devisId) as { statut: string }
      expect(devis.statut).toBe('ACCEPTE')
    })

    it('supprimerLogiquementDevis positionne supprime_le', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const devisId = creerDevis(base, {
        statut: 'BROUILLON',
        numero_devis: 'DEV-2026-0005',
        client_id: clientId,
        date_devis: '2026-08-19',
      })
      expect(supprimerLogiquementDevis(base, devisId)).toBe(true)
      const brut = base.prepare('SELECT supprime_le FROM devis WHERE id = ?').get(devisId) as {
        supprime_le: string | null
      }
      expect(brut.supprime_le).not.toBeNull()
      expect(supprimerLogiquementDevis(base, devisId)).toBe(false)
    })

    it('listerDevis retourne tous les devis non supprimés', () => {
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      const avant = listerDevis(base).length
      creerDevis(base, {
        statut: 'BROUILLON',
        numero_devis: 'DEV-2026-0006',
        client_id: clientId,
        date_devis: '2026-08-19',
      })
      const apres = listerDevis(base)
      expect(apres.length).toBe(avant + 1)
      expect(apres.every((d) => d.supprime_le === null)).toBe(true)
    })
  })

  describe('depot-postes-dqe', () => {
    let compteurPostes = 0
    const preparerAffaire = (): number => {
      compteurPostes += 1
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      return creerAffaire(base, {
        statut: 'SIGNE',
        reference: `AFG-2026-P${String(compteurPostes).padStart(3, '0')}`,
        type_affaire: 'CONTRAT_PRIVE',
        client_id: clientId,
      })
    }

    it('creerPosteDqe retourne un id', () => {
      const affaireId = preparerAffaire()
      const id = creerPosteDqe(obtenirBase(), {
        affaire_id: affaireId,
        numero: 1,
        designation: 'Poste DQE test',
        origine: 'MANUEL',
      })
      expect(id).toBeGreaterThan(0)
    })

    it('listerPostesDqeParAffaire retourne les postes de l\'affaire', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      creerPosteDqe(base, { affaire_id: affaireId, numero: 1, designation: 'Poste A', origine: 'MANUEL' })
      creerPosteDqe(base, { affaire_id: affaireId, numero: 2, designation: 'Poste B', origine: 'MANUEL' })
      const postes = listerPostesDqeParAffaire(base, affaireId)
      expect(postes.length).toBeGreaterThanOrEqual(2)
      expect(postes.every((p) => p.affaire_id === affaireId)).toBe(true)
    })

    it('modifierPosteDqe met à jour les champs', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      const id = creerPosteDqe(base, {
        affaire_id: affaireId,
        numero: 10,
        designation: 'À modifier',
        origine: 'MANUEL',
      })
      expect(modifierPosteDqe(base, id, { designation: 'Modifié', pu_ht_centimes: 3000000 })).toBe(true)
      const poste = base.prepare('SELECT designation, pu_ht_centimes FROM postes_dqe WHERE id = ?').get(id) as {
        designation: string
        pu_ht_centimes: number
      }
      expect(poste.designation).toBe('Modifié')
      expect(poste.pu_ht_centimes).toBe(3000000)
    })

    it('listerPostesDqeParAffaire retourne vide pour une affaire sans postes', () => {
      const affaireId = preparerAffaire()
      const postes = listerPostesDqeParAffaire(obtenirBase(), affaireId)
      expect(postes).toHaveLength(0)
    })

    it('supprimerLogiquementPosteDqe positionne supprime_le', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      const id = creerPosteDqe(base, {
        affaire_id: affaireId,
        numero: 99,
        designation: 'À supprimer',
        origine: 'MANUEL',
      })
      expect(supprimerLogiquementPosteDqe(base, id)).toBe(true)
      const brut = base.prepare('SELECT supprime_le FROM postes_dqe WHERE id = ?').get(id) as {
        supprime_le: string | null
      }
      expect(brut.supprime_le).not.toBeNull()
      expect(supprimerLogiquementPosteDqe(base, id)).toBe(false)
    })
  })

  describe('depot-avenants', () => {
    let compteurAvenants = 0
    const preparerAffaire = (): number => {
      compteurAvenants += 1
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      return creerAffaire(base, {
        statut: 'SIGNE',
        reference: `AFG-2026-A${String(compteurAvenants).padStart(3, '0')}`,
        type_affaire: 'CONTRAT_PRIVE',
        client_id: clientId,
      })
    }

    it('creerAvenant retourne un id', () => {
      const affaireId = preparerAffaire()
      const id = creerAvenant(obtenirBase(), {
        statut: 'BROUILLON',
        numero: 'AV-001',
        affaire_id: affaireId,
        objet: 'Extension délai',
      })
      expect(id).toBeGreaterThan(0)
    })

    it('creerAvenantPoste puis listerAvenantsPostes retourne les postes', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      const avenantId = creerAvenant(base, {
        statut: 'BROUILLON',
        numero: 'AV-002',
        affaire_id: affaireId,
      })
      const posteId = creerAvenantPoste(base, {
        avenant_id: avenantId,
        action: 'AJOUT',
        designation: 'Nouveau poste',
        quantite_milliemes: 500000,
        pu_ht_centimes: 1200000,
      })
      expect(posteId).toBeGreaterThan(0)
      const postes = listerAvenantsPostes(base, avenantId)
      expect(postes).toHaveLength(1)
      expect(postes[0].action).toBe('AJOUT')
      expect(postes[0].designation).toBe('Nouveau poste')
    })

    it('modifierStatutAvenant change le statut', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      const avenantId = creerAvenant(base, {
        statut: 'BROUILLON',
        numero: 'AV-003',
        affaire_id: affaireId,
      })
      expect(modifierStatutAvenant(base, avenantId, 'VALIDE')).toBe(true)
      const avenant = base.prepare('SELECT statut FROM avenants WHERE id = ?').get(avenantId) as { statut: string }
      expect(avenant.statut).toBe('VALIDE')
    })

    it('supprimerLogiquementAvenant positionne supprime_le', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      const avenantId = creerAvenant(base, {
        statut: 'BROUILLON',
        numero: 'AV-004',
        affaire_id: affaireId,
      })
      expect(supprimerLogiquementAvenant(base, avenantId)).toBe(true)
      const brut = base.prepare('SELECT supprime_le FROM avenants WHERE id = ?').get(avenantId) as {
        supprime_le: string | null
      }
      expect(brut.supprime_le).not.toBeNull()
      expect(supprimerLogiquementAvenant(base, avenantId)).toBe(false)
    })
  })

  describe('depot-evenements-delais', () => {
    let compteurEvenements = 0
    const preparerAffaire = (): number => {
      compteurEvenements += 1
      const base = obtenirBase()
      const clientId = CREER_CLIENT_BASE()
      return creerAffaire(base, {
        statut: 'EN_COURS',
        reference: `AFG-2026-E${String(compteurEvenements).padStart(3, '0')}`,
        type_affaire: 'CONTRAT_PRIVE',
        client_id: clientId,
      })
    }

    it('creerEvenementDelai retourne un id', () => {
      const affaireId = preparerAffaire()
      const id = creerEvenementDelai(obtenirBase(), {
        affaire_id: affaireId,
        type_evenement: 'SUSPENSION',
        date_debut: '2026-07-01',
        date_fin: '2026-07-15',
        duree_jours: 15,
        motif: 'Conditions météo',
        impact_delai_jours: 15,
      })
      expect(id).toBeGreaterThan(0)
    })

    it('listerEvenementsDelaiParAffaire retourne les événements', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      creerEvenementDelai(base, {
        affaire_id: affaireId,
        type_evenement: 'SUSPENSION',
        date_debut: '2026-08-01',
        impact_delai_jours: 10,
      })
      creerEvenementDelai(base, {
        affaire_id: affaireId,
        type_evenement: 'PROROGATION',
        date_debut: '2026-09-01',
        impact_delai_jours: 20,
      })
      const evenements = listerEvenementsDelaiParAffaire(base, affaireId)
      expect(evenements.length).toBeGreaterThanOrEqual(2)
      expect(evenements.every((e) => e.affaire_id === affaireId)).toBe(true)
    })

    it('listerEvenementsDelaiParAffaire retourne vide sans événements', () => {
      const affaireId = preparerAffaire()
      const evenements = listerEvenementsDelaiParAffaire(obtenirBase(), affaireId)
      expect(evenements).toHaveLength(0)
    })

    it('supprimerLogiquementEvenementDelai positionne supprime_le', () => {
      const base = obtenirBase()
      const affaireId = preparerAffaire()
      const evenementId = creerEvenementDelai(base, {
        affaire_id: affaireId,
        type_evenement: 'SUSPENSION',
        date_debut: '2026-06-01',
        motif: 'À supprimer',
        impact_delai_jours: 5,
      })
      expect(supprimerLogiquementEvenementDelai(base, evenementId)).toBe(true)
      const brut = base
        .prepare('SELECT supprime_le FROM evenements_delais WHERE id = ?')
        .get(evenementId) as { supprime_le: string | null }
      expect(brut.supprime_le).not.toBeNull()
      expect(supprimerLogiquementEvenementDelai(base, evenementId)).toBe(false)
    })
  })
})
