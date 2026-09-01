import { randomUUID } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseEstOuverte, fermerBase, obtenirBase, ouvrirBase } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import {
  creerOrdonnanceurSauvegarde,
  estSauvegardeDue,
  INTERVALLE_VERIFICATION_MS,
  type DepsOrdonnanceurSauvegarde,
  type EntreeLogOrdonnanceur,
} from '../electron/ordonnanceur-sauvegarde'
import {
  configurerSauvegarde,
  lireParametre,
  mettreAJourParametre,
  SAUVEGARDE_DERNIERE_EXECUTION,
  SAUVEGARDE_DERNIERE_ERREUR,
  SAUVEGARDE_DESTINATION,
} from '../electron/depots/depot-parametres'
import {
  NOM_DOSSIER_ENVELOPPES,
  NOM_ENVELOPPE_RECOURS,
  NOM_FICHIER_BASE,
} from '../electron/sauvegarde'

const CLE_VALIDE = 'clé-test-ordonnanceur-sauvegarde'

describe('estSauvegardeDue', () => {
  const base = {
    activee: true,
    horaireQuotidienne: '03:00',
    maintenant: new Date(2026, 7, 28, 3, 0, 0, 0),
    derniereExecutionIso: null,
  }

  it('sauvegarde désactivée → jamais due', () => {
    expect(estSauvegardeDue({ ...base, activee: false })).toBe(false)
  })

  it('horaire invalide → jamais due', () => {
    expect(estSauvegardeDue({ ...base, horaireQuotidienne: '25:00' })).toBe(false)
    expect(estSauvegardeDue({ ...base, horaireQuotidienne: '3:05' })).toBe(false)
    expect(estSauvegardeDue({ ...base, horaireQuotidienne: '10h30' })).toBe(false)
  })

  it('avant l’échéance → pas due', () => {
    expect(
      estSauvegardeDue({ ...base, maintenant: new Date(2026, 7, 28, 2, 59, 59) }),
    ).toBe(false)
  })

  it('à l’heure exacte → due', () => {
    expect(
      estSauvegardeDue({ ...base, maintenant: new Date(2026, 7, 28, 3, 0, 0) }),
    ).toBe(true)
  })

  it('après l’échéance sans exécution → due', () => {
    expect(
      estSauvegardeDue({ ...base, maintenant: new Date(2026, 7, 28, 10, 0, 0) }),
    ).toBe(true)
  })

  it('après l’échéance avec exécution aujourd’hui → pas due', () => {
    expect(
      estSauvegardeDue({
        ...base,
        maintenant: new Date(2026, 7, 28, 10, 0, 0),
        derniereExecutionIso: new Date(2026, 7, 28, 10, 0, 0).toISOString(),
      }),
    ).toBe(false)
  })

  it('après l’échéance avec exécution la veille → due', () => {
    expect(
      estSauvegardeDue({
        ...base,
        maintenant: new Date(2026, 7, 28, 10, 0, 0),
        derniereExecutionIso: new Date(2026, 7, 27, 10, 0, 0).toISOString(),
      }),
    ).toBe(true)
  })

  it('dernière exécution illisible → pas due', () => {
    expect(
      estSauvegardeDue({ ...base, derniereExecutionIso: 'pas-une-date-valide' }),
    ).toBe(false)
  })
})

