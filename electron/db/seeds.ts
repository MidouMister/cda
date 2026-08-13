import type { Base } from './connexion'

const FAMILLES = [
  { code: 'VTE', libelle: 'Vente', ordre: 1 },
  { code: 'LOC', libelle: 'Location', ordre: 2 },
  { code: 'REA', libelle: 'Réalisation', ordre: 3 },
  { code: 'ST', libelle: 'Sous-traitance', ordre: 4 },
] as const

const EXERCICE_COURANT = {
  annee: 2026,
  date_debut: '2026-01-01',
  date_fin: '2026-12-31',
  statut: 'OUVERT',
} as const

const TRANCHES_TIMBRE = [
  { borneMin: 0, borneMax: 30000, taux: 0, plancher: 500, plafond: 1000000 },
  { borneMin: 30000, borneMax: 3000000, taux: 100, plancher: 500, plafond: 1000000 },
  { borneMin: 3000000, borneMax: 10000000, taux: 150, plancher: 500, plafond: 1000000 },
  { borneMin: 10000000, borneMax: null, taux: 200, plancher: 500, plafond: 1000000 },
] as const

const PARAMETRES_ENTREPRISE = [
  { cle: 'entreprise.denomination', description: 'Dénomination sociale de l’entreprise' },
  { cle: 'entreprise.forme_juridique', description: 'Forme juridique (SARL, EURL, EPE, …)' },
  { cle: 'entreprise.capital_centimes', description: 'Capital social en centimes' },
  { cle: 'entreprise.rc', description: 'Numéro de registre de commerce' },
  { cle: 'entreprise.nif', description: 'Numéro d’identification fiscale' },
  { cle: 'entreprise.nis', description: 'Numéro d’identification statistique' },
  { cle: 'entreprise.ai', description: 'Article d’imposition' },
  { cle: 'entreprise.adresse', description: 'Adresse du siège social' },
  { cle: 'entreprise.telephone', description: 'Numéro de téléphone' },
  { cle: 'entreprise.fax', description: 'Numéro de fax' },
  { cle: 'entreprise.email', description: 'Adresse électronique' },
] as const

export const SEUIL_ESPECES_CLE = 'timbre.seuil_max_especes_centimes'
export const SEUIL_ESPECES_CENTIMES = '100000000'

export const insererSeeds = (base: Base): void => {
  const inserer = base.transaction(() => {
    const insererFamille = base.prepare(
      `INSERT INTO familles (code, libelle, ordre, statut)
       VALUES (?, ?, ?, 'ACTIF')
       ON CONFLICT (code) DO NOTHING`,
    )
    for (const famille of FAMILLES) {
      insererFamille.run(famille.code, famille.libelle, famille.ordre)
    }

    base
      .prepare(
        `INSERT INTO exercices (annee, date_debut, date_fin, statut)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (annee) DO NOTHING`,
      )
      .run(EXERCICE_COURANT.annee, EXERCICE_COURANT.date_debut, EXERCICE_COURANT.date_fin, EXERCICE_COURANT.statut)

    const nombreTranches = base.prepare('SELECT COUNT(*) AS n FROM bareme_timbre').get() as { n: number }
    if (nombreTranches.n === 0) {
      const insererTranche = base.prepare(
        `INSERT INTO bareme_timbre
           (borne_min_ttc_centimes, borne_max_ttc_centimes, taux_bps, plancher_centimes, plafond_centimes, actif)
         VALUES (?, ?, ?, ?, ?, 1)`,
      )
      for (const tranche of TRANCHES_TIMBRE) {
        insererTranche.run(tranche.borneMin, tranche.borneMax, tranche.taux, tranche.plancher, tranche.plafond)
      }
    }

    const insererParametre = base.prepare(
      `INSERT INTO parametres (cle, valeur, description)
       VALUES (?, ?, ?)
       ON CONFLICT (cle) DO NOTHING`,
    )
    insererParametre.run(
      SEUIL_ESPECES_CLE,
      SEUIL_ESPECES_CENTIMES,
      'Seuil maximum d’un versement en espèces soumis au droit de timbre (défaut 1 000 000 DA)',
    )
    for (const parametre of PARAMETRES_ENTREPRISE) {
      insererParametre.run(parametre.cle, '', parametre.description)
    }
  })
  inserer()
}
