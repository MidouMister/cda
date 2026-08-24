import type {
  Content,
  CustomTableLayout,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces'
import type { DonneesPdfFacture } from './types'
import { POLICE_PAR_DEFAUT, POLICE_ARABE } from './polices'

const LARGEUR_A4_PT = 595
const HAUTEUR_A4_PT = 842

const SVG_FILIGRANE_DUPLICATA =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR_A4_PT}" height="${HAUTEUR_A4_PT}">` +
  `<text x="297" y="442" font-family="Helvetica" font-size="60" font-weight="bold"` +
  ` fill="#ff0000" fill-opacity="0.15" text-anchor="middle"` +
  ` transform="rotate(-45 297 421)">DUPLICATA</text>` +
  `</svg>`

const formaterCentimes = (centimes: number): string => {
  const da = centimes / 100
  return da.toFixed(2) + ' DA'
}

const formaterDate = (isoDate: string): string => {
  const [annee, mois, jour] = isoDate.split('-')
  return `${jour}/${mois}/${annee}`
}

const formaterQuantite = (quantiteMilliemes: number): string =>
  quantiteMilliemes > 1000
    ? String(quantiteMilliemes / 1000)
    : String(quantiteMilliemes)

const formaterTauxBps = (bps: number): string => `${(bps / 100).toFixed(2)} %`

const contientCaracteresArabes = (texte: string): boolean =>
  /[\u0600-\u06FF]/.test(texte)

const libelleTypeDocument = (typeDocument: string): string =>
  typeDocument === 'AVOIR' ? 'AVOIR' : 'FACTURE'

const celluleDesignation = (designation: string): TableCell =>
  contientCaracteresArabes(designation)
    ? { text: designation, style: 'texteArabe' }
    : { text: designation }

const celluleLibellePied = (libelle: string): TableCell => ({
  text: libelle,
  style: 'piedLibelle',
})

const celluleMontantPied = (montant: string): TableCell => ({
  text: montant,
  style: 'piedMontant',
})

const celluleLibellePiedFort = (libelle: string): TableCell => ({
  text: libelle,
  style: 'piedLibelleFort',
})

const celluleMontantPiedFort = (montant: string): TableCell => ({
  text: montant,
  style: 'piedMontantFort',
})

const dispositionPiedFacture: CustomTableLayout = {
  hLineWidth: (numeroLigne, noeud) =>
    numeroLigne === noeud.table.body.length - 1 ? 1 : 0,
  vLineWidth: () => 0,
  paddingTop: () => 2,
  paddingBottom: () => 2,
}

const construireTableauLignes = (
  lignes: DonneesPdfFacture['lignes'],
): TableCell[][] => {
  const enTetes: TableCell[] = [
    { text: 'Désignation', bold: true, fillColor: '#f0f0f0' },
    { text: 'Unité', bold: true, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'Qté', bold: true, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'PU HT', bold: true, alignment: 'right', fillColor: '#f0f0f0' },
    { text: 'Remise', bold: true, alignment: 'right', fillColor: '#f0f0f0' },
    { text: 'Rabais', bold: true, alignment: 'right', fillColor: '#f0f0f0' },
    { text: 'Net HT', bold: true, alignment: 'right', fillColor: '#f0f0f0' },
  ]

  const lignesCommerciales = lignes.filter(
    (ligne) => ligne.typeLigne !== 'AJUSTEMENT_ARRONDI',
  )

  const corps: TableCell[][] = lignesCommerciales.map((ligne) => [
    celluleDesignation(ligne.designation),
    { text: ligne.unite, alignment: 'center' },
    { text: formaterQuantite(ligne.quantiteMilliemes), alignment: 'center' },
    { text: formaterCentimes(ligne.puHtCentimes), alignment: 'right' },
    { text: formaterTauxBps(ligne.remiseBps), alignment: 'right' },
    { text: formaterTauxBps(ligne.rabaisMarcheBps), alignment: 'right' },
    { text: formaterCentimes(ligne.montantHtNetCentimes), alignment: 'right' },
  ])

  return [enTetes, ...corps]
}

const construireCorpsPiedFacture = (
  pied: DonneesPdfFacture['pied'],
): TableCell[][] => {
  const corps: TableCell[][] = [
    [
      celluleLibellePied('Total HT lignes'),
      celluleMontantPied(formaterCentimes(pied.totalHtLignesCentimes)),
    ],
    [
      celluleLibellePied('Total remises'),
      celluleMontantPied(
        `-${formaterCentimes(Math.abs(pied.totalRemisesCentimes))}`,
      ),
    ],
    [
      celluleLibellePied('Net commercial HT'),
      celluleMontantPied(formaterCentimes(pied.netCommercialHtCentimes)),
    ],
  ]

  if (pied.retenueGarantieCentimes > 0) {
    corps.push([
      celluleLibellePied('Retenue de garantie'),
      celluleMontantPied(formaterCentimes(pied.retenueGarantieCentimes)),
    ])
  }

  corps.push(
    [
      celluleLibellePiedFort('Total HT'),
      celluleMontantPiedFort(formaterCentimes(pied.totalHtCentimes)),
    ],
    [
      celluleLibellePied('TVA 19 %'),
      celluleMontantPied(formaterCentimes(pied.totalTvaCentimes)),
    ],
    [
      celluleLibellePiedFort('Total TTC'),
      celluleMontantPiedFort(formaterCentimes(pied.totalTtcCentimes)),
    ],
    [
      { text: 'NET À PAYER', style: 'netAPayerLibelle' },
      { text: formaterCentimes(pied.netAPayerCentimes), style: 'netAPayerMontant' },
    ],
  )

  return corps
}

