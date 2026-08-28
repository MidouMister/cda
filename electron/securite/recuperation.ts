import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { archiverDonnees, nommerSauvegarde, DOSSIER_SAUVEGARDES_DEFAUT } from '../sauvegarde'
import { deballerDekParPhrase } from './session'

export type ResultatExportSecours =
  | { succes: true; chemin: string }
  | { succes: false; erreur: string }

export const masquerEntree = (question: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const processus = process as NodeJS.Process & { stdin: NodeJS.ReadStream & { isTTY?: boolean } }
    if (processus.stdin.isTTY) {
      process.stdout.write(question)
      let resultat = ''
      const onData = (octet: Buffer): void => {
        const char = octet.toString()
        if (char === '\n' || char === '\r') {
          process.stdout.write('\n')
          process.stdin.removeListener('data', onData)
          rl.close()
          resolve(resultat)
        } else if (char === '\u007F' || char === '\b') {
          if (resultat.length > 0) {
            resultat = resultat.slice(0, -1)
          }
        } else {
          resultat += char
        }
      }
      process.stdin.setRawMode?.(true)
      process.stdin.resume()
      process.stdin.on('data', onData)
    } else {
      rl.question(question, (reponse) => {
        rl.close()
        resolve(reponse)
      })
    }
  })

export const executerExportSecours = async (
  dossierUserData: string,
  phrase: string,
): Promise<ResultatExportSecours> => {
  if (typeof phrase !== 'string' || phrase.trim().length === 0) {
    return { succes: false, erreur: 'Phrase de recuperation requise.' }
  }

  let dek: Buffer
  try {
    dek = await deballerDekParPhrase(dossierUserData, phrase.trim())
  } catch {
    return { succes: false, erreur: 'Phrase de recuperation incorrecte.' }
  }

  const dossierSauvegardes = join(dossierUserData, DOSSIER_SAUVEGARDES_DEFAUT)
  const destination = join(dossierSauvegardes, nommerSauvegarde({ typeBackup: 'manuelle' }))

  const resultat = await archiverDonnees({
    dossierSource: dossierUserData,
    destination,
    motDePasse: dek.toString('hex'),
    typeBackup: 'manuelle',
  })

  if (resultat.succes) {
    return { succes: true, chemin: destination }
  }
  return { succes: false, erreur: resultat.erreur ?? 'Echec de l\'export de sauvegarde.' }
}