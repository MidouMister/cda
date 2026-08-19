interface Alerte {
  readonly categorie: string
  readonly niveau: string
  readonly message: string
}

interface Props {
  alertes: readonly Alerte[]
}

const ICONE_NIVEAU: Record<string, string> = {
  CRITIQUE: '\u26A0',
  AVERTISSEMENT: '\u26A1',
  INFO: '\u2139',
}

const CLASSE_NIVEAU: Record<string, string> = {
  CRITIQUE: 'alerte-critique',
  AVERTISSEMENT: 'alerte-avertissement',
  INFO: 'alerte-info',
}

export function BandeauAlertes({ alertes }: Props) {
  if (alertes.length === 0) return null

  return (
    <div className="bandeau-alertes">
      {alertes.map((alerte, i) => (
        <div
          key={`${alerte.categorie}-${i}`}
          className={`alerte-ligne ${CLASSE_NIVEAU[alerte.niveau] ?? 'alerte-info'}`}
        >
          <span className="alerte-icone">
            {ICONE_NIVEAU[alerte.niveau] ?? '\u2139'}
          </span>
          <span>{alerte.message}</span>
        </div>
      ))}
    </div>
  )
}
