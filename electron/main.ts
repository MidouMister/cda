import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { ouvrirBase, fermerBase } from './db/connexion'
import type { Base } from './db/connexion'
import { appliquerMigrations } from './db/migrations'
import { insererSeeds } from './db/seeds'
import { verrouiller, CompteurInactivite } from './securite/session'
import { masquerEntree, executerExportSecours } from './securite/recuperation'
import { enregistrerHandlersIpc } from './ipc/enregistrer-ipc'
import type { DepsSession } from './securite/session'
import { ecrireLog, DOSSIER_JOURNAL } from './journal'
import { creerOrdonnanceurSauvegarde, type OrdonnanceurSauvegarde } from './ordonnanceur-sauvegarde'

export const DUREE_INACTIVITE_MS = 30 * 60 * 1000

const MODE_RECUPERATION = process.argv.includes('--recuperation')

const executerRecuperation = async (): Promise<void> => {
  const dossierUserData = obtenirDossierUserData()
  const phrase = await masquerEntree('Phrase de recuperation : ')
  if (!phrase || phrase.trim().length === 0) {
    console.error('Phrase de recuperation requise.')
    app.exit(1)
    return
  }

  const resultat = await executerExportSecours(dossierUserData, phrase.trim())
  if (resultat.succes) {
    console.log(`Sauvegarde de secours creee : ${resultat.chemin}`)
    app.exit(0)
  } else {
    console.error(`Echec : ${resultat.erreur}`)
    app.exit(1)
  }
}

const etatSession: { dekCourante: Buffer | null; base: { close: () => void } | null } = {
  dekCourante: null,
  base: null,
}

const compteurActivite = new CompteurInactivite(DUREE_INACTIVITE_MS, () => {
  try {
    verrouiller(etatSession, depsSession)
  } catch {
    // Session deja verrouillee
  }
})

const depsSession: DepsSession = {
  ouvrirBase: (chemin, cle) => ouvrirBase(chemin, cle),
  fermerBase: () => fermerBase(),
  appliquerMigrations: (base) => { appliquerMigrations(base as Parameters<typeof appliquerMigrations>[0]) },
  insererSeeds: (base) => { insererSeeds(base as Parameters<typeof insererSeeds>[0]) },
}

const obtenirDossierUserData = (): string => app.getPath('userData')

let ordonnanceur: OrdonnanceurSauvegarde | null = null

if (process.env['EGTO_E2E'] === '1' && process.env['EGTO_E2E_USER_DATA_DIR']) {
  app.setPath('userData', process.env['EGTO_E2E_USER_DATA_DIR'])
}

const creerFenetreDiagnostic = (): void => {
  const fenetre = new BrowserWindow({
    width: 960,
    height: 640,
    show: false,
    title: 'EGTO — Diagnostic',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  fenetre.once('ready-to-show', () => {
    fenetre.show()
  })

  fenetre.webContents.on('will-navigate', (evenement, url) => {
    const adresseDev = process.env['ELECTRON_RENDERER_URL']
    const origineAutorisee = adresseDev ?? 'file://'
    if (!url.startsWith(origineAutorisee)) {
      evenement.preventDefault()
    }
  })

  fenetre.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  const adresseDev = process.env['ELECTRON_RENDERER_URL']
  if (adresseDev) {
    void fenetre.loadURL(adresseDev)
  } else {
    void fenetre.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (MODE_RECUPERATION) {
    void executerRecuperation()
    return
  }

  const apresDeverrouillage = (): void => {
    void ordonnanceur?.verifierEcheance()
  }

  ordonnanceur = creerOrdonnanceurSauvegarde({
    obtenirDossierUserData,
    obtenirDek: () => etatSession.dekCourante,
    obtenirBase: () => etatSession.base as Base | null,
    ecrireLog: (entree) =>
      ecrireLog({
        dossierJournal: join(app.getPath('userData'), DOSSIER_JOURNAL),
        entree,
      }),
    maintenant: () => new Date(),
  })

  enregistrerHandlersIpc(
    undefined,
    depsSession,
    () => etatSession,
    compteurActivite,
    obtenirDossierUserData,
    ordonnanceur ?? undefined,
    apresDeverrouillage,
  )

  creerFenetreDiagnostic()
  ordonnanceur.demarrer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      creerFenetreDiagnostic()
    }
  })
})

app.on('before-quit', () => {
  ordonnanceur?.arreter()
  if (etatSession.dekCourante !== null) {
    try {
      verrouiller(etatSession, depsSession)
    } catch {
      // Session deja verrouillee
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
