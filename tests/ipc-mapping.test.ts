import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { mapperTrancheEnVue } from '../electron/ipc/ipc-bareme'
import { mapperClientEnVue, mapperDonneesCreationVersDepot } from '../electron/ipc/ipc-clients'
import { mapperExerciceEnVue } from '../electron/ipc/ipc-exercices'
import { mapperFamilleEnVue } from '../electron/ipc/ipc-familles'
import { mapperParametreEnVue, mapperSeuilEspecesEnVue } from '../electron/ipc/ipc-parametres'
import {
  mapperDonneesCreationVersDepot as mapperDonneesCreationEncaissementVersDepot,
  mapperDonneesModificationVersDepot,
  mapperEncaissementEnVue,
  versDateAffichage,
  versDateIso,
} from '../electron/ipc/ipc-encaissements'
import type { Client } from '../electron/depots/depot-clients'
import type { EnregistrementEncaissement } from '../electron/depots/depot-encaissements'
import type { DonneesCreationClient, DonneesCreationEncaissement, DonneesModificationTimbreEncaissementVue } from '../contrats'
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

  describe('Conversion des dates JJ/MM/AAAA ↔ ISO', () => {
    it.each([
      ['31/12/2026', '2026-12-31'],
      ['29/02/2028', '2028-02-29'],
      ['01/01/2026', '2026-01-01'],
      ['15/08/2026', '2026-08-15'],
    ] as const)('convertit %s en ISO %s', (affichage, iso) => {
      expect(versDateIso(affichage)).toBe(iso)
    })

    it.each(['2026-12-31', '1/1/2026', '01/2026', '', '2026/12/31', '31-12-2026'] as const)(
      'rejette une date au mauvais format : %s',
      (invalide) => {
        expect(() => versDateIso(invalide)).toThrow(/JJ\/MM\/AAAA/)
      },
    )

    it.each([
      ['31/02/2026', /jour invalide/],
      ['29/02/2026', /jour invalide/],
      ['01/13/2026', /mois invalide/],
      ['00/01/2026', /jour invalide/],
    ] as const)('rejette la date calendaire invalide %s', (invalide, message) => {
      expect(() => versDateIso(invalide)).toThrow(message)
    })

    it('rejette une date non-chaîne', () => {
      expect(() => versDateIso(undefined as unknown as string)).toThrow(TypeError)
      expect(() => versDateIso(20260815 as unknown as string)).toThrow(/JJ\/MM\/AAAA/)
    })

    it('convertit une date ISO en affichage JJ/MM/AAAA', () => {
      expect(versDateAffichage('2026-12-31')).toBe('31/12/2026')
      expect(versDateAffichage('2028-02-29')).toBe('29/02/2028')
    })

    it('rejette une date ISO invalide en affichage', () => {
      expect(() => versDateAffichage('2026-02-31')).toThrow(/jour invalide/)
      expect(() => versDateAffichage('31/12/2026')).toThrow(/AAAA-MM-JJ/)
    })

    it('fait l’aller-retour JJ/MM/AAAA → ISO → JJ/MM/AAAA', () => {
      expect(versDateAffichage(versDateIso('15/08/2026'))).toBe('15/08/2026')
    })
  })

  describe('mapperDonneesCreationEncaissementVersDepot', () => {
    it('convertit la commande camelCase du renderer en saisie snake_case du dépôt (JJ/MM/AAAA → ISO)', () => {
      const donnees: DonneesCreationEncaissement = {
        factureId: 7,
        montantEncaisseCentimes: 150000,
        dateEncaissement: '02/07/2026',
        modeReglementEffectif: 'ESPECES',
        timbreStatut: 'TRAITE',
        montantTimbreSaisiCentimes: 500,
        timbreTraiteLe: '03/07/2026',
        timbreTraitePar: 'Sami',
        referenceTimbreOuQuittance: 'QUIT-2026-0001',
        commentaireTimbre: 'Quittance bancaire',
      }
      expect(mapperDonneesCreationEncaissementVersDepot(donnees)).toEqual({
        facture_id: 7,
        montant_encaisse_centimes: 150000,
        date_encaissement: '2026-07-02',
        mode_reglement_effectif: 'ESPECES',
        timbre_statut: 'TRAITE',
        montant_timbre_saisi_centimes: 500,
        timbre_traite_le: '2026-07-03',
        timbre_traite_par: 'Sami',
        reference_timbre_ou_quittance: 'QUIT-2026-0001',
        commentaire_timbre: 'Quittance bancaire',
      })
    })

    it('n’introduit aucune clé pour les champs facultatifs absents', () => {
      const mappe = mapperDonneesCreationEncaissementVersDepot({
        factureId: 7,
        montantEncaisseCentimes: 100000,
        dateEncaissement: '15/08/2026',
        modeReglementEffectif: 'CHEQUE',
      })
      expect(mappe.facture_id).toBe(7)
      expect(mappe.date_encaissement).toBe('2026-08-15')
      expect(mappe.montant_encaisse_centimes).toBe(100000)
      expect(mappe.timbre_statut).toBeUndefined()
      expect(mappe.montant_timbre_saisi_centimes).toBeUndefined()
      expect(mappe.timbre_traite_le).toBeUndefined()
      expect(mappe.timbre_traite_par).toBeUndefined()
      expect(mappe.reference_timbre_ou_quittance).toBeUndefined()
      expect(mappe.commentaire_timbre).toBeUndefined()
    })

    it('rejette une date invalide lors de la conversion', () => {
      expect(() =>
        mapperDonneesCreationEncaissementVersDepot({
          factureId: 7,
          montantEncaisseCentimes: 100000,
          dateEncaissement: '31/02/2026',
          modeReglementEffectif: 'CHEQUE',
        }),
      ).toThrow(/jour invalide/)
      expect(() =>
        mapperDonneesCreationEncaissementVersDepot({
          factureId: 7,
          montantEncaisseCentimes: 100000,
          dateEncaissement: '15/08/2026',
          modeReglementEffectif: 'CHEQUE',
          timbreTraiteLe: '32/08/2026',
        }),
      ).toThrow(/jour invalide/)
    })
  })

  describe('mapperDonneesModificationVersDepot', () => {
    it('convertit la commande camelCase du renderer en modification snake_case du dépôt (JJ/MM/AAAA → ISO)', () => {
      const donnees: DonneesModificationTimbreEncaissementVue = {
        id: 9,
        timbreStatut: 'TRAITE',
        montantTimbreSaisiCentimes: 500,
        timbreTraiteLe: '16/08/2026',
        timbreTraitePar: 'Sami',
        referenceTimbreOuQuittance: 'QUIT-2026-0002',
        commentaireTimbre: 'Quittance bancaire',
      }
      expect(mapperDonneesModificationVersDepot(donnees)).toEqual({
        id: 9,
        timbre_statut: 'TRAITE',
        montant_timbre_saisi_centimes: 500,
        timbre_traite_le: '2026-08-16',
        timbre_traite_par: 'Sami',
        reference_timbre_ou_quittance: 'QUIT-2026-0002',
        commentaire_timbre: 'Quittance bancaire',
      })
    })

    it('n’introduit aucune clé pour les champs facultatifs absents', () => {
      const mappe = mapperDonneesModificationVersDepot({ id: 9, timbreStatut: 'NON_APPLICABLE' })
      expect(mappe.id).toBe(9)
      expect(mappe.timbre_statut).toBe('NON_APPLICABLE')
      expect(mappe.montant_timbre_saisi_centimes).toBeUndefined()
      expect(mappe.timbre_traite_le).toBeUndefined()
      expect(mappe.timbre_traite_par).toBeUndefined()
      expect(mappe.reference_timbre_ou_quittance).toBeUndefined()
      expect(mappe.commentaire_timbre).toBeUndefined()
    })

    it('rejette une date de traitement invalide lors de la conversion', () => {
      expect(() =>
        mapperDonneesModificationVersDepot({
          id: 9,
          timbreStatut: 'TRAITE',
          montantTimbreSaisiCentimes: 500,
          timbreTraiteLe: '31/02/2026',
          timbreTraitePar: 'Sami',
        }),
      ).toThrow(/jour invalide/)
    })

    it('n’expose aucun champ protégé dans DonneesModificationTimbreEncaissement', () => {
      const mappe = mapperDonneesModificationVersDepot({ id: 9, timbreStatut: 'TRAITE' })
      const cles = Object.keys(mappe)
      expect(cles).not.toContain('montant_encaisse_centimes')
      expect(cles).not.toContain('mode_reglement_effectif')
      expect(cles).not.toContain('facture_id')
      expect(cles).not.toContain('date_encaissement')
      expect(cles).not.toContain('numero')
    })
  })

  describe('mapperEncaissementEnVue', () => {
    const enregistrement: EnregistrementEncaissement = {
      id: 9,
      cree_le: '2026-08-15 10:00:00',
      modifie_le: '2026-08-15 10:00:00',
      supprime_le: null,
      facture_id: 7,
      numero: 'ENC-2026-0001',
      montant_encaisse_centimes: 150000,
      date_encaissement: '2026-07-02',
      mode_reglement_effectif: 'ESPECES',
      timbre_statut: 'TRAITE',
      montant_timbre_saisi_centimes: 500,
      timbre_traite_le: '2026-07-03',
      timbre_traite_par: 'Sami',
      reference_timbre_ou_quittance: 'QUIT-2026-0001',
      commentaire_timbre: null,
    }

    it('convertit les colonnes snake_case en vue camelCase et les dates en JJ/MM/AAAA', () => {
      expect(mapperEncaissementEnVue(enregistrement)).toEqual({
        id: 9,
        factureId: 7,
        numero: 'ENC-2026-0001',
        montantEncaisseCentimes: 150000,
        dateEncaissement: '02/07/2026',
        modeReglementEffectif: 'ESPECES',
        timbreStatut: 'TRAITE',
        montantTimbreSaisiCentimes: 500,
        timbreTraiteLe: '03/07/2026',
        timbreTraitePar: 'Sami',
        referenceTimbreOuQuittance: 'QUIT-2026-0001',
        commentaireTimbre: null,
        creeLe: '2026-08-15 10:00:00',
        modifieLe: '2026-08-15 10:00:00',
        supprimeLe: null,
      })
    })

    it('conserve les champs timbre absents et supprime_le à null', () => {
      const vue = mapperEncaissementEnVue({
        ...enregistrement,
        timbre_statut: 'NON_APPLICABLE',
        montant_timbre_saisi_centimes: null,
        timbre_traite_le: null,
        timbre_traite_par: null,
        reference_timbre_ou_quittance: null,
      })
      expect(vue.timbreStatut).toBe('NON_APPLICABLE')
      expect(vue.montantTimbreSaisiCentimes).toBeNull()
      expect(vue.timbreTraiteLe).toBeNull()
      expect(vue.timbreTraitePar).toBeNull()
      expect(vue.referenceTimbreOuQuittance).toBeNull()
      expect(vue.supprimeLe).toBeNull()
    })
  })
})

describe('Frontière contrats/ → domaine/', () => {
  it('les vues de contrats/ n’importent rien depuis domaine/', () => {
    const dossier = join(racineProjet, 'contrats')
    const fichiers = readdirSync(dossier).filter((fichier) => fichier.endsWith('.ts'))
    expect(fichiers.length).toBeGreaterThan(0)
    expect(fichiers).toContain('encaissements.ts')
    for (const fichier of fichiers) {
      const contenu = readFileSync(join(dossier, fichier), 'utf8')
      expect(contenu).not.toMatch(/from\s+['"]\.\.\/domaine(?:\/|['"])/)
      expect(contenu).not.toMatch(/from\s+['"]domaine\//)
    }
  })
})
