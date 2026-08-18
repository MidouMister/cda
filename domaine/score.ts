import type { ScoreClient } from './entites-referentielles'

export interface ParametresScoreClient {
  delaiMoyenPaiementJours: number
  caAnnuelTtcCentimes: number
  nombreAffairesAnnee: number
  nombreFacturesEnRetard12Mois: number
  creanceImpayeeEcheancePlus90Jours: boolean
  contentieuxDeclare: boolean
  estGroupeOuGitra: boolean
}

export interface ResultatScoreClient {
  score: ScoreClient
  motif: string
}

export function calculerScoreClient(params: ParametresScoreClient): ResultatScoreClient {
  const { delaiMoyenPaiementJours: delai, caAnnuelTtcCentimes: ca, nombreAffairesAnnee: nbAffaires, nombreFacturesEnRetard12Mois: nbRetards, creanceImpayeeEcheancePlus90Jours: creance, contentieuxDeclare: contentieux, estGroupeOuGitra: gitra } = params

  if (delai > 90 || creance || contentieux) {
    const motif = (delai > 90 ? `Delai moyen ${delai}j > 90j` : null)
      ?? (creance ? 'Creance impayee > 90j' : null)
      ?? (contentieux ? 'Contentieux declare' : null)
      ?? 'Critere D inconnu'

    if (gitra) {
      return { score: 'C', motif }
    }
    return { score: 'D', motif }
  }

  if (delai > 60 || ca < 2_000_000_00 || nbRetards >= 2) {
    const motif = (delai > 60 ? `Delai moyen ${delai}j` : null)
      ?? (ca < 2_000_000_00 ? 'CA inferieur au seuil' : null)
      ?? (nbRetards >= 2 ? `${nbRetards} retards > 2` : null)
      ?? 'Critere C inconnu'
    return { score: 'C', motif }
  }

  const caDa = Math.floor(ca / 100)
  const motifBase = `Delai moyen ${delai}j, ${caDa} DA, ${nbAffaires} affaire${nbAffaires > 1 ? 's' : ''}`

  if (delai <= 30 && ca > 10_000_000_00 && nbAffaires >= 3) {
    return { score: 'A', motif: motifBase }
  }

  if (delai <= 60 && ca > 2_000_000_00 && nbAffaires >= 1) {
    return { score: 'B', motif: motifBase }
  }

  return { score: 'A', motif: motifBase }
}
