import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { enregistrerHandlersSession, type EtatSessionGere } from '../electron/ipc/ipc-session'
import type { EnregistreurIpc } from '../electron/ipc/enregistrer-ipc'
import { CompteurInactivite, type DepsSession } from '../electron/securite/session'
import { CANAUX } from '../contrats'

const MOT_DE_PASSE = 'monMotDePasse123'
const NOUVEAU_MDP = 'nouveauMotDePasse456'

interface Capture {
  canal: string
  appel: (_evenement: unknown, ...args: unknown[]) => unknown
}

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

let dossierUserData: string

const creerDepsReelles = (): DepsSession => ({
  ouvrirBase: () => ({ close: () => {} }),
  fermerBase: () => {},
  appliquerMigrations: () => {},
  insererSeeds: () => {},
})

const creerEtatSession = (): EtatSessionGere => ({
  dekCourante: null,
  base: null,
})

const deps = creerDepsReelles()
const compteur = new CompteurInactivite(300_000, () => {})
const noterActiviteSpy = vi.spyOn(compteur, 'noterActivite')

beforeAll(() => {
  dossierUserData = mkdtempSync(join(tmpdir(), 'egto-ipc-session-'))
})

afterAll(() => {
  rmSync(dossierUserData, { recursive: true, force: true })
})

