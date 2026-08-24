import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { POLICE_PAR_DEFAUT } from './polices'
import type { DonneesPdfDevis } from './types'

const MENTION_LIGNE = (label: string, valeur: string): Content => ({
  text: `${label} : ${valeur}`,
  style: 'mentionsLegales',
})

const formaterCentimes = (centimes: number): string => (centimes / 100).toFixed(2) + ' DA'
const formaterDate = (iso: string): string => {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

const lignesTableau = (donnees: DonneesPdfDevis): Content[][] => {
  const enTetes: Content[] = ['Désignation', 'Unité', 'Qté', 'PU HT', 'Montant HT']
  const corps: Content[][] = donnees.lignes.map((ligne) => [
    ligne.designation,
    ligne.unite,
    String(ligne.quantiteMilliemes),
    formaterCentimes(ligne.puHtCentimes),
    formaterCentimes(ligne.montantHtNetCentimes),
  ])
  return [enTetes, ...corps]
}

const mentionsLegales = (entreprise: DonneesPdfDevis['entreprise']): Content[] => [
  { text: 'Mentions légales', style: 'titreMentionsLegales' },
  MENTION_LIGNE('Dénomination', entreprise.raisonSociale),
  MENTION_LIGNE('Forme juridique', entreprise.formeJuridique),
  MENTION_LIGNE('Capital', entreprise.capital),
  MENTION_LIGNE('RC', entreprise.rc),
  MENTION_LIGNE('NIF', entreprise.nif),
  MENTION_LIGNE('NIS', entreprise.nis),
  MENTION_LIGNE('AI', entreprise.ai),
  MENTION_LIGNE('Adresse', entreprise.adresse),
  MENTION_LIGNE('Téléphone', entreprise.telephone),
  MENTION_LIGNE('TVA', 'Non applicable'),
]

export const construireGabaritDevis = (donnees: DonneesPdfDevis): TDocumentDefinitions => {
  const blocEntreprise: Content[] = [
    { text: donnees.entreprise.raisonSociale, style: 'titreEntreprise' },
    { text: donnees.entreprise.formeJuridique, style: 'infoEntreprise' },
    { text: donnees.entreprise.adresse, style: 'infoEntreprise' },
    { text: `Tél. : ${donnees.entreprise.telephone}`, style: 'infoEntreprise' },
  ]

  const blocTitre: Content[] = [
    { text: 'DEVIS', style: 'titreDocument' },
    { text: `N° ${donnees.numero}`, style: 'numeroDocument' },
    { text: `Date : ${formaterDate(donnees.dateDevis)}`, style: 'infoDocument' },
  ]
  if (donnees.dateValidite !== null) {
    blocTitre.push({ text: `Validité : ${formaterDate(donnees.dateValidite)}`, style: 'infoDocument' })
  }

  const client: Content[] = [
    { text: donnees.client.raisonSociale, style: 'titreClient' },
  ]
  if (donnees.client.nif !== null) {
    client.push({ text: `NIF : ${donnees.client.nif}`, style: 'infoClient' })
  }
  if (donnees.client.adresse !== null) {
    client.push({ text: donnees.client.adresse, style: 'infoClient' })
  }

  const affaire: Content[] = []
  if (donnees.affaire) {
    affaire.push({ text: `Affaire : ${donnees.affaire.reference}`, style: 'infoAffaire' })
    affaire.push({ text: donnees.affaire.objet, style: 'infoAffaire' })
  }

  const background = donnees.estDuplicata
    ? (): Content[] => [
        {
          text: 'DUPLICATA',
          color: '#cc0000',
          fontSize: 72,
          alignment: 'center',
          bold: true,
          margin: [0, 250, 0, 0],
        },
      ]
    : undefined

  return {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 80],
    background,
    content: [
      {
        columns: [
          { width: '*', stack: blocEntreprise },
          { width: 'auto', stack: blocTitre },
        ],
      },
      { text: '' },
      ...client,
      ...affaire,
      { text: '' },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: lignesTableau(donnees),
        },
      },
      { text: '' },
      {
        text: `Total HT : ${formaterCentimes(donnees.totalHtCentimes)}`,
        style: 'totalHt',
      },
      { text: '' },
      ...mentionsLegales(donnees.entreprise),
    ],
    defaultStyle: {
      font: POLICE_PAR_DEFAUT,
      fontSize: 9,
    },
    styles: {
      titreEntreprise: { fontSize: 14, bold: true, margin: [0, 0, 0, 3] },
      infoEntreprise: { fontSize: 9 },
      titreDocument: { fontSize: 16, bold: true, alignment: 'right', margin: [0, 0, 0, 4] },
      numeroDocument: { fontSize: 11, bold: true, alignment: 'right', margin: [0, 1, 0, 0] },
      infoDocument: { fontSize: 9, alignment: 'right', margin: [0, 2, 0, 0] },
      titreClient: { fontSize: 11, bold: true, margin: [0, 5, 0, 2] },
      infoClient: { fontSize: 9 },
      infoAffaire: { fontSize: 9, margin: [0, 2, 0, 0] },
      totalHt: { fontSize: 11, bold: true, alignment: 'right', margin: [0, 3, 0, 0] },
      mentionsLegales: { fontSize: 7.5, color: '#666666', margin: [0, 1, 0, 0] },
      titreMentionsLegales: { fontSize: 8, bold: true, color: '#666666', margin: [0, 3, 0, 2] },
    },
  }
}
