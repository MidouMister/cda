import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds, SEUIL_ESPECES_CLE } from '../electron/db/seeds'
import { depuisCentimes, versCentimes } from '../electron/depots/conversion-centimes'
import { lireTranchesActives } from '../electron/depots/depot-bareme-timbre'
import { creerCompteur, incrementerCompteur, lireCompteur } from '../electron/depots/depot-compteurs'
import { creerClient, lireClientParId, listerClients, supprimerLogiquementClient } from '../electron/depots/depot-clients'
import { lireExerciceCourant, lireExerciceParAnnee } from '../electron/depots/depot-exercices'
import { listerFamillesActives } from '../electron/depots/depot-familles'
import { lireParametre, lireParametreObli, lireSeuilEspecesCentimes, mettreAJourParametre } from '../electron/depots/depot-parametres'

const CLE_VALIDE = 'clé-de-test-depots-egto-j1'
const CHEMIN_ESSAI = join(tmpdir(), `egto-depots-${randomUUID()}.db`)

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

const creerDonneesClient = (): {
  code_client: string
  type_client: 'EURL'
  raison_sociale: string
  categorie: 'PRIVE'
} => ({
  code_client: 'CLI-UNIQUE-01',
  type_client: 'EURL',
  raison_sociale: 'Duplicata SA',
  categorie: 'PRIVE',
})