describe('creerOrdonnanceurSauvegarde — intégration réelle sur base temporaire', () => {
  let dossier: string
  let destination: string
  let dossierSourceDefectueux: string
  let baseChemin: string
  const logs: EntreeLogOrdonnanceur[] = []
  let horloge: { maintenant: Date }

  beforeAll(() => {
    dossier = mkdtempSync(join(tmpdir(), 'egto-ordonnanceur-'))
    destination = mkdtempSync(join(tmpdir(), 'egto-ordonnanceur-dest-'))
    dossierSourceDefectueux = mkdtempSync(join(tmpdir(), 'egto-ordonnanceur-defectueux-'))
    baseChemin = join(dossier, NOM_FICHIER_BASE)

    ouvrirBase(baseChemin, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
    configurerSauvegarde(obtenirBase(), dossier, {
      activee: true,
      horaireQuotidienne: '03:00',
      destination,
    })

    mkdirSync(join(dossier, NOM_DOSSIER_ENVELOPPES), { recursive: true })
    writeFileSync(
      join(dossier, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS),
      Buffer.from('enveloppe recours test'),
    )
    writeFileSync(join(dossierSourceDefectueux, NOM_FICHIER_BASE), Buffer.from('base sans enveloppe'))

    horloge = { maintenant: new Date(2026, 7, 28, 10, 0, 0, 0) }
  })

  afterAll(() => {
    fermerBase()
    rmSync(dossier, { recursive: true, force: true })
    rmSync(destination, { recursive: true, force: true })
    rmSync(dossierSourceDefectueux, { recursive: true, force: true })
  })

  const creerOrdonnanceur = (
    surcharges: Partial<DepsOrdonnanceurSauvegarde> = {},
  ): ReturnType<typeof creerOrdonnanceurSauvegarde> =>
    creerOrdonnanceurSauvegarde({
      obtenirDossierUserData: () => dossier,
      obtenirDek: () => Buffer.alloc(32, 7),
      obtenirBase: () => (baseEstOuverte() ? obtenirBase() : null),
      ecrireLog: (entree) => {
        logs.push(entree)
      },
      maintenant: () => horloge.maintenant,
      ...surcharges,
    })

  const recompterZips = (): number =>
    readdirSync(destination).filter((nom) => nom.startsWith('egto-quotidienne-')).length

  it('session verrouillée (base fermée) → skippe sans journaliser ni exécuter', async () => {
    logs.length = 0
    const ordonnanceur = creerOrdonnanceur({ obtenirBase: () => null, obtenirDek: () => null })
    const resultat = await ordonnanceur.verifierEcheance()
    expect(resultat).toEqual({ executee: false, skippee: true })
    expect(logs).toHaveLength(0)
  })

  it('destination non configurée → skippe et journalise un avertissement', async () => {
    logs.length = 0
    mettreAJourParametre(obtenirBase(), SAUVEGARDE_DESTINATION, '')
    try {
      const ordonnanceur = creerOrdonnanceur()
      const resultat = await ordonnanceur.verifierEcheance()
      expect(resultat).toEqual({ executee: false, skippee: true })
      expect(logs.some((l) => l.niveau === 'avertissement' && l.message.includes('destination non configurée'))).toBe(true)
    } finally {
      configurerSauvegarde(obtenirBase(), dossier, { activee: true, horaireQuotidienne: '03:00', destination })
    }
  })

  it('destination inexistante → skippe et journalise un avertissement', async () => {
    logs.length = 0
    const cheminInexistant = join(tmpdir(), `egto-inexistant-${randomUUID()}`)
    rmSync(cheminInexistant, { recursive: true, force: true })
    mettreAJourParametre(obtenirBase(), SAUVEGARDE_DESTINATION, cheminInexistant)
    try {
      const ordonnanceur = creerOrdonnanceur()
      const resultat = await ordonnanceur.verifierEcheance()
      expect(resultat).toEqual({ executee: false, skippee: true })
      expect(logs.some((l) => l.niveau === 'avertissement' && l.message.includes('destination non configurée'))).toBe(true)
    } finally {
      configurerSauvegarde(obtenirBase(), dossier, { activee: true, horaireQuotidienne: '03:00', destination })
    }
  })

  it('échec réel de l’archivage → erreur mémorisée et journalisée, sans lever d’exception', async () => {
    logs.length = 0
    mettreAJourParametre(
      obtenirBase(),
      SAUVEGARDE_DERNIERE_EXECUTION,
      new Date(2026, 7, 27, 10, 0, 0).toISOString(),
    )
    const ordonnanceur = creerOrdonnanceur({ obtenirDossierUserData: () => dossierSourceDefectueux })

    let resultat: Awaited<ReturnType<typeof ordonnanceur.verifierEcheance>>
    try {
      resultat = await ordonnanceur.verifierEcheance()
    } catch (erreur) {
      expect.fail(`verifierEcheance n'aurait pas dû lever d'exception : ${String(erreur)}`)
      return
    }
    expect(resultat.executee).toBe(false)
    expect(resultat.skippee).toBe(false)
    expect(resultat.erreur).toBeTruthy()
    expect(ordonnanceur.derniereErreur()).toBe(resultat.erreur)
    expect(lireParametre(obtenirBase(), SAUVEGARDE_DERNIERE_ERREUR)).toBe(resultat.erreur)
    expect(logs.some((l) => l.niveau === 'erreur' && l.message.includes('Échec de la sauvegarde quotidienne automatique.'))).toBe(true)
    expect(logs).not.toContainEqual(expect.objectContaining({ message: resultat.erreur }))
  })

  it('exécution réelle (rattrapage au déverrouillage) → archive chiffrée + dernière exécution persistée', async () => {
    logs.length = 0
    mettreAJourParametre(
      obtenirBase(),
      SAUVEGARDE_DERNIERE_EXECUTION,
      new Date(2026, 7, 27, 10, 0, 0).toISOString(),
    )
    const avant = recompterZips()
    const ordonnanceur = creerOrdonnanceur()

    const resultat = await ordonnanceur.verifierEcheance()
    expect(resultat).toEqual({ executee: true, skippee: false })
    expect(resultat.erreur).toBeUndefined()

    expect(recompterZips()).toBe(avant + 1)
    const noms = readdirSync(destination).filter((nom) => nom.startsWith('egto-quotidienne-'))
    expect(noms).toEqual(['egto-quotidienne-2026-08-28-1000.zip'])
    expect(statSync(join(destination, noms[0])).size).toBeGreaterThan(0)

    expect(lireParametre(obtenirBase(), SAUVEGARDE_DERNIERE_EXECUTION)).toBe(horloge.maintenant.toISOString())
    expect(lireParametre(obtenirBase(), SAUVEGARDE_DERNIERE_ERREUR)).toBe('')
    expect(ordonnanceur.derniereErreur()).toBeNull()
    expect(logs.some((l) => l.niveau === 'info' && l.message.includes('Sauvegarde quotidienne automatique réussie'))).toBe(true)
  })

  it('second passage à la même heure → pas de double exécution', async () => {
    const avant = recompterZips()
    const ordonnanceur = creerOrdonnanceur()
    const resultat = await ordonnanceur.verifierEcheance()
    expect(resultat).toEqual({ executee: false, skippee: false })
    expect(recompterZips()).toBe(avant)
  })

  it('aucune exécution si désactivée', async () => {
    const avant = recompterZips()
    mettreAJourParametre(
      obtenirBase(),
      SAUVEGARDE_DERNIERE_EXECUTION,
      new Date(2026, 7, 27, 10, 0, 0).toISOString(),
    )
    configurerSauvegarde(obtenirBase(), dossier, { activee: false, horaireQuotidienne: '03:00', destination })
    try {
      const resultat = await creerOrdonnanceur().verifierEcheance()
      expect(resultat).toEqual({ executee: false, skippee: false })
      expect(recompterZips()).toBe(avant)
    } finally {
      configurerSauvegarde(obtenirBase(), dossier, { activee: true, horaireQuotidienne: '03:00', destination })
    }
  })

  it('intervalle : demarrer une seule fois, arreter, redémarrer', () => {
    let derniereMs = 0
    let fenetreTache: (() => void) | null = null
    const arreter = vi.fn()
    const creerIntervalle = vi.fn((fn: () => void, ms: number) => {
      derniereMs = ms
      fenetreTache = fn
      return { arreter }
    })
    const ordonnanceur = creerOrdonnanceur({ creerIntervalle })

    ordonnanceur.demarrer()
    ordonnanceur.demarrer()
    expect(creerIntervalle).toHaveBeenCalledTimes(1)
    expect(creerIntervalle).toHaveBeenCalledWith(expect.any(Function), INTERVALLE_VERIFICATION_MS)
    expect(derniereMs).toBe(INTERVALLE_VERIFICATION_MS)
    expect(fenetreTache).toBeTypeOf('function')

    ordonnanceur.arreter()
    expect(arreter).toHaveBeenCalledTimes(1)

    ordonnanceur.demarrer()
    expect(creerIntervalle).toHaveBeenCalledTimes(2)
    ordonnanceur.arreter()
    expect(arreter).toHaveBeenCalledTimes(2)
  })
})