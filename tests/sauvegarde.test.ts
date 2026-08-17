import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import {
  archiverDonnees, restaurerDonnees, listerSauvegardes,
  appliquerRetention, nommerSauvegarde, dechiffrer, chiffrer,
  MAGIC, FORMAT_VERSION, SALT_TAILLE, IV_TAILLE, TAG_TAILLE,
  NOM_FICHIER_BASE, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS,
  KDF_ARGON2ID, PARAMETRES_ARGON2ID,
} from '../electron/sauvegarde'

const creerZipManuel = async (entries: Array<{ name: string; data: Buffer }>): Promise<Buffer> => {
  const localHeaders: Buffer[] = []
  const centralHeaders: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const compressed = deflateRawSync(entry.data)
    const nameBuf = Buffer.from(entry.name, 'utf8')

    const local = Buffer.alloc(30 + nameBuf.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    nameBuf.copy(local, 30)
    localHeaders.push(Buffer.concat([local, compressed]))

    const central = Buffer.alloc(46 + nameBuf.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(0, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    nameBuf.copy(central, 46)
    centralHeaders.push(central)

    offset += localHeaders[localHeaders.length - 1].length
  }

  const centralDirOffset = offset
  const centralDirBuf = Buffer.concat(centralHeaders)
  const centralDirSize = centralDirBuf.length

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDirSize, 12)
  eocd.writeUInt32LE(centralDirOffset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localHeaders, centralDirBuf, eocd])
}

let dossierTest: string
let dossierSauvegardes: string

const creerDossierTest = (): string => {
  const nom = `egto-test-${randomBytes(8).toString('hex')}`
  const chemin = join(tmpdir(), nom)
  mkdirSync(chemin, { recursive: true })
  return chemin
}

const preparerSource = (dossier: string): void => {
  writeFileSync(join(dossier, NOM_FICHIER_BASE), Buffer.from('base de donnees test'))
  mkdirSync(join(dossier, NOM_DOSSIER_ENVELOPPES), { recursive: true })
  writeFileSync(join(dossier, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS), Buffer.from('enveloppe recours test'))
}

beforeEach(() => {
  dossierTest = creerDossierTest()
  dossierSauvegardes = join(dossierTest, 'sauvegardes')
  mkdirSync(dossierSauvegardes, { recursive: true })
})

afterEach(() => {
  rmSync(dossierTest, { recursive: true, force: true })
})

describe('nommerSauvegarde', () => {
  it('format quotidien', () => {
    const nom = nommerSauvegarde({ typeBackup: 'quotidienne', date: new Date(2026, 7, 17, 14, 30) })
    expect(nom).toBe('egto-quotidienne-2026-08-17-1430.zip')
  })

  it('format mensuel', () => {
    const nom = nommerSauvegarde({ typeBackup: 'mensuelle', date: new Date(2026, 7, 1) })
    expect(nom).toBe('egto-mensuelle-2026-08.zip')
  })

  it('format manuel', () => {
    const nom = nommerSauvegarde({ typeBackup: 'manuelle', date: new Date(2026, 0, 5, 9, 5) })
    expect(nom).toBe('egto-manuelle-2026-01-05-0905.zip')
  })
})