describe('Dépôts SQLite EGTO — tests d’intégration sur base chiffrée temporaire', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  describe('conversion-centimes', () => {
    it('centralise la sémantique centimes en identité validée', () => {
      expect(versCentimes(100000000)).toBe(100000000)
      expect(depuisCentimes(123)).toBe(123)
      expect(() => versCentimes(1.5)).toThrow(/entier/)
      expect(() => depuisCentimes(Number.NaN)).toThrow(/entier/)
    })
  })

  describe('depot-parametres', () => {
    it('lit un paramètre existant et renvoie null pour une clé inconnue', () => {
      const base = obtenirBase()
      expect(lireParametre(base, SEUIL_ESPECES_CLE)).toBe('100000000')
      expect(lireParametre(base, 'entreprise.cle_absente')).toBeNull()
      expect(() => lireParametreObli(base, 'entreprise.cle_absente')).toThrow(/obligatoire/i)
    })

    it('convertit le seuil des espèces en entier centimes', () => {
      expect(lireSeuilEspecesCentimes(obtenirBase())).toBe(100000000)
    })

    it('met à jour un paramètre existant', () => {
      const base = obtenirBase()
      mettreAJourParametre(base, 'entreprise.denomination', 'EGTO GITRA')
      expect(lireParametre(base, 'entreprise.denomination')).toBe('EGTO GITRA')
    })
  })

  describe('depot-bareme-timbre', () => {
    it('liste les 4 tranches actives, triées par borne minimale', () => {
      const tranches = lireTranchesActives(obtenirBase())
      expect(tranches).toHaveLength(4)
      expect(tranches.map((tranche) => tranche.borneMinTtcCentimes)).toEqual([0, 30000, 3000000, 10000000])
      expect(tranches.map((tranche) => tranche.borneMaxTtcCentimes)).toEqual([30000, 3000000, 10000000, null])
      expect(tranches.map((tranche) => tranche.tauxBps)).toEqual([0, 100, 150, 200])
      expect(tranches.map((tranche) => tranche.plancherCentimes)).toEqual([500, 500, 500, 500])
      expect(tranches.map((tranche) => tranche.plafondCentimes)).toEqual([1000000, 1000000, 1000000, 1000000])
    })
  })

  describe('depot-compteurs', () => {
    it('incrémente dans une transaction, en créant le compteur absent', () => {
      const base = obtenirBase()
      expect(incrementerCompteur(base, 'FA', 2026)).toBe(1)
      expect(incrementerCompteur(base, 'FA', 2026)).toBe(2)
      expect(incrementerCompteur(base, 'FA', 2026)).toBe(3)
      expect(lireCompteur(base, 'FA', 2026)).toEqual({ dernierNumero: 3 })
    })

    it('crée un compteur de façon idempotente et renvoie l’existant en cas de conflit', () => {
      const base = obtenirBase()
      expect(creerCompteur(base, 'BL', 2026, null, 5)).toEqual({ dernierNumero: 5 })
      expect(creerCompteur(base, 'BL', 2026, null, 99)).toEqual({ dernierNumero: 5 })
      const nombre = base
        .prepare("SELECT COUNT(*) AS n FROM compteurs_numerotation WHERE code_document = 'BL' AND annee = 2026")
        .get() as { n: number }
      expect(nombre.n).toBe(1)
    })

    it('sépare les compteurs par affaire', () => {
      const base = obtenirBase()
      const idClient = creerClient(base, {
        code_client: 'CLI-AFF-01',
        type_client: 'SARL',
        raison_sociale: 'Client Affaire',
        categorie: 'PRIVE',
      })
      const insertion = base
        .prepare("INSERT INTO affaires (reference, type_affaire, client_id) VALUES (?, 'CONTRAT_PRIVE', ?)")
        .run('AFG-2026-0001', idClient)
      const idAffaire = Number(insertion.lastInsertRowid)
      expect(incrementerCompteur(base, 'ST', 2026, null)).toBe(1)
      expect(incrementerCompteur(base, 'ST', 2026, idAffaire)).toBe(1)
      expect(incrementerCompteur(base, 'ST', 2026, idAffaire)).toBe(2)
      expect(lireCompteur(base, 'ST', 2026, null)).toEqual({ dernierNumero: 1 })
      expect(lireCompteur(base, 'ST', 2026, idAffaire)).toEqual({ dernierNumero: 2 })
    })
  })

  describe('depot-exercices', () => {
    it('renvoie l’exercice courant ouvert (2026)', () => {
      const exercice = lireExerciceCourant(obtenirBase())
      expect(exercice).toMatchObject({ annee: 2026, date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'OUVERT' })
    })

    it('trouve un exercice par année et renvoie null sinon', () => {
      const base = obtenirBase()
      expect(lireExerciceParAnnee(base, 2026)).toMatchObject({ annee: 2026 })
      expect(lireExerciceParAnnee(base, 2025)).toBeNull()
    })
  })

  describe('depot-familles', () => {
    it('liste les 4 familles actives dans l’ordre', () => {
      const familles = listerFamillesActives(obtenirBase())
      expect(familles).toHaveLength(4)
      expect(familles.map((famille) => famille.code)).toEqual(['VTE', 'LOC', 'REA', 'ST'])
      expect(familles.map((famille) => famille.ordre)).toEqual([1, 2, 3, 4])
    })
  })

  describe('depot-clients', () => {
    it('crée un client et le relit avec supprime_le à NULL', () => {
      const base = obtenirBase()
      const id = creerClient(base, {
        code_client: 'CLI-01',
        type_client: 'SARL',
        raison_sociale: 'Entreprise Test Oran',
        categorie: 'PRIVE',
        email: 'contact@exemple.dz',
        plafond_credit_centimes: 50000000,
      })
      const client = lireClientParId(base, id)
      expect(client).not.toBeNull()
      expect(client?.code_client).toBe('CLI-01')
      expect(client?.raison_sociale).toBe('Entreprise Test Oran')
      expect(client?.plafond_credit_centimes).toBe(50000000)
      expect(client?.supprime_le).toBeNull()
    })

    it('journalise l’INSERT d’un client dans journal_audit', () => {
      const base = obtenirBase()
      const id = creerClient(base, {
        code_client: 'CLI-AUDIT-01',
        type_client: 'SARL',
        raison_sociale: 'Société Auditable',
        categorie: 'PRIVE',
      })
      const lireActions = (): string[] =>
        (
          base
            .prepare("SELECT action FROM journal_audit WHERE table_affectee = 'clients' AND ligne_id = ? ORDER BY id")
            .all(id) as { action: string }[]
        ).map((ligne) => ligne.action)
      expect(lireActions()).toEqual(['INSERT'])
      expect(supprimerLogiquementClient(base, id)).toBe(true)
      expect(lireActions()).toEqual(['INSERT', 'UPDATE'])
    })

    it('stocks littéralement une valeur contenant une tentative d’injection SQL', () => {
      const base = obtenirBase()
      const avant = listerClients(base).length
      const raisonInjectee = "Entreprise Oran' OR 1=1 --"
      const id = creerClient(base, {
        code_client: 'CLI-INJ-01',
        type_client: 'SARL',
        raison_sociale: raisonInjectee,
        categorie: 'PRIVE',
      })
      const lu = lireClientParId(base, id)
      expect(lu?.raison_sociale).toBe(raisonInjectee)
      expect(listerClients(base)).toHaveLength(avant + 1)
      expect(listerClients(base).filter((client) => client.raison_sociale === raisonInjectee)).toHaveLength(1)
    })

    it('refuse un code_client dupliqué via l’index unique', () => {
      const base = obtenirBase()
      creerClient(base, creerDonneesClient())
      expect(() => creerClient(base, creerDonneesClient())).toThrow(/UNIQUE/)
    })

    it('masque un client supprimé logiquement', () => {
      const base = obtenirBase()
      const id = creerClient(base, {
        code_client: 'CLI-SUP-01',
        type_client: 'ETP',
        raison_sociale: 'À Supprimer',
        categorie: 'PUBLIC',
      })
      expect(lireClientParId(base, id)?.supprime_le).toBeNull()
      expect(supprimerLogiquementClient(base, id)).toBe(true)
      expect(lireClientParId(base, id)).toBeNull()
      expect(listerClients(base).some((client) => client.id === id)).toBe(false)
      const brute = base.prepare('SELECT supprime_le FROM clients WHERE id = ?').get(id) as {
        supprime_le: string | null
      }
      expect(brute.supprime_le).not.toBeNull()
      expect(supprimerLogiquementClient(base, id)).toBe(false)
    })
  })
})
