import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { ouvrirBaseDev } from './cle-de-dev'
import { fermerBase } from './db/connexion'
import { appliquerMigrations } from './db/migrations'
import { insererSeeds } from './db/seeds'
import { enregistrerHandlersIpc } from './ipc/enregistrer-ipc'

// PROVISOIRE (J1) : la base de dev s'ouvre avec la clé générée dans egto.cle
// (userData). Le J2 la remplacera par la DEK 256 bits chiffrée en enveloppe.
const ouvrirBaseDeDev = (): void => {
  try {
    const dossierUtilisateur = app.getPath('userData')
    const base = ouvrirBaseDev(join(dossierUtilisateur, 'egto.db'), dossierUtilisateur)
    appliquerMigrations(base)
    insererSeeds(base)
  } catch (erreur) {
    console.error(
      'EGTO — échec de l’ouverture de la base de développement (l’écran de connexion du J2 gérera le chiffrement réel) :',
      erreur,
    )
  }
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
  enregistrerHandlersIpc()
  ouvrirBaseDeDev()
  creerFenetreDiagnostic()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      creerFenetreDiagnostic()
    }
  })
})

app.on('before-quit', () => {
  fermerBase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
