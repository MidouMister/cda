import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import { lireCompteur } from '../electron/depots/depot-compteurs'
import { enregistrerHandlersEncaissements } from '../electron/ipc/ipc-encaissements'
import type { EnregistreurIpc } from '../electron/ipc/enregistrer-ipc'
import { CANAUX } from '../contrats'
import type { DonneesCreationEncaissement, EncaissementVue } from '../contrats'

const CLE_VALIDE = 'clé-de-test-ipc-encaissements-egto'
const CHEMIN_ESSAI = join(tmpdir(), `egto-ipc-encaissements-${randomUUID()}.db`)

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

interface Capture {
  canal: string
  appel: (evenement: unknown, ...args: unknown[]) => unknown
}

// Mock d'EnregistreurIpc : capture chaque enregistrement pour pouvoir appeler
// la fonction handler exactement comme le ferait ipcMain.handle/invoke.
let captures: Capture[] = []

const creerEnregistreurMock = (): EnregistreurIpc => ({
  handle(canal, appel) {
    captures.push({ canal, appel })
  },
})

const appeler = (canal: string, ...args: unknown[]): unknown => {
  const capture = captures.find((c) => c.canal === canal)
  if (capture === undefined) {
    throw new Error(`Aucun handler enregistré pour le canal « ${canal} ».`)
  }
  return capture.appel(null, ...args)
}

let compteur = 0

