import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import { lireCompteur } from '../electron/depots/depot-compteurs'
import {
  creerEncaissement,
  lireEncaissement,
  listerEncaissements,
  modifierTraitementTimbreEncaissement,
  supprimerEncaissement,
  type DonneesModificationTimbreEncaissement,
  type DonneesSaisieEncaissement,
} from '../electron/depots/depot-encaissements'
import type { ModeReglementEffectif } from '../domaine/entites-referentielles'

const CLE_VALIDE = 'clé-de-test-depot-encaissements-egto'
const CHEMIN_ESSAI = join(tmpdir(), `egto-depot-encaissements-${randomUUID()}.db`)

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

let compteur = 0

const creerClient = (base: Base): number => {
  compteur += 1
  const insertion = base
    .prepare(
      `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
       VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
    )
    .run(`CLI-ENC-${compteur}`, `Client Encaissement n°${compteur}`)
  return Number(insertion.lastInsertRowid)
}

const creerFacture = (base: Base, montantDuCentimes: number, statut = 'ENVOYEE'): number => {
  const idClient = creerClient(base)
  const insertion = base
    .prepare(
      `INSERT INTO factures (type_document, date_facture, client_id, statut, net_a_payer_centimes)
       VALUES ('FA', '2026-08-15', ?, ?, ?)`,
    )
    .run(idClient, statut, montantDuCentimes)
  return Number(insertion.lastInsertRowid)
}

const saisie = (
  factureId: number,
  montant: number,
  partiel: Partial<DonneesSaisieEncaissement> = {},
): DonneesSaisieEncaissement => ({
  facture_id: factureId,
  montant_encaisse_centimes: montant,
  date_encaissement: '2026-08-15',
  mode_reglement_effectif: 'CHEQUE',
  ...partiel,
})

const lireStatutFacture = (base: Base, factureId: number): string => {
  const ligne = base.prepare('SELECT statut FROM factures WHERE id = ?').get(factureId) as { statut: string }
  return ligne.statut
}

const traitementTRAITE = (
  id: number,
  partiel: Partial<DonneesModificationTimbreEncaissement> = {},
): DonneesModificationTimbreEncaissement => ({
  id,
  timbre_statut: 'TRAITE',
  montant_timbre_saisi_centimes: 500,
  timbre_traite_le: '2026-08-16',
  timbre_traite_par: 'Sami',
  ...partiel,
})

describe('Dépôt encaissements (M21) — base chiffrée temporaire', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  describe('création et numérotation ENC', () => {
    it('attribue des numéros ENC séquentiels à la création', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const depart = lireCompteur(base, 'ENC', 2026)?.dernierNumero ?? 0
      const idPremier = creerEncaissement(base, saisie(factureId, 100000))
      const idSecond = creerEncaissement(base, saisie(factureId, 100000))
      const numeroPremier = lireEncaissement(base, idPremier)?.numero
      const numeroSecond = lireEncaissement(base, idSecond)?.numero
      expect(numeroPremier).toBe(`ENC-2026-${String(depart + 1).padStart(4, '0')}`)
      expect(numeroSecond).toBe(`ENC-2026-${String(depart + 2).padStart(4, '0')}`)
      expect(lireCompteur(base, 'ENC', 2026)?.dernierNumero).toBe(depart + 2)
    })

    it('numérote par année : une année vierge démarre à ENC-AAAA-0001', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const id = creerEncaissement(base, saisie(factureId, 100000, { date_encaissement: '2025-03-10' }))
      expect(lireEncaissement(base, id)?.numero).toBe('ENC-2025-0001')
    })

    it('insère et relit un encaissement complet', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const id = creerEncaissement(
        base,
        saisie(factureId, 150000, {
          date_encaissement: '2026-07-02',
          mode_reglement_effectif: 'ESPECES',
          timbre_statut: 'TRAITE',
          montant_timbre_saisi_centimes: 500,
          timbre_traite_le: '2026-07-03',
          timbre_traite_par: 'Sami',
          reference_timbre_ou_quittance: 'QUIT-2026-0001',
        }),
      )
      const encaissement = lireEncaissement(base, id)
      expect(encaissement).not.toBeNull()
      expect(encaissement?.numero).toMatch(/^ENC-\d{4}-\d{4,}$/)
      expect(encaissement).toMatchObject({
        id,
        facture_id: factureId,
        montant_encaisse_centimes: 150000,
        date_encaissement: '2026-07-02',
        mode_reglement_effectif: 'ESPECES',
        timbre_statut: 'TRAITE',
        montant_timbre_saisi_centimes: 500,
        timbre_traite_le: '2026-07-03',
        timbre_traite_par: 'Sami',
        reference_timbre_ou_quittance: 'QUIT-2026-0001',
      })
      expect(encaissement?.supprime_le).toBeNull()
    })

    it('liste les encaissements actifs d’une facture, triés par date puis numéro', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const autreFactureId = creerFacture(base, 1000000000)
      creerEncaissement(base, saisie(autreFactureId, 100000))
      const idTardif = creerEncaissement(base, saisie(factureId, 100000, { date_encaissement: '2026-08-01' }))
      const idPrecoce = creerEncaissement(base, saisie(factureId, 100000, { date_encaissement: '2026-07-15' }))
      const liste = listerEncaissements(base, factureId)
      expect(liste.map((e) => e.id)).toEqual([idPrecoce, idTardif])
      expect(listerEncaissements(base).map((e) => e.id)).toContain(idPrecoce)
    })

    it('rejette un encaissement pour une facture introuvable', () => {
      const base = obtenirBase()
      expect(() => creerEncaissement(base, saisie(999999, 100000))).toThrow(/introuvable/)
    })
  })

  describe('rejets de validation', () => {
    it('rejette un montant nul ou négatif', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      expect(() => creerEncaissement(base, saisie(factureId, 0))).toThrow(/strictement positif/)
      expect(() => creerEncaissement(base, saisie(factureId, -5))).toThrow(/strictement positif/)
    })

    it.each(['TRAITE', 'LCN', 'VIREMENT'] as const)(
      'rejette le mode %s comme mode de règlement effectif',
      (mode) => {
        const base = obtenirBase()
        const factureId = creerFacture(base, 1000000000)
        expect(() =>
          creerEncaissement(base, saisie(factureId, 100000, { mode_reglement_effectif: mode as ModeReglementEffectif })),
        ).toThrow(/mode de règlement effectif/)
      },
    )

    it('rejette une date calendaire invalide', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      expect(() => creerEncaissement(base, saisie(factureId, 100000, { date_encaissement: '2026-02-30' }))).toThrow(
        /jour invalide/,
      )
    })

    it('rejette un timbre NON_APPLICABLE avec un montant, une date ou un responsable renseigné', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      expect(() =>
        creerEncaissement(base, saisie(factureId, 100000, { timbre_statut: 'NON_APPLICABLE', montant_timbre_saisi_centimes: 500 })),
      ).toThrow(/NON_APPLICABLE/)
      expect(() =>
        creerEncaissement(base, saisie(factureId, 100000, { timbre_statut: 'NON_APPLICABLE', timbre_traite_le: '2026-08-16' })),
      ).toThrow(/NON_APPLICABLE/)
      expect(() =>
        creerEncaissement(base, saisie(factureId, 100000, { timbre_statut: 'NON_APPLICABLE', timbre_traite_par: 'Sami' })),
      ).toThrow(/NON_APPLICABLE/)
    })

    it('rejette un timbre TRAITE sans date ou sans responsable de traitement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      expect(() =>
        creerEncaissement(
          base,
          saisie(factureId, 100000, {
            timbre_statut: 'TRAITE',
            montant_timbre_saisi_centimes: 500,
            timbre_traite_par: 'Sami',
          }),
        ),
      ).toThrow(/date de traitement/)
      expect(() =>
        creerEncaissement(
          base,
          saisie(factureId, 100000, {
            timbre_statut: 'TRAITE',
            montant_timbre_saisi_centimes: 500,
            timbre_traite_le: '2026-08-16',
          }),
        ),
      ).toThrow(/responsable/)
    })

    it('rejette un timbre A_VERIFIER avec une date ou un responsable de traitement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      expect(() =>
        creerEncaissement(base, saisie(factureId, 100000, { timbre_statut: 'A_VERIFIER', timbre_traite_le: '2026-08-16' })),
      ).toThrow(/A_VERIFIER/)
      expect(() =>
        creerEncaissement(base, saisie(factureId, 100000, { timbre_statut: 'A_VERIFIER', timbre_traite_par: 'Sami' })),
      ).toThrow(/A_VERIFIER/)
    })
  })

  describe('anti-dépassement du montant dû', () => {
    it('rejette au niveau du dépôt un encaissement qui dépasse le montant dû', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      expect(() => creerEncaissement(base, saisie(factureId, 100001))).toThrow(/dépassement du montant dû/)
      expect(listerEncaissements(base, factureId)).toHaveLength(0)
    })

    it('rejette au niveau des triggers SQL (RAISE ABORT) un dépassement par cumul', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      creerEncaissement(base, saisie(factureId, 60000))
      expect(() =>
        base
          .prepare(
            `INSERT INTO encaissements (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif)
             VALUES (?, ?, 50000, '2026-08-15', 'CHEQUE')`,
          )
          .run(factureId, 'ENC-TRIGGER-2026-0001'),
      ).toThrow(/dépassement du montant dû/)
    })

    it('accepte des encaissements successifs jusqu’au montant dû exact', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      creerEncaissement(base, saisie(factureId, 60000))
      creerEncaissement(base, saisie(factureId, 40000))
      const somme = base
        .prepare(
          `SELECT COALESCE(SUM(montant_encaisse_centimes), 0) AS n
             FROM encaissements WHERE facture_id = ? AND supprime_le IS NULL`,
        )
        .get(factureId) as { n: number }
      expect(somme.n).toBe(100000)
    })
  })

  describe('passage à PAYEE au solde nul', () => {
    it('passe la facture ENVOYEE à PAYEE lorsque le solde devient nul', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      creerEncaissement(base, saisie(factureId, 100000))
      expect(lireStatutFacture(base, factureId)).toBe('PAYEE')
    })

    it('laisse le statut inchangé pour un encaissement partiel', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      creerEncaissement(base, saisie(factureId, 40000))
      expect(lireStatutFacture(base, factureId)).toBe('ENVOYEE')
    })

    it('rejette un encaissement qui solderait une facture ARCHIVEE (statut bloqué)', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000, 'ARCHIVEE')
      expect(() => creerEncaissement(base, saisie(factureId, 100000))).toThrow(
        /Seule une facture ENVOYEE peut être encaissée/,
      )
      expect(lireStatutFacture(base, factureId)).toBe('ARCHIVEE')
      expect(listerEncaissements(base, factureId)).toHaveLength(0)
    })
  })

  describe('blocage selon le statut de la facture (décision 16/08/2026)', () => {
    it.each(['BROUILLON', 'VALIDE', 'IMPRIMEE', 'PAYEE', 'ARCHIVEE'] as const)(
      'bloque tout encaissement sur une facture %s, même partiel',
      (statut) => {
        const base = obtenirBase()
        const factureId = creerFacture(base, 100000, statut)
        expect(() => creerEncaissement(base, saisie(factureId, 40000))).toThrow(
          new RegExp(`Encaissement interdit : la facture est au statut « ${statut} »`),
        )
        expect(() => creerEncaissement(base, saisie(factureId, 40000))).toThrow(
          /Seule une facture ENVOYEE peut être encaissée/,
        )
        expect(listerEncaissements(base, factureId)).toHaveLength(0)
      },
    )

    it('rejette un encaissement sur une facture PAYEE avec le message de statut, avant l’anti-dépassement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      creerEncaissement(base, saisie(factureId, 100000))
      expect(lireStatutFacture(base, factureId)).toBe('PAYEE')
      expect(() => creerEncaissement(base, saisie(factureId, 100000))).toThrow(
        /Encaissement interdit : la facture est au statut « PAYEE »/,
      )
      expect(() => creerEncaissement(base, saisie(factureId, 100000))).toThrow(
        /Seule une facture ENVOYEE peut être encaissée/,
      )
    })

    it('accepte un encaissement sur une facture ENVOYEE', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      const id = creerEncaissement(base, saisie(factureId, 40000))
      expect(lireEncaissement(base, id)).not.toBeNull()
      expect(lireStatutFacture(base, factureId)).toBe('ENVOYEE')
    })
  })

  describe('suppression logique', () => {
    it('masque un encaissement supprimé de la liste mais le conserve en base', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const id = creerEncaissement(base, saisie(factureId, 100000))
      expect(supprimerEncaissement(base, id)).toBe(true)
      expect(lireEncaissement(base, id)).toBeNull()
      expect(listerEncaissements(base, factureId)).toHaveLength(0)
      const brute = base.prepare('SELECT supprime_le FROM encaissements WHERE id = ?').get(id) as {
        supprime_le: string | null
      }
      expect(brute.supprime_le).not.toBeNull()
      expect(supprimerEncaissement(base, id)).toBe(false)
    })
  })

  describe('modifierTraitementTimbreEncaissement (décision 16/08/2026)', () => {
    it('passe A_VERIFIER à TRAITE complet : colonnes timbre mises à jour, champs financiers inchangés en base', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      const avant = lireEncaissement(base, id)
      expect(avant?.timbre_statut).toBe('A_VERIFIER')
      expect(avant).not.toBeNull()

      const modifie = modifierTraitementTimbreEncaissement(base, traitementTRAITE(id))
      expect(modifie).not.toBeNull()
      expect(modifie).toMatchObject({
        id,
        timbre_statut: 'TRAITE',
        montant_timbre_saisi_centimes: 500,
        timbre_traite_le: '2026-08-16',
        timbre_traite_par: 'Sami',
        reference_timbre_ou_quittance: null,
      })

      const apres = lireEncaissement(base, id)
      expect(apres).not.toBeNull()
      expect(apres?.facture_id).toBe(avant?.facture_id)
      expect(apres?.numero).toBe(avant?.numero)
      expect(apres?.montant_encaisse_centimes).toBe(avant?.montant_encaisse_centimes)
      expect(apres?.date_encaissement).toBe(avant?.date_encaissement)
      expect(apres?.mode_reglement_effectif).toBe(avant?.mode_reglement_effectif)
      expect(apres?.cree_le).toBe(avant?.cree_le)
      expect(apres?.supprime_le).toBeNull()
    })

    it('accepte TRAITE avec une référence de quittance', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      const modifie = modifierTraitementTimbreEncaissement(
        base,
        traitementTRAITE(id, { reference_timbre_ou_quittance: 'QUIT-2026-0002' }),
      )
      expect(modifie?.reference_timbre_ou_quittance).toBe('QUIT-2026-0002')
    })

    it('accepte TRAITE sans référence (référence facultative)', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      const modifie = modifierTraitementTimbreEncaissement(base, traitementTRAITE(id))
      expect(modifie?.reference_timbre_ou_quittance).toBeNull()
    })

    it('rejette NON_APPLICABLE avec montant, date ou responsable renseigné', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(
        base,
        saisie(factureId, 200000, {
          timbre_statut: 'TRAITE',
          montant_timbre_saisi_centimes: 500,
          timbre_traite_le: '2026-08-16',
          timbre_traite_par: 'Sami',
        }),
      )
      expect(() =>
        modifierTraitementTimbreEncaissement(base, { id, timbre_statut: 'NON_APPLICABLE', montant_timbre_saisi_centimes: 500 }),
      ).toThrow(/NON_APPLICABLE/)
      expect(() =>
        modifierTraitementTimbreEncaissement(base, { id, timbre_statut: 'NON_APPLICABLE', timbre_traite_le: '2026-08-16' }),
      ).toThrow(/NON_APPLICABLE/)
      expect(() =>
        modifierTraitementTimbreEncaissement(base, { id, timbre_statut: 'NON_APPLICABLE', timbre_traite_par: 'Sami' }),
      ).toThrow(/NON_APPLICABLE/)
      expect(lireEncaissement(base, id)?.timbre_statut).toBe('TRAITE')
    })

    it('rejette TRAITE sans date ou sans responsable de traitement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      expect(() => modifierTraitementTimbreEncaissement(base, traitementTRAITE(id, { timbre_traite_le: undefined }))).toThrow(
        /date de traitement/,
      )
      expect(() =>
        modifierTraitementTimbreEncaissement(base, traitementTRAITE(id, { timbre_traite_par: undefined })),
      ).toThrow(/responsable/)
    })

    it('rejette A_VERIFIER avec une date de traitement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      expect(() =>
        modifierTraitementTimbreEncaissement(base, { id, timbre_statut: 'A_VERIFIER', timbre_traite_le: '2026-08-16' }),
      ).toThrow(/A_VERIFIER/)
      expect(lireEncaissement(base, id)?.timbre_statut).toBe('A_VERIFIER')
    })

    it('retourne null pour un encaissement introuvable', () => {
      const base = obtenirBase()
      expect(modifierTraitementTimbreEncaissement(base, traitementTRAITE(999999))).toBeNull()
    })

    it('retourne null pour un encaissement supprimé logiquement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      expect(supprimerEncaissement(base, id)).toBe(true)
      expect(modifierTraitementTimbreEncaissement(base, traitementTRAITE(id))).toBeNull()
    })

    it('journalise l’UPDATE du traitement du timbre (ancien_etat ≠ nouvel_etat sur les colonnes timbre)', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000)
      const id = creerEncaissement(base, saisie(factureId, 200000))
      modifierTraitementTimbreEncaissement(base, traitementTRAITE(id))
      const ligne = base
        .prepare(
          `SELECT action, ancien_etat, nouvel_etat
             FROM journal_audit
            WHERE table_affectee = 'encaissements' AND ligne_id = ? AND action = 'UPDATE'
            ORDER BY id DESC LIMIT 1`,
        )
        .get(id) as { action: string; ancien_etat: string; nouvel_etat: string } | undefined
      expect(ligne).toBeDefined()
      expect(ligne?.action).toBe('UPDATE')
      const ancien = JSON.parse(ligne!.ancien_etat) as Record<string, unknown>
      const nouveau = JSON.parse(ligne!.nouvel_etat) as Record<string, unknown>
      expect(ancien.timbre_statut).toBe('A_VERIFIER')
      expect(nouveau.timbre_statut).toBe('TRAITE')
      expect(ancien).not.toEqual(nouveau)
    })

    it('ne change pas le statut PAYEE de la facture lors d’une modification de timbre', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      creerEncaissement(base, saisie(factureId, 100000))
      expect(lireStatutFacture(base, factureId)).toBe('PAYEE')
      const id = listerEncaissements(base, factureId)[0]?.id
      expect(id).toBeDefined()
      const modifie = modifierTraitementTimbreEncaissement(base, traitementTRAITE(id!))
      expect(modifie).not.toBeNull()
      expect(lireStatutFacture(base, factureId)).toBe('PAYEE')
    })
  })

  describe('audit par triggers', () => {
    it('journalise l’INSERT puis la suppression logique d’un encaissement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const id = creerEncaissement(base, saisie(factureId, 100000))
      const lireActions = (): string[] =>
        (
          base
            .prepare("SELECT action FROM journal_audit WHERE table_affectee = 'encaissements' AND ligne_id = ? ORDER BY id")
            .all(id) as { action: string }[]
        ).map((ligne) => ligne.action)
      expect(lireActions()).toEqual(['INSERT'])
      expect(supprimerEncaissement(base, id)).toBe(true)
      expect(lireActions()).toEqual(['INSERT', 'UPDATE'])
    })
  })

  describe('numérotation : jamais réutilisée', () => {
    it('n’attribue jamais deux fois le même numéro, même après suppression logique', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const idPremier = creerEncaissement(base, saisie(factureId, 100000))
      const numeroPremier = lireEncaissement(base, idPremier)?.numero
      expect(numeroPremier).toMatch(/^ENC-\d{4}-\d{4,}$/)
      supprimerEncaissement(base, idPremier)
      const idSecond = creerEncaissement(base, saisie(factureId, 100000))
      const numeroSecond = lireEncaissement(base, idSecond)?.numero
      expect(numeroSecond).not.toBe(numeroPremier)
      expect(numeroSecond).toMatch(/^ENC-\d{4}-\d{4,}$/)
    })
  })
})
