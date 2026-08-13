import { contextBridge, ipcRenderer } from 'electron'
import { construireApiEgto } from './construire-api-egto'

contextBridge.exposeInMainWorld('egto', construireApiEgto(ipcRenderer))