const creerClient = (base: Base): number => {
  compteur += 1
  const insertion = base
    .prepare(
      `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
       VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
    )
    .run(`CLI-IPC-ENC-${compteur}`, `Client IPC Encaissement n°${compteur}`)
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

const commande = (
  factureId: number,
  montant: number,
  partiel: Partial<DonneesCreationEncaissement> = {},
): DonneesCreationEncaissement => ({
  factureId,
  montantEncaisseCentimes: montant,
  dateEncaissement: '15/08/2026',
  modeReglementEffectif: 'CHEQUE',
  ...partiel,
})

describe('Handlers IPC encaissements (M22) — mock EnregistreurIpc + base réelle', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
    captures = []
    enregistrerHandlersEncaissements(creerEnregistreurMock(), () => obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  it('n’enregistre que les quatre canaux encaissements, sans canal SQL générique', () => {
    const noms = captures.map((capture) => capture.canal).sort()
    expect(noms).toEqual(
      [
        CANAUX.encaissements.creer,
        CANAUX.encaissements.lister,
        CANAUX.encaissements.modifierTimbre,
        CANAUX.encaissements.supprimer,
      ].sort(),
    )
    expect(noms).not.toContain(/sql|exec|requete|raw/i)
  })

  describe('chemin complet : validation renderer → domaine → dépôt → vue', () => {
    it('crée un encaissement valide et retourne la vue avec numéro ENC et dates JJ/MM/AAAA', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const avant = lireCompteur(base, 'ENC', 2026)?.dernierNumero ?? 0
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 150000)) as EncaissementVue
      expect(vue).toMatchObject({
        id: expect.any(Number),
        factureId,
        numero: `ENC-2026-${String(avant + 1).padStart(4, '0')}`,
        montantEncaisseCentimes: 150000,
        dateEncaissement: '15/08/2026',
        modeReglementEffectif: 'CHEQUE',
        timbreStatut: 'A_VERIFIER',
        montantTimbreSaisiCentimes: null,
        timbreTraiteLe: null,
        timbreTraitePar: null,
        referenceTimbreOuQuittance: null,
        commentaireTimbre: null,
        supprimeLe: null,
      })
      expect(vue.creeLe).toEqual(expect.any(String))
      expect(vue.modifieLe).toEqual(expect.any(String))
      const nombreLignes = base
        .prepare('SELECT COUNT(*) AS n FROM encaissements WHERE id = ? AND supprime_le IS NULL')
        .get(vue.id) as { n: number }
      expect(nombreLignes.n).toBe(1)
      expect(lireCompteur(base, 'ENC', 2026)?.dernierNumero).toBe(avant + 1)
    })

    it('crée un encaissement complet avec timbre TRAITE (date convertie en ISO en base)', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(
        CANAUX.encaissements.creer,
        commande(factureId, 200000, {
          modeReglementEffectif: 'ESPECES',
          timbreStatut: 'TRAITE',
          montantTimbreSaisiCentimes: 500,
          timbreTraiteLe: '16/08/2026',
          timbreTraitePar: 'Sami',
          referenceTimbreOuQuittance: 'QUIT-2026-0002',
        }),
      ) as EncaissementVue
      expect(vue.dateEncaissement).toBe('15/08/2026')
      expect(vue.timbreTraiteLe).toBe('16/08/2026')
      const brute = base.prepare('SELECT date_encaissement, timbre_traite_le FROM encaissements WHERE id = ?').get(
        vue.id,
      ) as { date_encaissement: string; timbre_traite_le: string }
      expect(brute.date_encaissement).toBe('2026-08-15')
      expect(brute.timbre_traite_le).toBe('2026-08-16')
    })

    it.each(['TRAITE', 'LCN', 'VIREMENT'] as const)(
      'rejette le mode %s comme mode de règlement effectif',
      (mode) => {
        const factureId = creerFacture(obtenirBase(), 1000000000)
        expect(() =>
          appeler(CANAUX.encaissements.creer, {
            factureId,
            montantEncaisseCentimes: 100000,
            dateEncaissement: '15/08/2026',
            modeReglementEffectif: mode,
          }),
        ).toThrow(/modeReglementEffectif.*valeur inconnue/)
      },
    )

    it('rejette un montant nul ou négatif', () => {
      const factureId = creerFacture(obtenirBase(), 1000000000)
      expect(() => appeler(CANAUX.encaissements.creer, commande(factureId, 0))).toThrow(/montantEncaisseCentimes/)
      expect(() => appeler(CANAUX.encaissements.creer, commande(factureId, -5))).toThrow(/montantEncaisseCentimes/)
    })

    it('rejette une date calendaire invalide (31/02/2026)', () => {
      const factureId = creerFacture(obtenirBase(), 1000000000)
      expect(() =>
        appeler(CANAUX.encaissements.creer, commande(factureId, 100000, { dateEncaissement: '31/02/2026' })),
      ).toThrow(/jour invalide/)
    })

    it('rejette un timbre NON_APPLICABLE avec un montant saisi', () => {
      const factureId = creerFacture(obtenirBase(), 1000000000)
      expect(() =>
        appeler(
          CANAUX.encaissements.creer,
          commande(factureId, 100000, { timbreStatut: 'NON_APPLICABLE', montantTimbreSaisiCentimes: 500 }),
        ),
      ).toThrow(/NON_APPLICABLE/)
    })

    it('rejette un timbre TRAITE sans date ou sans responsable de traitement', () => {
      const factureId = creerFacture(obtenirBase(), 1000000000)
      expect(() =>
        appeler(
          CANAUX.encaissements.creer,
          commande(factureId, 100000, {
            timbreStatut: 'TRAITE',
            montantTimbreSaisiCentimes: 500,
            timbreTraitePar: 'Sami',
          }),
        ),
      ).toThrow(/date de traitement/)
      expect(() =>
        appeler(
          CANAUX.encaissements.creer,
          commande(factureId, 100000, {
            timbreStatut: 'TRAITE',
            montantTimbreSaisiCentimes: 500,
            timbreTraiteLe: '16/08/2026',
          }),
        ),
      ).toThrow(/responsable/)
    })

    it('rejette un dépassement du montant dû et ne laisse aucune ligne', () => {
      const factureId = creerFacture(obtenirBase(), 100000)
      expect(() => appeler(CANAUX.encaissements.creer, commande(factureId, 100001))).toThrow(/dépassement du montant dû/)
      const liste = appeler(CANAUX.encaissements.lister, factureId) as EncaissementVue[]
      expect(liste).toHaveLength(0)
    })

    it('passe la facture à PAYEE au solde nul via le chemin complet', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 100000)
      appeler(CANAUX.encaissements.creer, commande(factureId, 100000))
      const statut = base.prepare('SELECT statut FROM factures WHERE id = ?').get(factureId) as { statut: string }
      expect(statut.statut).toBe('PAYEE')
    })
  })

  describe('lister', () => {
    it('liste les encaissements d’une facture, triés, avec des dates JJ/MM/AAAA', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const autreFactureId = creerFacture(base, 1000000000)
      appeler(CANAUX.encaissements.creer, commande(autreFactureId, 100000))
      const vueTardive = appeler(
        CANAUX.encaissements.creer,
        commande(factureId, 100000, { dateEncaissement: '01/08/2026' }),
      ) as EncaissementVue
      const vuePrecoce = appeler(
        CANAUX.encaissements.creer,
        commande(factureId, 100000, { dateEncaissement: '15/07/2026' }),
      ) as EncaissementVue
      const liste = appeler(CANAUX.encaissements.lister, factureId) as EncaissementVue[]
      expect(liste.map((e) => e.id)).toEqual([vuePrecoce.id, vueTardive.id])
      for (const vue of liste) {
        expect(vue.dateEncaissement).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(vue.supprimeLe).toBeNull()
      }
    })

    it('liste tous les encaissements sans factureId', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 100000)) as EncaissementVue
      const toutes = appeler(CANAUX.encaissements.lister) as EncaissementVue[]
      expect(toutes.map((e) => e.id)).toContain(vue.id)
    })

    it('rejette un factureId invalide à la lecture', () => {
      expect(() => appeler(CANAUX.encaissements.lister, 0)).toThrow(/factureId/)
      expect(() => appeler(CANAUX.encaissements.lister, 'abc')).toThrow(/factureId/)
    })
  })

  describe('supprimer', () => {
    it('supprime un encaissement : true puis absent de la liste', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 100000)) as EncaissementVue
      expect(appeler(CANAUX.encaissements.supprimer, vue.id)).toBe(true)
      const liste = appeler(CANAUX.encaissements.lister, factureId) as EncaissementVue[]
      expect(liste.some((e) => e.id === vue.id)).toBe(false)
      expect(appeler(CANAUX.encaissements.supprimer, vue.id)).toBe(false)
    })

    it('rejette un identifiant invalide à la suppression', () => {
      expect(() => appeler(CANAUX.encaissements.supprimer, 0)).toThrow(/« id »/)
      expect(() => appeler(CANAUX.encaissements.supprimer, 'x')).toThrow(/« id »/)
    })
  })

  describe('modifierTimbre', () => {
    it('traite le timbre d’un encaissement A_VERIFIER → TRAITE et retourne la vue en dates JJ/MM/AAAA', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 150000)) as EncaissementVue
      expect(vue.timbreStatut).toBe('A_VERIFIER')
      const modifie = appeler(CANAUX.encaissements.modifierTimbre, {
        id: vue.id,
        timbreStatut: 'TRAITE',
        montantTimbreSaisiCentimes: 500,
        timbreTraiteLe: '16/08/2026',
        timbreTraitePar: 'Sami',
        referenceTimbreOuQuittance: 'QUIT-2026-0002',
      }) as EncaissementVue
      expect(modifie).toMatchObject({
        id: vue.id,
        factureId,
        numero: vue.numero,
        montantEncaisseCentimes: vue.montantEncaisseCentimes,
        dateEncaissement: '15/08/2026',
        modeReglementEffectif: 'CHEQUE',
        timbreStatut: 'TRAITE',
        montantTimbreSaisiCentimes: 500,
        timbreTraiteLe: '16/08/2026',
        timbreTraitePar: 'Sami',
        referenceTimbreOuQuittance: 'QUIT-2026-0002',
      })
      const brute = base.prepare('SELECT timbre_statut, timbre_traite_le FROM encaissements WHERE id = ?').get(
        vue.id,
      ) as { timbre_statut: string; timbre_traite_le: string }
      expect(brute.timbre_statut).toBe('TRAITE')
      expect(brute.timbre_traite_le).toBe('2026-08-16')
    })

    it('rejette un identifiant invalide', () => {
      expect(() => appeler(CANAUX.encaissements.modifierTimbre, { id: 0, timbreStatut: 'TRAITE' })).toThrow(
        /« id »/,
      )
      expect(() => appeler(CANAUX.encaissements.modifierTimbre, { id: 'x', timbreStatut: 'TRAITE' })).toThrow(
        /« id »/,
      )
    })

    it('rejette un timbreStatut inconnu', () => {
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, { id: 1, timbreStatut: 'INCONNU' }),
      ).toThrow(/timbreStatut.*valeur inconnue/)
    })

    it('rejette un montantTimbreSaisiCentimes négatif', () => {
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, { id: 1, timbreStatut: 'TRAITE', montantTimbreSaisiCentimes: -1 }),
      ).toThrow(/montantTimbreSaisiCentimes/)
    })

    it('rejette une date de traitement calendaire invalide (31/02/2026)', () => {
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, {
          id: 1,
          timbreStatut: 'TRAITE',
          timbreTraiteLe: '31/02/2026',
        }),
      ).toThrow(/jour invalide/)
    })

    it('rejette NON_APPLICABLE avec une date de traitement (validation domaine remonte)', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 100000)) as EncaissementVue
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, {
          id: vue.id,
          timbreStatut: 'NON_APPLICABLE',
          timbreTraiteLe: '16/08/2026',
        }),
      ).toThrow(/NON_APPLICABLE/)
    })

    it('rejette TRAITE sans date de traitement', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 100000)) as EncaissementVue
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, {
          id: vue.id,
          timbreStatut: 'TRAITE',
          montantTimbreSaisiCentimes: 500,
          timbreTraitePar: 'Sami',
        }),
      ).toThrow(/date de traitement/)
    })

    it('rejette un encaissement introuvable ou supprimé', () => {
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, { id: 999999, timbreStatut: 'TRAITE' }),
      ).toThrow(/Encaissement introuvable ou supprimé/)
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(CANAUX.encaissements.creer, commande(factureId, 100000)) as EncaissementVue
      appeler(CANAUX.encaissements.supprimer, vue.id)
      expect(() =>
        appeler(CANAUX.encaissements.modifierTimbre, { id: vue.id, timbreStatut: 'TRAITE' }),
      ).toThrow(/Encaissement introuvable ou supprimé/)
    })

    it('n’altère jamais les champs protégés (montant, mode, facture, date, numéro)', () => {
      const base = obtenirBase()
      const factureId = creerFacture(base, 1000000000)
      const vue = appeler(
        CANAUX.encaissements.creer,
        commande(factureId, 150000, {
          modeReglementEffectif: 'ESPECES',
          dateEncaissement: '02/07/2026',
        }),
      ) as EncaissementVue
      appeler(CANAUX.encaissements.modifierTimbre, {
        id: vue.id,
        timbreStatut: 'TRAITE',
        montantTimbreSaisiCentimes: 500,
        timbreTraiteLe: '16/08/2026',
        timbreTraitePar: 'Sami',
        referenceTimbreOuQuittance: 'QUIT-2026-0002',
      })
      const brute = base
        .prepare(
          `SELECT montant_encaisse_centimes, mode_reglement_effectif, facture_id, date_encaissement, numero
             FROM encaissements WHERE id = ?`,
        )
        .get(vue.id) as {
        montant_encaisse_centimes: number
        mode_reglement_effectif: string
        facture_id: number
        date_encaissement: string
        numero: string
      }
      expect(brute.montant_encaisse_centimes).toBe(150000)
      expect(brute.mode_reglement_effectif).toBe('ESPECES')
      expect(brute.facture_id).toBe(factureId)
      expect(brute.date_encaissement).toBe('2026-07-02')
      expect(brute.numero).toBe(vue.numero)
    })
  })
})