describe('chiffrement AES-256-GCM', () => {
  it('dechiffre avec le bon mot de passe', async () => {
    const original = Buffer.from('donnee secrete pour test')
    const chiffre = await chiffrer(original, 'monMotDePasse')
    const dechiffre = await dechiffrer(chiffre, 'monMotDePasse')
    expect(dechiffre).toEqual(original)
  })

  it('rejette un mauvais mot de passe', async () => {
    const chiffre = await chiffrer(Buffer.from('secret'), 'bonMdp')
    await expect(dechiffrer(chiffre, 'mauvaisMdp')).rejects.toThrow()
  })

  it('rejette un fichier tronque', async () => {
    await expect(dechiffrer(Buffer.alloc(10), 'mdp')).rejects.toThrow()
  })

  it('rejette un fichier sans bon magic', async () => {
    const mauvaisMagic = Buffer.alloc(100)
    mauvaisMagic.write('XXXX', 0, 4, 'ascii')
    await expect(dechiffrer(mauvaisMagic, 'mdp')).rejects.toThrow(/invalide/)
  })

  it('en-tete contient version et parametres', async () => {
    const chiffre = await chiffrer(Buffer.from('test'), 'mdp')
    expect(chiffre.subarray(0, 4).toString('ascii')).toBe(MAGIC)
    expect(chiffre.readUInt16BE(4)).toBe(FORMAT_VERSION)
    expect(chiffre.readUInt8(6)).toBe(KDF_ARGON2ID)
    expect(chiffre.readUInt16BE(7)).toBe(14)
    expect(chiffre.readUInt32BE(9)).toBe(PARAMETRES_ARGON2ID.memoryCost)
    expect(chiffre.readUInt32BE(13)).toBe(PARAMETRES_ARGON2ID.timeCost)
    expect(chiffre.readUInt32BE(17)).toBe(PARAMETRES_ARGON2ID.parallelism)
    expect(chiffre.readUInt16BE(21)).toBe(PARAMETRES_ARGON2ID.hashLength)
    expect(chiffre.subarray(23, 23 + SALT_TAILLE).length).toBe(SALT_TAILLE)
    expect(chiffre.subarray(23 + SALT_TAILLE, 23 + SALT_TAILLE + IV_TAILLE).length).toBe(IV_TAILLE)
    expect(chiffre.subarray(23 + SALT_TAILLE + IV_TAILLE, 23 + SALT_TAILLE + IV_TAILLE + TAG_TAILLE).length).toBe(TAG_TAILLE)
  })

  it('nonce est aleatoire', async () => {
    const donnees = Buffer.from('memes donnees')
    const c1 = await chiffrer(donnees, 'mdp')
    const c2 = await chiffrer(donnees, 'mdp')
    expect(c1.equals(c2)).toBe(false)
  })

  it('nonce altere echoue', async () => {
    const chiffre = await chiffrer(Buffer.from('test'), 'mdp')
    const altere = Buffer.from(chiffre)
    const posIv = 23 + SALT_TAILLE
    altere[posIv] ^= 0xff
    await expect(dechiffrer(altere, 'mdp')).rejects.toThrow()
  })

  it('tag altere echoue', async () => {
    const chiffre = await chiffrer(Buffer.from('test'), 'mdp')
    const altere = Buffer.from(chiffre)
    const posTag = 23 + SALT_TAILLE + IV_TAILLE
    altere[posTag] ^= 0xff
    await expect(dechiffrer(altere, 'mdp')).rejects.toThrow()
  })

  it('sel altere echoue', async () => {
    const chiffre = await chiffrer(Buffer.from('test'), 'mdp')
    const altere = Buffer.from(chiffre)
    altere[23] ^= 0xff
    await expect(dechiffrer(altere, 'mdp')).rejects.toThrow()
  })

  it('version alteree echoue', async () => {
    const chiffre = await chiffrer(Buffer.from('test'), 'mdp')
    const altere = Buffer.from(chiffre)
    altere[4] = 99
    altere[5] = 99
    await expect(dechiffrer(altere, 'mdp')).rejects.toThrow()
  })
})

