import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { mapperTrancheEnVue } from '../electron/ipc/ipc-bareme'
import { mapperClientEnVue, mapperDonneesCreationVersDepot } from '../electron/ipc/ipc-clients'
import { mapperExerciceEnVue } from '../electron/ipc/ipc-exercices'
import { mapperFamilleEnVue } from '../electron/ipc/ipc-familles'
import { mapperParametreEnVue, mapperSeuilEspecesEnVue } from '../electron/ipc/ipc-parametres'
import type { Client } from '../electron/depots/depot-clients'
import type { DonneesCreationClient } from '../contrats'
import type { TrancheTimbre } from '../domaine/droit-timbre'

const racineProjet = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Les handlers IPC reposent sur ipcMain (Electron) : ils ne sont pas testables
// hors Electron. Seules les fonctions de mapping pures sont couvertes ici.

describe('Mapping vers les vues contrats/', () => {
  describe('mapperParametreEnVue', () => {
    it('mappe une valeur en vue sérialisable', () => {
      expect(mapperParametreEnVue('entreprise.denomination', 'EGTO')).toEqual({
        cle: 'entreprise.denomination',
        valeur: 'EGTO',
        description: null,
      })
    })

    it('renvoie null pour un paramètre absent', () => {
      expect(mapperParametreEnVue('entreprise.absente', null)).toBeNull()
    })
  })

  describe('mapperSeuilEspecesEnVue', () => {
    it('expose le seuil en centimes entier', () => {
      expect(mapperSeuilEspecesEnVue(100000000)).toEqual({ seuilMaxEspecesCentimes: 100000000 })
    })
  })

  describe('mapperTrancheEnVue', () => {
    it('mappe une tranche du barème, borne max nulle comprise', () => {
      const tranche: TrancheTimbre = {
        borneMinTtcCentimes: 10000000,
        borneMaxTtcCentimes: null,
        tauxBps: 200,
        plancherCentimes: 500,
        plafondCentimes: 1000000,
      }
      expect(mapperTrancheEnVue(tranche)).toEqual(tranche)
    })
  })

  describe('mapperExerciceEnVue', () => {
    it('convertit les colonnes snake_case en camelCase', () => {
      expect(
        mapperExerciceEnVue({
          id: 1,
          annee: 2026,
          date_debut: '2026-01-01',
          date_fin: '2026-12-31',
          statut: 'OUVERT',
        }),
      ).toEqual({
        id: 1,
        annee: 2026,
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
        statut: 'OUVERT',
      })
    })

    it('renvoie null pour un exercice absent', () => {
      expect(mapperExerciceEnVue(null)).toBeNull()
    })
  })

  describe('mapperFamilleEnVue', () => {
    it('mappe une famille active', () => {
      expect(mapperFamilleEnVue({ id: 3, code: 'REA', libelle: 'Réalisation', ordre: 3 })).toEqual({
        id: 3,
        code: 'REA',
        libelle: 'Réalisation',
        ordre: 3,
      })
    })
  })

  describe('mapperClientEnVue', () => {
    const client: Client = {
      id: 42,
      cree_le: '2026-01-01 10:00:00',
      modifie_le: '2026-01-01 10:00:00',
      supprime_le: null,
      statut: 'ACTIF',
      code_client: 'CLI-01',
      type_client: 'SARL',
      raison_sociale: 'Entreprise Test Oran',
      sigle: null,
      categorie: 'PRIVE',
      secteur: null,
      client_groupe: 0,
      nom_groupe: null,
      responsable_commercial: null,
      contentieux_declare: 0,
      adresse: 'Zone industrielle',
      wilaya: '31',
      commune: 'Oran',
      tel_fixe: null,
      tel_mobile: '0550000000',
      fax: null,
      email: 'contact@exemple.dz',
      adresse_chantier: null,
      nif: null,
      nis: null,
      rc: 'RC-001',
      ai: null,
      rib: null,
      banque: null,
      agence: null,
      mode_reglement_prefere: 'VIREMENT',
      delai_paiement_jours: 30,
      plafond_credit_centimes: 50000000,
      score_client: 'B',
      derniere_evaluation_score_le: '2026-06-01',
    }

    it('mappe un client brut en vue camelCase sérialisable', () => {
      expect(mapperClientEnVue(client)).toEqual({
        id: 42,
        statut: 'ACTIF',
        codeClient: 'CLI-01',
        typeClient: 'SARL',
        raisonSociale: 'Entreprise Test Oran',
        sigle: null,
        categorie: 'PRIVE',
        secteur: null,
        clientGroupe: 0,
        nomGroupe: null,
        nif: null,
        nis: null,
        modeReglementPrefere: 'VIREMENT',
        scoreClient: 'B',
      })
    })

    it('conserve les champs nullables tels quels', () => {
      const vue = mapperClientEnVue(client)
      expect(vue.sigle).toBeNull()
      expect(vue.secteur).toBeNull()
      expect(vue.nomGroupe).toBeNull()
      expect(vue.nif).toBeNull()
      expect(vue.modeReglementPrefere).toBe('VIREMENT')
    })
  })

  describe('mapperDonneesCreationVersDepot', () => {
    it('convertit la commande camelCase du renderer en écriture snake_case du dépôt', () => {
      const donnees: DonneesCreationClient = {
        codeClient: 'CLI-01',
        typeClient: 'SARL',
        raisonSociale: 'Entreprise Test Oran',
        categorie: 'PRIVE',
        statut: 'ACTIF',
        sigle: 'ETO',
        secteur: 'BTP',
        nomGroupe: 'GITRA',
        adresse: 'Zone industrielle',
        wilaya: '31',
        commune: 'Oran',
        telMobile: '0550000000',
        email: 'contact@exemple.dz',
        nif: 'NIF-001',
        nis: 'NIS-001',
        rc: 'RC-001',
        modeReglementPrefere: 'VIREMENT',
        plafondCreditCentimes: 50000000,
      }
      expect(mapperDonneesCreationVersDepot(donnees)).toEqual({
        code_client: 'CLI-01',
        type_client: 'SARL',
        raison_sociale: 'Entreprise Test Oran',
        categorie: 'PRIVE',
        statut: 'ACTIF',
        sigle: 'ETO',
        secteur: 'BTP',
        nom_groupe: 'GITRA',
        adresse: 'Zone industrielle',
        wilaya: '31',
        commune: 'Oran',
        tel_mobile: '0550000000',
        email: 'contact@exemple.dz',
        nif: 'NIF-001',
        nis: 'NIS-001',
        rc: 'RC-001',
        mode_reglement_prefere: 'VIREMENT',
        plafond_credit_centimes: 50000000,
      })
    })
  })
})

describe('Frontière contrats/ → domaine/', () => {
  it('les vues de contrats/ n’importent rien depuis domaine/', () => {
    const dossier = join(racineProjet, 'contrats')
    const fichiers = readdirSync(dossier).filter((fichier) => fichier.endsWith('.ts'))
    expect(fichiers.length).toBeGreaterThan(0)
    for (const fichier of fichiers) {
      const contenu = readFileSync(join(dossier, fichier), 'utf8')
      expect(contenu).not.toMatch(/from\s+['"]\.\.\/domaine(?:\/|['"])/)
      expect(contenu).not.toMatch(/from\s+['"]domaine\//)
    }
  })
})
