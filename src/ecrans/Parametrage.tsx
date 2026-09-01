import { useEffect, useState } from 'react'
import type { EntreeJournalVue, ExerciceVue, ParametreVue } from '../../contrats'
import { Sauvegardes } from './Sauvegardes'

const CLES_ENTREPRISE = [
  { cle: 'entreprise.denomination', libelle: 'Dénomination sociale' },
  { cle: 'entreprise.forme_juridique', libelle: 'Forme juridique' },
  { cle: 'entreprise.capital_centimes', libelle: 'Capital social (DA)' },
  { cle: 'entreprise.rc', libelle: 'Registre de commerce (RC)' },
  { cle: 'entreprise.nif', libelle: 'NIF' },
  { cle: 'entreprise.nis', libelle: 'NIS (15 chiffres)' },
  { cle: 'entreprise.ai', libelle: 'Article d’imposition (AI)' },
  { cle: 'entreprise.adresse', libelle: 'Adresse' },
  { cle: 'entreprise.telephone', libelle: 'Téléphone' },
  { cle: 'entreprise.fax', libelle: 'Fax' },
  { cle: 'entreprise.email', libelle: 'Adresse électronique' },
] as const

const CLASSE_NIVEAU = {
  erreur: 'badge-score-d',
  avertissement: 'badge-score-c',
  info: 'badge-score-a',
} as const

function SiEntreprise() {
  const [parametres, setParametres] = useState<ParametreVue[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true
    Promise.all(
      CLES_ENTREPRISE.map(({ cle }) => window.egto.parametres.lire(cle)),
    )
      .then((resultats) => {
        if (!actif) return
        setParametres(
          CLES_ENTREPRISE.map(({ cle, libelle }, i) => {
            const trouvé = resultats[i]
            return trouvé ?? { cle, valeur: '', description: libelle }
          }),
        )
      })
      .catch(() => {})
      .finally(() => {
        if (actif) setChargement(false)
      })
    return () => {
      actif = false
    }
  }, [])

  if (chargement) {
    return <p className="parametrage-notes">Chargement…</p>
  }

  return (
    <dl className="fiche-champs">
      {parametres.map((p) => (
        <div key={p.cle} className="champ-lecture">
          <dt>{p.description ?? p.cle}</dt>
          <dd>{p.valeur.trim() !== '' ? p.valeur : '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function SiJournaux() {
  const [entrees, setEntrees] = useState<EntreeJournalVue[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true
    window.egto.journal
      .lire({ nombre: 20 })
      .then((resultat) => {
        if (actif) setEntrees(resultat.entrees)
      })
      .catch(() => {})
      .finally(() => {
        if (actif) setChargement(false)
      })
    return () => {
      actif = false
    }
  }, [])

  if (chargement) {
    return <p className="parametrage-notes">Chargement…</p>
  }

  if (entrees.length === 0) {
    return <p className="parametrage-notes">Aucune entrée de journal pour le moment.</p>
  }

  return (
    <table className="tableau parametrage-journal">
      <thead>
        <tr>
          <th>Horodatage</th>
          <th>Niveau</th>
          <th>Module</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        {entrees.map((entree, i) => (
          <tr key={`${entree.horodatage}-${i}`}>
            <td>{entree.horodatage}</td>
            <td>
              <span className={`badge-score ${CLASSE_NIVEAU[entree.niveau as keyof typeof CLASSE_NIVEAU] ?? 'badge-score-a'}`}>
                {entree.niveau}
              </span>
            </td>
            <td>{entree.module}</td>
            <td className="parametrage-journal-message">{entree.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SiExercice() {
  const [exercice, setExercice] = useState<ExerciceVue | null>(null)

  useEffect(() => {
    let actif = true
    window.egto.exercices
      .courant()
      .then((resultat) => {
        if (actif) setExercice(resultat)
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  return (
    <p className="parametrage-notes">
      {exercice
        ? `Exercice comptable courant : ${exercice.annee} (${exercice.statut}).`
        : 'Aucun exercice comptable courant.'}{' '}
      La gestion des exercices sera disponible dans une version ultérieure.
    </p>
  )
}

export function Parametrage() {
  return (
    <div className="ecran-parametrage">
      <div className="en-tete-ecran">
        <h1>Paramétrage</h1>
      </div>

      <div className="parametrage-contenu">
        <section className="parametrage-section">
          <h2>Entreprise</h2>
          <SiEntreprise />
          <p className="parametrage-notes">
            La modification des informations d’identité de l’entreprise sera disponible dans une version ultérieure.
          </p>
        </section>

        <Sauvegardes />

        <section className="parametrage-section">
          <h2>Journaux</h2>
          <SiJournaux />
        </section>

        <section className="parametrage-section">
          <h2>Barème du timbre</h2>
          <p className="parametrage-notes">
            Module désactivé — le droit de timbre est traité manuellement à l’encaissement (décision du 15/08/2026).
          </p>
        </section>

        <section className="parametrage-section">
          <h2>Exercices</h2>
          <SiExercice />
        </section>

        <section className="parametrage-section">
          <h2>Numérotation</h2>
          <p className="parametrage-notes">La gestion de la numérotation sera disponible dans une version ultérieure.</p>
        </section>

        <section className="parametrage-section">
          <h2>Alertes</h2>
          <p className="parametrage-notes">La configuration des alertes sera disponible dans une version ultérieure.</p>
        </section>
      </div>
    </div>
  )
}