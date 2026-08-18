interface Champ {
  id: string
  label: string
  type: 'texte' | 'nombre' | 'email' | 'select' | 'date' | 'textarea'
  obligatoire?: boolean
  options?: { valeur: string; libelle: string }[]
  valeurInitiale?: string | number
}

interface Props {
  champs: Champ[]
  valeurs: Record<string, string | number>
  onChange: (id: string, valeur: string | number) => void
  erreurs?: Record<string, string>
  soumettre?: () => void
  labelBouton?: string
}

function valeurStr(v: string | number | undefined): string {
  if (v === undefined || v === null) return ''
  return String(v)
}

function ChampFormulaire({
  champ,
  valeur,
  erreur,
  onChange,
}: {
  champ: Champ
  valeur: string
  erreur?: string
  onChange: (id: string, valeur: string | number) => void
}) {
  const idHtml = `champ-${champ.id}`

  if (champ.type === 'select') {
    return (
      <div className="champ-formulaire">
        <label htmlFor={idHtml}>
          {champ.label}
          {champ.obligatoire && <span className="obligatoire"> *</span>}
        </label>
        <select
          id={idHtml}
          value={valeur}
          onChange={(e) => onChange(champ.id, e.target.value)}
        >
          <option value="">— Sélectionner —</option>
          {champ.options?.map((opt) => (
            <option key={opt.valeur} value={opt.valeur}>
              {opt.libelle}
            </option>
          ))}
        </select>
        {erreur && <span className="erreur-champ">{erreur}</span>}
      </div>
    )
  }

  if (champ.type === 'textarea') {
    return (
      <div className="champ-formulaire">
        <label htmlFor={idHtml}>
          {champ.label}
          {champ.obligatoire && <span className="obligatoire"> *</span>}
        </label>
        <textarea
          id={idHtml}
          value={valeur}
          onChange={(e) => onChange(champ.id, e.target.value)}
          rows={3}
        />
        {erreur && <span className="erreur-champ">{erreur}</span>}
      </div>
    )
  }

  return (
    <div className="champ-formulaire">
      <label htmlFor={idHtml}>
        {champ.label}
        {champ.obligatoire && <span className="obligatoire"> *</span>}
      </label>
      <input
        id={idHtml}
        type={champ.type === 'nombre' ? 'number' : champ.type}
        value={valeur}
        onChange={(e) =>
          onChange(champ.id, champ.type === 'nombre' ? Number(e.target.value) : e.target.value)
        }
      />
      {erreur && <span className="erreur-champ">{erreur}</span>}
    </div>
  )
}

export function Formulaire({ champs, valeurs, onChange, erreurs, soumettre, labelBouton }: Props) {
  const tousRemplis = champs
    .filter((c) => c.obligatoire)
    .every((c) => {
      const v = valeurs[c.id]
      return v !== undefined && v !== ''
    })

  return (
    <form
      className="formulaire"
      onSubmit={(e) => {
        e.preventDefault()
        soumettre?.()
      }}
    >
      {champs.map((champ) => (
        <ChampFormulaire
          key={champ.id}
          champ={champ}
          valeur={valeurStr(valeurs[champ.id])}
          erreur={erreurs?.[champ.id]}
          onChange={onChange}
        />
      ))}
      {soumettre && (
        <button
          className="bouton"
          type="submit"
          disabled={!tousRemplis}
        >
          {labelBouton ?? 'Enregistrer'}
        </button>
      )}
    </form>
  )
}
