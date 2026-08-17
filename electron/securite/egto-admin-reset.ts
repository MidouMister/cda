import { createInterface } from 'node:readline'
import { deballerDekParPhrase, MINIMUM_CARACTERES_MDP } from './session'
import { NOM_ENVELOPPE_UTILISATEUR, ecrireEnveloppe } from './gestionnaire-enveloppes'
import { randomBytes } from 'node:crypto'
import { deriverCle, envelopperDek, TAILLE_SEL_OCTETS } from './chiffrement-enveloppe'

export type ResultatReset =
  | { succes: true }
  | { succes: false; erreur: string }

export const executerReset = async (
  dossierUserData: string,
  phrase: string,
  nouveauMotDePasse: string,
): Promise<ResultatReset> => {
  if (typeof phrase !== 'string' || phrase.length === 0) {
    return { succes: false, erreur: 'Phrase de recuperation requise.' }
  }
  if (typeof nouveauMotDePasse !== 'string' || nouveauMotDePasse.length < MINIMUM_CARACTERES_MDP) {
    return { succes: false, erreur: `Le mot de passe doit contenir au moins ${MINIMUM_CARACTERES_MDP} caracteres.` }
  }

  let dek: Buffer
  try {
    dek = await deballerDekParPhrase(dossierUserData, phrase)
  } catch {
    return { succes: false, erreur: 'Phrase de recuperation incorrecte.' }
  }

  const nouveauSel = randomBytes(TAILLE_SEL_OCTETS)
  const nouvelleCle = await deriverCle(nouveauMotDePasse, nouveauSel)
  const nouveauBlob = envelopperDek(dek, nouvelleCle, nouveauSel)
  ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, nouveauBlob)

  return { succes: true }
}

const masquerEntree = (question: string): Promise<string> =>
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

const saisirMotDePasse = async (): Promise<string | null> => {
  const mdp1 = await masquerEntree('Nouveau mot de passe : ')
  const mdp2 = await masquerEntree('Confirmer le mot de passe : ')
  if (mdp1 !== mdp2) {
    console.error('Les mots de passe ne correspondent pas.')
    return null
  }
  return mdp1
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const dossierUserData = args[0]

  if (!dossierUserData || typeof dossierUserData !== 'string') {
    console.error('Usage : egto-admin-reset <dossier-user-data>')
    process.exit(1)
  }

  console.log('=== EGTO — Reinitialisation administrateur ===')
  console.log('Cette utilitaire necessite la phrase de recuperation.')
  console.log('')

  const phrase = await masquerEntree('Phrase de recuperation : ')
  if (!phrase || phrase.trim().length === 0) {
    console.error('Phrase de recuperation requise.')
    process.exit(1)
  }

  const nouveauMotDePasse = await saisirMotDePasse()
  if (nouveauMotDePasse === null) {
    process.exit(1)
  }

  const resultat = await executerReset(dossierUserData, phrase.trim(), nouveauMotDePasse)
  if (resultat.succes) {
    console.log('Reinitialisation reussie. Le mot de passe a ete mis a jour.')
    console.log('L\'ancienne phrase de recuperation est toujours valide (elle ne change jamais).')
    process.exit(0)
  } else {
    console.error(`Echec : ${resultat.erreur}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('egto-admin-reset')) {
  main()
}