export const construireGabaritFacture = (
  donnees: DonneesPdfFacture,
): TDocumentDefinitions => {
  const { facture, pied, client, affaire, entreprise } = donnees

  const colonneTitre: Content[] = [
    {
      text: libelleTypeDocument(facture.typeDocument),
      bold: true,
      fontSize: 16,
      alignment: 'right',
    },
  ]
  if (facture.numero !== null) {
    colonneTitre.push({
      text: facture.numero,
      fontSize: 11,
      alignment: 'right',
    })
  }

  const enTete: Content = {
    columns: [
      { text: entreprise.raisonSociale, width: '*', fontSize: 11 },
      { width: 'auto', stack: colonneTitre },
    ],
  }

  const infosDocument: TableCell[][] = [
    [
      { text: 'Date de facture' },
      { text: formaterDate(facture.dateFacture) },
    ],
  ]
  if (facture.dateEcheance !== null) {
    infosDocument.push([
      { text: 'Date d’échéance' },
      { text: formaterDate(facture.dateEcheance) },
    ])
  }
  if (facture.numeroBcClient !== null) {
    infosDocument.push([
      { text: 'N° BC client' },
      { text: facture.numeroBcClient },
    ])
  }

  const contenuClient: Content[] = [
    { text: client.raisonSociale, bold: true, fontSize: 11 },
  ]
  if (client.nif !== null) {
    contenuClient.push({ text: `NIF : ${client.nif}`, fontSize: 9 })
  }
  if (client.adresse !== null) {
    contenuClient.push({ text: client.adresse, fontSize: 9 })
  }

  const sectionsAffaire: Content[] = []
  if (affaire) {
    sectionsAffaire.push(
      { text: 'AFFAIRE', bold: true, fontSize: 10, margin: [0, 10, 0, 2] },
      { text: `Référence : ${affaire.reference}` },
      { text: `Objet : ${affaire.objet}` },
    )
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 95],
    background: donnees.estDuplicata
      ? (): Content[] => [
          {
            svg: SVG_FILIGRANE_DUPLICATA,
            absolutePosition: { x: 0, y: 0 },
          },
        ]
      : undefined,
    footer: (): Content => ({
      style: 'mentionsLegales',
      stack: [
        `${entreprise.raisonSociale} — ${entreprise.formeJuridique}`,
        `Capital : ${entreprise.capital}`,
        `RC : ${entreprise.rc} — NIF : ${entreprise.nif} — NIS : ${entreprise.nis}`,
        `AI : ${entreprise.ai}`,
        entreprise.adresse,
        `Tél : ${entreprise.telephone}`,
        `Mode de règlement : ${facture.modeReglementPrevu ?? 'Non renseigné'}`,
        'TVA : 19 %',
      ],
    }),
    content: [
      enTete,
      {
        table: {
          widths: ['auto', '*'],
          body: infosDocument,
        },
        layout: 'noBorders',
        margin: [0, 8, 0, 0],
      },
      {
        table: {
          widths: ['*'],
          body: [[{ stack: contenuClient }]],
        },
        margin: [0, 12, 0, 0],
      },
      ...sectionsAffaire,
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: construireTableauLignes(donnees.lignes),
        },
        margin: [0, 14, 0, 0],
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: construireCorpsPiedFacture(pied),
        },
        layout: dispositionPiedFacture,
        margin: [0, 14, 0, 0],
      },
    ],
    defaultStyle: {
      font: POLICE_PAR_DEFAUT,
      fontSize: 9,
    },
    styles: {
      texteArabe: { font: POLICE_ARABE },
      piedLibelle: { fontSize: 9, alignment: 'right' },
      piedMontant: { fontSize: 9, alignment: 'right' },
      piedLibelleFort: { fontSize: 9, bold: true, alignment: 'right' },
      piedMontantFort: { fontSize: 9, bold: true, alignment: 'right' },
      netAPayerLibelle: { fontSize: 12, bold: true, alignment: 'right' },
      netAPayerMontant: { fontSize: 12, bold: true, alignment: 'right' },
      mentionsLegales: {
        fontSize: 7.5,
        color: '#666666',
        margin: [40, 6, 40, 0],
      },
    },
  }
}
