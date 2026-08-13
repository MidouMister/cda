import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Base } from './connexion'

const REPERTOIRE_MODULE = dirname(fileURLToPath(import.meta.url))
const CHEMIN_SCHEMA = join(REPERTOIRE_MODULE, 'schema.sql')
const DOSSIER_MIGRATIONS = join(REPERTOIRE_MODULE, 'migrations')

export const VERSION_MAXIMALE = 1
export const NOM_MIGRATION_INITIALE = 'schema-initial-j0'

interface MigrationFichier {
  sql: string
  nom: string
}

const lireSql = (chemin: string): string => readFileSync(chemin, 'utf8')

const versionCourante = (base: Base): number =>
  base.pragma('user_version', { simple: true }) as number

const lireMigrationDepuisFichier = (version: number): MigrationFichier => {
  const prefixe = `${String(version).padStart(3, '0')}_`
  const fichiers = readdirSync(DOSSIER_MIGRATIONS)
    .filter((fichier) => fichier.startsWith(prefixe) && fichier.endsWith('.sql'))
    .sort()
  if (fichiers.length === 0) {
    throw new Error(`Migration ${version} : aucun fichier « ${prefixe}*.sql » dans migrations/.`)
  }
  if (fichiers.length > 1) {
    throw new Error(
      `Migration ${version} : plusieurs fichiers correspondent (${fichiers
        .map((fichier) => `« ${fichier} »`)
        .join(', ')}).`,
    )
  }
  return { sql: lireSql(join(DOSSIER_MIGRATIONS, fichiers[0]!)), nom: fichiers[0]!.replace(/\.sql$/, '') }
}

const appliquerVersion = (base: Base, version: number): void => {
  if (version === 1) {
    base.exec(lireSql(CHEMIN_SCHEMA))
    base.prepare('INSERT INTO migrations_history (version, nom) VALUES (?, ?)').run(version, NOM_MIGRATION_INITIALE)
  } else {
    const migration = lireMigrationDepuisFichier(version)
    base.exec(migration.sql)
    base.prepare('INSERT INTO migrations_history (version, nom) VALUES (?, ?)').run(version, migration.nom)
  }
  base.pragma(`user_version = ${version}`)
}

export const appliquerMigrations = (base: Base): void => {
  const versionActuelle = versionCourante(base)
  if (versionActuelle > VERSION_MAXIMALE) {
    throw new Error(
      `Base plus récente que l’application : user_version = ${versionActuelle} ` +
        `(version maximale prise en charge : ${VERSION_MAXIMALE}). Aucune écriture effectuée.`,
    )
  }
  for (let version = versionActuelle + 1; version <= VERSION_MAXIMALE; version += 1) {
    base.transaction(() => appliquerVersion(base, version))()
  }
}