describe('archiverDonnees', () => {
  it('cree une archive chiffree AES-256-GCM', async () => {
    preparerSource(dossierTest)
    const destination = join(dossierSauvegardes, 'test-backup.zip')

    const resultat = await archiverDonnees({
      dossierSource: dossierTest,
      destination,
      motDePasse: 'monMotDePasse123',
      typeBackup: 'manuelle',
    })

    expect(resultat.succes).toBe(true)
    expect(resultat.chemin).toBe(destination)
    expect(existsSync(destination)).toBe(true)
    expect(statSync(destination).size).toBeGreaterThan(0)

    const contenu = readFileSync(destination)
    const magic = contenu.subarray(0, 4).toString('ascii')
    expect(magic).toBe(MAGIC)

    const version = contenu.readUInt16BE(4)
    expect(version).toBe(FORMAT_VERSION)
  })

  it('echoue si base manquante', async () => {
    mkdirSync(join(dossierTest, NOM_DOSSIER_ENVELOPPES), { recursive: true })
    writeFileSync(join(dossierTest, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS), Buffer.from('x'))

    const resultat = await archiverDonnees({
      dossierSource: dossierTest,
      destination: join(dossierSauvegardes, 'test.zip'),
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/base/)
  })

  it('echoue si enveloppe manquante', async () => {
    writeFileSync(join(dossierTest, NOM_FICHIER_BASE), Buffer.from('x'))

    const resultat = await archiverDonnees({
      dossierSource: dossierTest,
      destination: join(dossierSauvegardes, 'test.zip'),
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/recours/)
  })

  it('ne contient jamais utilisateur.bin', async () => {
    preparerSource(dossierTest)
    mkdirSync(join(dossierTest, NOM_DOSSIER_ENVELOPPES), { recursive: true })
    writeFileSync(join(dossierTest, NOM_DOSSIER_ENVELOPPES, 'utilisateur.bin'), Buffer.from('SECRET'))

    const destination = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const contenuChiffre = readFileSync(destination)
    const zip = await dechiffrer(contenuChiffre, 'mdp123456')
    const zipString = zip.toString('latin1')
    expect(zipString).not.toContain('utilisateur.bin')
  })

  it('mot de passe vide echoue', async () => {
    preparerSource(dossierTest)
    const resultat = await archiverDonnees({
      dossierSource: dossierTest,
      destination: join(dossierSauvegardes, 'test.zip'),
      motDePasse: '',
      typeBackup: 'manuelle',
    })
    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/obligatoire/)
  })

  it('archive modifiee echoue a la restauration', async () => {
    preparerSource(dossierTest)
    const destination = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const contenu = readFileSync(destination)
    const milieu = Math.floor(contenu.length / 2)
    contenu[milieu] ^= 0xff
    writeFileSync(destination, contenu)

    const dest = join(dossierTest, 'dest-modifiee')
    mkdirSync(dest, { recursive: true })

    const resultat = await restaurerDonnees({
      archive: destination,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
    })
    expect(resultat.succes).toBe(false)
  })
})

describe('restaurerDonnees', () => {
  it('echoue si archive inexistante', async () => {
    const resultat = await restaurerDonnees({
      archive: join(dossierTest, 'inexistant.zip'),
      motDePasse: 'mdp',
      dossierDestination: join(dossierTest, 'dest'),
    })
    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/introuvable/)
  })

  it('echoue si mauvais mot de passe', async () => {
    preparerSource(dossierTest)
    const archive = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination: archive,
      motDePasse: 'bonMdp123',
      typeBackup: 'manuelle',
    })

    const dest = join(dossierTest, 'dest-restauration')
    mkdirSync(dest, { recursive: true })

    const resultat = await restaurerDonnees({
      archive,
      motDePasse: 'mauvaisMdp',
      dossierDestination: dest,
    })

    expect(resultat.succes).toBe(false)
  })

  it('restauration sur poste vierge', async () => {
    preparerSource(dossierTest)
    const archive = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination: archive,
      motDePasse: 'mdpSecurise123',
      typeBackup: 'manuelle',
    })

    const dest = join(dossierTest, 'dest-vierge')
    mkdirSync(dest, { recursive: true })

    const resultat = await restaurerDonnees({
      archive,
      motDePasse: 'mdpSecurise123',
      dossierDestination: dest,
    })

    expect(resultat.succes).toBe(true)
    expect(existsSync(join(dest, NOM_FICHIER_BASE))).toBe(true)
    expect(existsSync(join(dest, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS))).toBe(true)
  })

  it('echoue si destination non vide', async () => {
    preparerSource(dossierTest)
    const archive = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination: archive,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const dest = join(dossierTest, 'dest-nonvide')
    mkdirSync(dest, { recursive: true })
    writeFileSync(join(dest, 'fichier.txt'), 'x')

    const resultat = await restaurerDonnees({
      archive,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
    })

    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/pas vide/)
  })

  it('archive tronquee echoue', async () => {
    preparerSource(dossierTest)
    const destination = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const contenu = readFileSync(destination)
    const tronque = contenu.subarray(0, contenu.length - 10)
    writeFileSync(destination, tronque)

    const dest = join(dossierTest, 'dest-tronquee')
    mkdirSync(dest, { recursive: true })

    const resultat = await restaurerDonnees({
      archive: destination,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
    })
    expect(resultat.succes).toBe(false)
  })

  it('chemins dangereux rejetes', async () => {
    const manifeste = JSON.stringify({
      version: 1,
      date: new Date().toISOString(),
      type: 'manuelle',
      nomFichierBase: NOM_FICHIER_BASE,
      nomEnveloppeRecours: NOM_ENVELOPPE_RECOURS,
    }, null, 2)

    const zipBuffer = await creerZipManuel([
      { name: NOM_FICHIER_BASE, data: Buffer.from('base de donnees test') },
      { name: join(NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS), data: Buffer.from('enveloppe recours test') },
      { name: 'manifeste.json', data: Buffer.from(manifeste) },
      { name: join('..', '..', 'etc', 'passwd'), data: Buffer.from('malveillance') },
    ])

    const destination = join(dossierSauvegardes, 'dangereux.zip')
    const chiffre = await chiffrer(zipBuffer, 'mdp123456')
    writeFileSync(destination, chiffre)

    const dest = join(dossierTest, 'dest-dangereux')
    mkdirSync(dest, { recursive: true })

    const resultat = await restaurerDonnees({
      archive: destination,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
    })
    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/dangereux/)
  })

  it('verifie phrase de recuperation', async () => {
    preparerSource(dossierTest)
    const archive = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination: archive,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const dest = join(dossierTest, 'dest-phrase')
    mkdirSync(dest, { recursive: true })

    const deballerOk = async (): Promise<Buffer> => Buffer.alloc(32)

    const resultat1 = await restaurerDonnees({
      archive,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
      deballerDekParPhrase: deballerOk,
      phraseRecuperation: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF',
    })
    expect(resultat1.succes).toBe(true)

    const dest2 = join(dossierTest, 'dest-phrase-2')
    mkdirSync(dest2, { recursive: true })

    const deballerFail = async (): Promise<Buffer> => { throw new Error('Phrase incorrecte') }

    const resultat2 = await restaurerDonnees({
      archive,
      motDePasse: 'mdp123456',
      dossierDestination: dest2,
      deballerDekParPhrase: deballerFail,
      phraseRecuperation: 'MAUVAISE-PHRASE',
    })
    expect(resultat2.succes).toBe(false)
    expect(resultat2.erreur).toMatch(/r.cup.ration/)
  })

  it('mauvaise phrase echoue', async () => {
    preparerSource(dossierTest)
    const archive = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination: archive,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const dest = join(dossierTest, 'dest-mauvaise-phrase')
    mkdirSync(dest, { recursive: true })

    const deballerFail = async (): Promise<Buffer> => { throw new Error('Phrase incorrecte') }

    const resultat = await restaurerDonnees({
      archive,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
      deballerDekParPhrase: deballerFail,
      phraseRecuperation: 'XXXX-YYYY-ZZZZ-WWWW-VVVV-TTTT',
    })
    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/r.cup.ration/)
  })

  it('absence de phrase saute la validation dek', async () => {
    preparerSource(dossierTest)
    const archive = join(dossierSauvegardes, 'test.zip')
    await archiverDonnees({
      dossierSource: dossierTest,
      destination: archive,
      motDePasse: 'mdp123456',
      typeBackup: 'manuelle',
    })

    const dest = join(dossierTest, 'dest-sans-phrase')
    mkdirSync(dest, { recursive: true })

    let appele = false
    const deballerSpy = async (): Promise<Buffer> => {
      appele = true
      return Buffer.alloc(32)
    }

    const resultat = await restaurerDonnees({
      archive,
      motDePasse: 'mdp123456',
      dossierDestination: dest,
      deballerDekParPhrase: deballerSpy,
    })
    expect(resultat.succes).toBe(true)
    expect(appele).toBe(false)
  })
})

