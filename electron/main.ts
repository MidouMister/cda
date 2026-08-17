import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { ouvrirBase, fermerBase } from './db/connexion'
import { appliquerMigrations } from './db/migrations'
import { insererSeeds } from './db/seeds'
import { verrouiller, CompteurInactivite } from './securite/session'
import { enregistrerHandlersIpc } from './ipc/enregistrer-ipc'
import type { DepsSession } from './securite/session'

export const DUREE_INACTIVITE_MS = 30 * 60 * 1000

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
  enregistrerHandlersIpc(
    undefined,
    depsSession,
    () => etatSession,
    compteurActivite,
    obtenirDossierUserData,
  )

  creerFenetreDiagnostic()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      creerFenetreDiagnostic()
    }
  })
})

app.on('before-quit', () => {
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
