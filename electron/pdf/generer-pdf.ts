import { createPdf, setFonts } from 'pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { chargerPolices } from './polices'

let policesEnregistrees = false

const initialiserPdfmake = (): void => {
  if (!policesEnregistrees) {
    setFonts(chargerPolices())
    policesEnregistrees = true
  }
}

export const genererPdfBuffer = async (docDef: TDocumentDefinitions): Promise<Buffer> => {
  initialiserPdfmake()
  return createPdf(docDef).getBuffer()
}

export const genererPdfFacture = async (
  docDef: TDocumentDefinitions,
): Promise<Buffer> => {
  return genererPdfBuffer(docDef)
}

export const genererPdfDevis = async (
  docDef: TDocumentDefinitions,
): Promise<Buffer> => {
  return genererPdfBuffer(docDef)
}

export const genererPdfBl = async (
  docDef: TDocumentDefinitions,
): Promise<Buffer> => {
  return genererPdfBuffer(docDef)
}
