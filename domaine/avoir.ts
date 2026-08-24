export interface LigneFactureOrigine {
  readonly id: number
  readonly designation: string
  readonly unite: string
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly remise_bps: number
  readonly rabais_marche_bps: number
  readonly montant_ht_net_centimes: number
}

export interface LigneAvoirCalculee {
  readonly designation: string
  readonly unite: string
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly remise_bps: number
  readonly rabais_marche_bps: number
}

export type ModeAvoir = 'TOTAL' | 'PAR_LIGNES' | 'PARTIEL'

export interface SelectionLigneAvoir {
  readonly ligneOrigineId: number
  readonly quantiteMilliemes: number
}

export function validerDonneesAvoir(params: {
  readonly factureOrigineId: number
  readonly motifAvoir: string
  readonly modeAvoir: ModeAvoir
  readonly selections?: readonly SelectionLigneAvoir[]
}): void {
  if (!Number.isSafeInteger(params.factureOrigineId) || params.factureOrigineId <= 0) {
    throw new TypeError("L'identifiant de la facture d'origine doit être un entier strictement positif.")
  }

  if (typeof params.motifAvoir !== 'string' || params.motifAvoir.trim().length < 3) {
    throw new TypeError("Le motif de l'avoir doit contenir au moins 3 caractères.")
  }

  if (params.modeAvoir !== 'TOTAL' && params.modeAvoir !== 'PAR_LIGNES' && params.modeAvoir !== 'PARTIEL') {
    throw new TypeError(`Mode d'avoir invalide : « ${params.modeAvoir} ».`)
  }

  if (params.modeAvoir === 'TOTAL') {
    return
  }

  if (!Array.isArray(params.selections) || params.selections.length === 0) {
    throw new TypeError(`La sélection des lignes est obligatoire en mode ${params.modeAvoir}.`)
  }

  const idsVus = new Set<number>()
  for (const selection of params.selections) {
    if (!Number.isSafeInteger(selection.ligneOrigineId) || selection.ligneOrigineId <= 0) {
      throw new TypeError("L'identifiant de ligne d'origine doit être un entier strictement positif.")
    }
    if (idsVus.has(selection.ligneOrigineId)) {
      throw new TypeError(`La ligne d'origine ${selection.ligneOrigineId} est sélectionnée plusieurs fois.`)
    }
    idsVus.add(selection.ligneOrigineId)

    if (!Number.isSafeInteger(selection.quantiteMilliemes) || selection.quantiteMilliemes <= 0) {
      throw new TypeError("La quantité partielle doit être un entier strictement positif.")
    }
  }
}

export function validerSelectionsPartielles(
  selections: readonly SelectionLigneAvoir[],
  lignesOrigine: readonly LigneFactureOrigine[],
): void {
  const mapLignes = new Map<number, LigneFactureOrigine>()
  for (const ligne of lignesOrigine) {
    mapLignes.set(ligne.id, ligne)
  }

  for (const selection of selections) {
    const ligne = mapLignes.get(selection.ligneOrigineId)
    if (ligne === undefined) {
      throw new TypeError(
        `La ligne d'origine ${selection.ligneOrigineId} n'existe pas dans la facture d'origine.`,
      )
    }
    if (selection.quantiteMilliemes >= ligne.quantite_milliemes) {
      throw new TypeError(
        `La quantité partielle (${selection.quantiteMilliemes}) doit être strictement inférieure à la quantité d'origine (${ligne.quantite_milliemes}) pour la ligne « ${ligne.designation} ».`,
      )
    }
  }
}

export function validerSelectionsParLignes(
  selections: readonly SelectionLigneAvoir[],
  lignesOrigine: readonly LigneFactureOrigine[],
): void {
  const mapLignes = new Map<number, LigneFactureOrigine>()
  for (const ligne of lignesOrigine) {
    mapLignes.set(ligne.id, ligne)
  }

  for (const selection of selections) {
    const ligne = mapLignes.get(selection.ligneOrigineId)
    if (ligne === undefined) {
      throw new TypeError(
        `La ligne d'origine ${selection.ligneOrigineId} n'existe pas dans la facture d'origine.`,
      )
    }
    if (selection.quantiteMilliemes !== ligne.quantite_milliemes) {
      throw new TypeError(
        `En mode PAR_LIGNES, la quantité (${selection.quantiteMilliemes}) doit être identique à la quantité d'origine (${ligne.quantite_milliemes}) pour la ligne « ${ligne.designation} ».`,
      )
    }
  }
}

export function genererLignesAvoir(
  lignesOrigine: readonly LigneFactureOrigine[],
  mode: ModeAvoir,
  selections?: readonly SelectionLigneAvoir[],
): LigneAvoirCalculee[] {
  if (mode === 'TOTAL') {
    return lignesOrigine.map((ligne) => ({
      designation: ligne.designation,
      unite: ligne.unite,
      quantite_milliemes: -ligne.quantite_milliemes,
      pu_ht_centimes: ligne.pu_ht_centimes,
      remise_bps: ligne.remise_bps,
      rabais_marche_bps: ligne.rabais_marche_bps,
    }))
  }

  if (selections === undefined || selections.length === 0) {
    throw new TypeError(`La sélection des lignes est obligatoire en mode ${mode}.`)
  }

  const mapLignes = new Map<number, LigneFactureOrigine>()
  for (const ligne of lignesOrigine) {
    mapLignes.set(ligne.id, ligne)
  }

  return selections.map((selection) => {
    const ligne = mapLignes.get(selection.ligneOrigineId)
    if (ligne === undefined) {
      throw new TypeError(
        `La ligne d'origine ${selection.ligneOrigineId} n'existe pas dans la facture d'origine.`,
      )
    }

    const quantite = mode === 'PAR_LIGNES' ? ligne.quantite_milliemes : selection.quantiteMilliemes

    return {
      designation: ligne.designation,
      unite: ligne.unite,
      quantite_milliemes: -quantite,
      pu_ht_centimes: ligne.pu_ht_centimes,
      remise_bps: ligne.remise_bps,
      rabais_marche_bps: ligne.rabais_marche_bps,
    }
  })
}
