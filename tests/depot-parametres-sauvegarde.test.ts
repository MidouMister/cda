import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import {
  configurerSauvegarde,
  lireConfigSauvegarde,
  lireParametre,
  SAUVEGARDE_ACTIVEE,
  SAUVEGARDE_DESTINATION,
  SAUVEGARDE_DERNIERE_EXECUTION,
  SAUVEGARDE_HORAIRE_QUOTIDIENNE,
} from '../electron/depots/depot-parametres'

const CLE_VALIDE = 'clé-test-depot-parametres-sauvegarde'
const CHEMIN_ESSAI = join(tmpdir(), `egto-depot-parametres-sauvegarde-${randomUUID()}.db`)
const DOSSIER_BASE = join(tmpdir(), `egto-depot-parametres-sauvegarde-dossier-${randomUUID()}`)

let destination: string

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

describe('Dépôt paramètres — configuration sauvegarde automatique', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
    mkdirSync(DOSSIER_BASE, { recursive: true })
    destination = mkdtempSync(join(tmpdir(), 'egto-depot-parametres-sauvegarde-dest-'))
  })

  afterAll(() => {
    fermerBase()
    rmSync(destination, { recursive: true, force: true })
    rmSync(DOSSIER_BASE, { recursive: true, force: true })
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  it('lit les valeurs par défaut définies par les seeds', () => {
    const config = lireConfigSauvegarde(obtenirBase())
    expect(config).toEqual({
      activee: true,
      horaireQuotidienne: '03:00',
      destination: '',
      derniereExecution: null,
    })
  })

  it('rejette un horaire invalide', () => {
    expect(() =>
      configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
        activee: true,
        horaireQuotidienne: '25:00',
        destination,
      }),
    ).toThrow(/Horaire invalide/)
    expect(() =>
      configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
        activee: true,
        horaireQuotidienne: '3:05',
        destination,
      }),
    ).toThrow(/Horaire invalide/)
    expect(() =>
      configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
        activee: true,
        horaireQuotidienne: '10h30',
        destination,
      }),
    ).toThrow(/Horaire invalide/)
  })

  it('rejette une destination vide', () => {
    expect(() =>
      configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
        activee: true,
        horaireQuotidienne: '03:00',
        destination: '   ',
      }),
    ).toThrow(/non vide|chaîne/)
  })

  it('rejette une destination inexistante ou qui n’est pas un dossier', () => {
    expect(() =>
      configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
        activee: true,
        horaireQuotidienne: '03:00',
        destination: join(tmpdir(), `egto-absente-${randomUUID()}`),
      }),
    ).toThrow(/dossier existant/)
  })

  it('rejette une destination identique au répertoire de la base', () => {
    expect(() =>
      configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
        activee: true,
        horaireQuotidienne: '03:00',
        destination: DOSSIER_BASE,
      }),
    ).toThrow(/différente du répertoire de la base/)
  })

  it('persiste une configuration valide et la relit', () => {
    configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
      activee: false,
      horaireQuotidienne: '06:30',
      destination,
    })
    expect(lireParametre(obtenirBase(), SAUVEGARDE_ACTIVEE)).toBe('0')
    expect(lireParametre(obtenirBase(), SAUVEGARDE_HORAIRE_QUOTIDIENNE)).toBe('06:30')
    expect(lireParametre(obtenirBase(), SAUVEGARDE_DESTINATION)).toBe(destination)
    expect(
      lireConfigSauvegarde(obtenirBase()),
    ).toEqual({
      activee: false,
      horaireQuotidienne: '06:30',
      destination,
      derniereExecution: null,
    })
  })

  it('néant : la dernière exécution reste indépendante de la configuration', () => {
    expect(lireParametre(obtenirBase(), SAUVEGARDE_DERNIERE_EXECUTION)).toBeNull()
  })

  it('est idempotente sur une reconfiguration', () => {
    configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
      activee: true,
      horaireQuotidienne: '03:00',
      destination,
    })
    configurerSauvegarde(obtenirBase(), DOSSIER_BASE, {
      activee: true,
      horaireQuotidienne: '03:00',
      destination,
    })
    expect(lireConfigSauvegarde(obtenirBase()).activee).toBe(true)
    expect(lireParametre(obtenirBase(), SAUVEGARDE_HORAIRE_QUOTIDIENNE)).toBe('03:00')
  })
})