describe('Handlers IPC session — mock EnregistreurIpc + deps réelles', () => {
  beforeAll(() => {
    captures = []
    enregistrerHandlersSession(creerEnregistreurMock(), () => dossierUserData, creerEtatSession, deps, compteur)
  })

  it('enregistre les 6 canaux session, sans canal SQL générique', () => {
    const noms = captures.map((c) => c.canal).sort()
    expect(noms).toEqual(
      [
        CANAUX.session.etat,
        CANAUX.session.premierDemarrage,
        CANAUX.session.deverrouiller,
        CANAUX.session.verrouiller,
        CANAUX.session.changerMotDePasse,
        CANAUX.session.activite,
      ].sort(),
    )
    expect(noms).not.toContainEqual(expect.stringMatching(/sql|exec|requete|raw/i))
  })

  describe('session.etat', () => {
    let etatSession: EtatSessionGere

    beforeAll(() => {
      captures = []
      etatSession = creerEtatSession()
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        () => etatSession,
        deps,
        compteur,
      )
    })

    it('session verrouillée, pas d\'enveloppes → verrouillee=true, premierDemarrage=true', () => {
      const resultat = appeler(CANAUX.session.etat) as {
        verrouillee: boolean
        premierDemarrage: boolean
      }
      expect(resultat.verrouillee).toBe(true)
      expect(resultat.premierDemarrage).toBe(true)
    })

    it('après premierDemarrage → verrouillee=true, premierDemarrage=false', async () => {
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      const resultat = appeler(CANAUX.session.etat) as {
        verrouillee: boolean
        premierDemarrage: boolean
      }
      expect(resultat.verrouillee).toBe(true)
      expect(resultat.premierDemarrage).toBe(false)
    })

    it('après deverrouiller → verrouillee=false, premierDemarrage=false', async () => {
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      await appeler(CANAUX.session.deverrouiller, { motDePasse: MOT_DE_PASSE })
      const resultat = appeler(CANAUX.session.etat) as {
        verrouillee: boolean
        premierDemarrage: boolean
      }
      expect(resultat.verrouillee).toBe(false)
      expect(resultat.premierDemarrage).toBe(false)
    })
  })

  describe('session.premierDemarrage', () => {
    beforeAll(() => {
      captures = []
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        creerEtatSession,
        deps,
        compteur,
      )
    })

    it('payload valide → crée les enveloppes, retourne une phrase', async () => {
      const resultat = (await appeler(CANAUX.session.premierDemarrage, {
        motDePasse: MOT_DE_PASSE,
      })) as { phrase: string }
      expect(resultat.phrase).toEqual(expect.any(String))
      expect(resultat.phrase.length).toBeGreaterThan(0)
    })

    it('payload null → TypeError', async () => {
      await expect(appeler(CANAUX.session.premierDemarrage, null)).rejects.toThrow(TypeError)
    })

    it('payload undefined → TypeError', async () => {
      await expect(appeler(CANAUX.session.premierDemarrage, undefined)).rejects.toThrow(TypeError)
    })

    it('payload sans motDePasse string → TypeError', async () => {
      await expect(appeler(CANAUX.session.premierDemarrage, { motDePasse: 123 })).rejects.toThrow(TypeError)
    })

    it('motDePasse trop court (<8) → Error', async () => {
      await expect(
        appeler(CANAUX.session.premierDemarrage, { motDePasse: 'court' }),
      ).rejects.toThrow(/au moins 8 caracteres/)
    })
  })

  describe('session.deverrouiller', () => {
    let etatSession: EtatSessionGere

    beforeAll(async () => {
      captures = []
      etatSession = creerEtatSession()
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        () => etatSession,
        deps,
        compteur,
      )
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
    })

    it('mot de passe correct → session ouverte (dekCourante non null)', async () => {
      await appeler(CANAUX.session.deverrouiller, { motDePasse: MOT_DE_PASSE })
      expect(etatSession.dekCourante).not.toBeNull()
      expect(etatSession.dekCourante).toBeInstanceOf(Buffer)
    })

    it('mot de passe incorrect → Error "Mot de passe incorrect."', async () => {
      etatSession.dekCourante = null
      await expect(
        appeler(CANAUX.session.deverrouiller, { motDePasse: 'mauvaisMotDePasse123' }),
      ).rejects.toThrow(/Mot de passe incorrect/)
    })

    it('payload null → TypeError', async () => {
      await expect(appeler(CANAUX.session.deverrouiller, null)).rejects.toThrow(TypeError)
    })

    it('payload undefined → TypeError', async () => {
      await expect(appeler(CANAUX.session.deverrouiller, undefined)).rejects.toThrow(TypeError)
    })

    it('payload sans motDePasse string → TypeError', async () => {
      await expect(appeler(CANAUX.session.deverrouiller, { motDePasse: 42 })).rejects.toThrow(TypeError)
    })
  })

  describe('session.verrouiller', () => {
    let etatSession: EtatSessionGere

    beforeAll(() => {
      captures = []
      etatSession = creerEtatSession()
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        () => etatSession,
        deps,
        compteur,
      )
    })

    it('après deverrouiller → session verrouillée (dekCourante null)', async () => {
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      await appeler(CANAUX.session.deverrouiller, { motDePasse: MOT_DE_PASSE })
      expect(etatSession.dekCourante).not.toBeNull()
      appeler(CANAUX.session.verrouiller)
      expect(etatSession.dekCourante).toBeNull()
    })

    it('session déjà verrouillée → Error "Session verrouillee."', () => {
      etatSession.dekCourante = null
      expect(() => appeler(CANAUX.session.verrouiller)).toThrow(/Session verrouillee/)
    })
  })

  describe('session.changerMotDePasse', () => {
    beforeAll(() => {
      captures = []
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        creerEtatSession,
        deps,
        compteur,
      )
    })

    it('ancien correct + nouveau valide → succès', async () => {
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      await expect(
        appeler(CANAUX.session.changerMotDePasse, {
          ancienMotDePasse: MOT_DE_PASSE,
          nouveauMotDePasse: NOUVEAU_MDP,
        }),
      ).resolves.toBeUndefined()
      await expect(
        appeler(CANAUX.session.deverrouiller, { motDePasse: NOUVEAU_MDP }),
      ).resolves.toBeUndefined()
    })

    it('ancien incorrect → Error "Mot de passe incorrect."', async () => {
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      await expect(
        appeler(CANAUX.session.changerMotDePasse, {
          ancienMotDePasse: 'mauvaisMotDePasse999',
          nouveauMotDePasse: NOUVEAU_MDP,
        }),
      ).rejects.toThrow(/Mot de passe incorrect/)
    })

    it('payload null → TypeError', async () => {
      await expect(appeler(CANAUX.session.changerMotDePasse, null)).rejects.toThrow(TypeError)
    })

    it('payload undefined → TypeError', async () => {
      await expect(appeler(CANAUX.session.changerMotDePasse, undefined)).rejects.toThrow(TypeError)
    })

    it('payload sans ancienMotDePasse string → TypeError', async () => {
      await expect(
        appeler(CANAUX.session.changerMotDePasse, { ancienMotDePasse: 123, nouveauMotDePasse: 'valide12345' }),
      ).rejects.toThrow(TypeError)
    })

    it('payload sans nouveauMotDePasse string → TypeError', async () => {
      await expect(
        appeler(CANAUX.session.changerMotDePasse, { ancienMotDePasse: 'valide12345', nouveauMotDePasse: 123 }),
      ).rejects.toThrow(TypeError)
    })
  })

  describe('session.activite', () => {
    beforeAll(() => {
      captures = []
      enregistrerHandlersSession(creerEnregistreurMock(), () => dossierUserData, creerEtatSession, deps, compteur)
    })

    it('appel → pas d\'erreur, compteurActivite.noterActivite() appelé', () => {
      noterActiviteSpy.mockClear()
      appeler(CANAUX.session.activite)
      expect(noterActiviteSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('absence de secrets dans les réponses', () => {
    beforeAll(() => {
      captures = []
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        creerEtatSession,
        deps,
        compteur,
      )
    })

    it('premierDemarrage ne retourne PAS la DEK, le mot de passe ou le blob', async () => {
      const resultat = (await appeler(CANAUX.session.premierDemarrage, {
        motDePasse: MOT_DE_PASSE,
      })) as Record<string, unknown>
      expect(resultat).not.toHaveProperty('dek')
      expect(resultat).not.toHaveProperty('dekCourante')
      expect(resultat).not.toHaveProperty('motDePasse')
      expect(resultat).not.toHaveProperty('blob')
      expect(resultat).not.toHaveProperty('cle')
      expect(Object.keys(resultat)).toEqual(['phrase'])
    })

    it('deverrouiller ne retourne PAS la DEK en dehors de etatSession', async () => {
      captures = []
      const etatSession = creerEtatSession()
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        () => etatSession,
        deps,
        compteur,
      )
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      const resultat = await appeler(CANAUX.session.deverrouiller, { motDePasse: MOT_DE_PASSE })
      expect(resultat).toBeUndefined()
      expect(etatSession.dekCourante).toBeInstanceOf(Buffer)
    })

    it('les erreurs ne révèlent pas le secret', async () => {
      const etatSession = creerEtatSession()
      enregistrerHandlersSession(
        creerEnregistreurMock(),
        () => dossierUserData,
        () => etatSession,
        deps,
        compteur,
      )
      await appeler(CANAUX.session.premierDemarrage, { motDePasse: MOT_DE_PASSE })
      try {
        await appeler(CANAUX.session.deverrouiller, { motDePasse: 'mauvaisMotDePasse123' })
        expect.fail('Aurait dû lever une erreur')
      } catch (erreur) {
        const message = (erreur as Error).message
        expect(message).not.toMatch(/dek|blob|sel|cle|hex/i)
      }
    })
  })

  describe('blocage IPC protégés', () => {
    it('les handlers non-session sont bloqués quand obtenirBase est absent', () => {
      let captureProtegee: Capture | null = null
      const mockProtegee: EnregistreurIpc = {
        handle(canal, appel) {
          captureProtegee = { canal, appel }
        },
      }
      const base = undefined as unknown as () => import('../electron/db/connexion').Base
      mockProtegee.handle('test.protected', () => {
        if (!base) throw new Error('obtenirBase : aucune base n est ouverte.')
        return base()
      })
      expect(() => captureProtegee!.appel(null)).toThrow(/aucune base/)
    })
  })
})