describe('listerSauvegardes', () => {
  it('dossier vide', () => {
    expect(listerSauvegardes({ dossierSauvegardes })).toEqual([])
  })

  it('liste et trie les fichiers', () => {
    writeFileSync(join(dossierSauvegardes, 'egto-quotidienne-2026-08-15-1000.zip'), Buffer.from('a'))
    writeFileSync(join(dossierSauvegardes, 'egto-quotidienne-2026-08-17-1000.zip'), Buffer.from('b'))
    writeFileSync(join(dossierSauvegardes, 'egto-mensuelle-2026-07.zip'), Buffer.from('c'))

    const liste = listerSauvegardes({ dossierSauvegardes })
    expect(liste).toHaveLength(3)
    expect(liste[0].nom).toBe('egto-quotidienne-2026-08-17-1000.zip')
    expect(liste[0].type).toBe('quotidienne')
    expect(liste[2].type).toBe('mensuelle')
  })
})

describe('appliquerRetention', () => {
  it('supprime les plus anciennes quotidiennes', () => {
    for (let i = 0; i < 5; i++) {
      writeFileSync(join(dossierSauvegardes, `egto-quotidienne-2026-08-${String(10 + i).padStart(2, '0')}-1200.zip`), Buffer.from(`backup ${i}`))
    }

    const resultat = appliquerRetention({ dossierSauvegardes, retentionQuotidienne: 3 })
    expect(resultat.supprimees).toBe(2)
    expect(listerSauvegardes({ dossierSauvegardes })).toHaveLength(3)
  })

  it('garde les mensuelles separement', () => {
    writeFileSync(join(dossierSauvegardes, 'egto-quotidienne-2026-08-10-1200.zip'), Buffer.from('d1'))
    writeFileSync(join(dossierSauvegardes, 'egto-quotidienne-2026-08-11-1200.zip'), Buffer.from('d2'))
    writeFileSync(join(dossierSauvegardes, 'egto-mensuelle-2026-05.zip'), Buffer.from('m1'))
    writeFileSync(join(dossierSauvegardes, 'egto-mensuelle-2026-06.zip'), Buffer.from('m2'))
    writeFileSync(join(dossierSauvegardes, 'egto-mensuelle-2026-07.zip'), Buffer.from('m3'))

    const resultat = appliquerRetention({ dossierSauvegardes, retentionQuotidienne: 2, retentionMensuelle: 1 })
    expect(resultat.supprimees).toBe(2)
    const restantes = listerSauvegardes({ dossierSauvegardes })
    expect(restantes).toHaveLength(3)
  })
})
