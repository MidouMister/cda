import { useState } from 'react'
import type { LigneExcel, LigneImporteeVue, RapportImport } from '../../contrats'

type Etape = 1 | 2 | 3

interface EtatImport {
  typeImport: 'CLIENTS' | 'PRODUITS'
  fichierChemin: string
  lignesBrutes: LigneExcel[]
  colonnes: { entete: string; index: number }[]
  lignesValidees: LigneImporteeVue[]
  rapport: RapportImport | null
}

const VALEURS_INITIALES: EtatImport = {
  typeImport: 'CLIENTS',
  fichierChemin: '',
  lignesBrutes: [],
  colonnes: [],
  lignesValidees: [],
  rapport: null,
}

export function Import() {
  const [etape, setEtape] = useState<Etape>(1)
  const [etat, setEtat] = useState<EtatImport>(VALEURS_INITIALES)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const choisirFichier = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls,.csv'
    input.onchange = async () => {
      const fichier = input.files?.[0]
      if (!fichier) return
      setEnCours(true)
      setErreur(null)
      try {
        const resultat = await window.egto.import.lireFichier(fichier.name)
        setEtat((prev) => ({
          ...prev,
          fichierChemin: fichier.name,
          lignesBrutes: resultat.lignes,
          colonnes: resultat.colonnes,
        }))
        setEtape(2)
      } catch (err) {
        setErreur(err instanceof Error ? err.message : 'Erreur de lecture du fichier.')
      } finally {
        setEnCours(false)
      }
    }
    input.click()
  }

  const validerLignes = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      const validees = await window.egto.import.validerLignes(etat.lignesBrutes, etat.typeImport)
      setEtat((prev) => ({ ...prev, lignesValidees: validees }))
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur de validation.')
    } finally {
      setEnCours(false)
    }
  }

  const executerImport = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      const correspondances: Record<string, string> = {}
      for (const col of etat.colonnes) {
        correspondances[col.entete] = col.entete
      }
      const rapport = await window.egto.import.executer(
        { type: etat.typeImport, correspondances },
        etat.lignesBrutes,
      )
      setEtat((prev) => ({ ...prev, rapport }))
      setEtape(3)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur d'exécution de l'import.")
    } finally {
      setEnCours(false)
    }
  }

  const nombreValides = etat.lignesValidees.filter((l) => l.valide).length
  const nombreErreurs = etat.lignesValidees.filter((l) => !l.valide).length
  const peutImporter = nombreValides > 0 && !enCours

  return (
    <div className="ecran-import">
      <div className="en-tete-ecran">
        <h1>Import de données</h1>
      </div>

      <div className="import-barre-etapes">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`import-etape ${etape === n ? 'import-etape-active' : ''} ${etape > n ? 'import-etape-terminee' : ''}`}>
            <span className="import-etape-numero">{n}</span>
            <span className="import-etape-label">
              {n === 1 ? 'Sélection' : n === 2 ? 'Prévisualisation' : 'Rapport'}
            </span>
          </div>
        ))}
      </div>

      {erreur && <div className="bandeau-erreur">{erreur}</div>}

      {etape === 1 && (
        <div className="import-contenu">
          <div className="import-selection">
            <div className="champ-formulaire">
              <label htmlFor="type-import">Type de données</label>
              <select
                id="type-import"
                value={etat.typeImport}
                onChange={(e) => setEtat((p) => ({ ...p, typeImport: e.target.value as 'CLIENTS' | 'PRODUITS' }))}
              >
                <option value="CLIENTS">Clients</option>
                <option value="PRODUITS">Produits</option>
              </select>
            </div>
            <button className="bouton" onClick={choisirFichier} disabled={enCours}>
              {enCours ? 'Lecture…' : 'Choisir le fichier'}
            </button>
            {etat.fichierChemin && (
              <p className="import-fichier-info">
                Fichier : <strong>{etat.fichierChemin}</strong> — {etat.lignesBrutes.length} ligne(s)
              </p>
            )}
          </div>
        </div>
      )}

      {etape === 2 && (
        <div className="import-contenu">
          <div className="import-resume">
            <span className="import-chiffre import-chiffre-valide">{nombreValides} valide(s)</span>
            <span className="import-chiffre import-chiffre-erreur">{nombreErreurs} erreur(s)</span>
          </div>

          {nombreErreurs > 0 && (
            <table className="tableau import-erreurs">
              <thead>
                <tr>
                  <th>Ligne</th>
                  <th>Colonne</th>
                  <th>Valeur</th>
                  <th>Erreur</th>
                </tr>
              </thead>
              <tbody>
                {etat.lignesValidees
                  .filter((l) => !l.valide)
                  .flatMap((l) =>
                    l.erreurs.map((e, i) => (
                      <tr key={`${l.donnees.numeroLigne}-${i}`}>
                        <td>{e.ligne}</td>
                        <td>{e.colonne}</td>
                        <td>{String(e.valeur)}</td>
                        <td className="erreur-texte">{e.erreur}</td>
                      </tr>
                    )),
                  )}
              </tbody>
            </table>
          )}

          <div className="import-actions">
            <button className="bouton-secondaire" onClick={() => setEtape(1)}>
              ← Retour
            </button>
            <button
              className="bouton"
              onClick={async () => {
                await validerLignes()
                if (nombreErreurs === 0) await executerImport()
              }}
              disabled={!peutImporter}
            >
              {enCours ? 'Import…' : 'Importer'}
            </button>
          </div>
        </div>
      )}

      {etape === 3 && etat.rapport && (
        <div className="import-contenu">
          <div className="import-rapport">
            <h2>Rapport d&apos;import</h2>
            <div className="import-chiffres">
              <div className="import-chiffre-card">
                <span className="import-chiffre">{etat.rapport.totalLignes}</span>
                <span className="import-chiffre-label">Total lignes</span>
              </div>
              <div className="import-chiffre-card import-chiffre-card-valide">
                <span className="import-chiffre">{etat.rapport.lignesImportees}</span>
                <span className="import-chiffre-label">Importées</span>
              </div>
              <div className="import-chiffre-card import-chiffre-card-erreur">
                <span className="import-chiffre">{etat.rapport.erreurs.length}</span>
                <span className="import-chiffre-label">Erreurs</span>
              </div>
            </div>

            {etat.rapport.erreurs.length > 0 && (
              <table className="tableau import-erreurs">
                <thead>
                  <tr>
                    <th>Ligne</th>
                    <th>Colonne</th>
                    <th>Valeur</th>
                    <th>Erreur</th>
                  </tr>
                </thead>
                <tbody>
                  {etat.rapport.erreurs.map((e, i) => (
                    <tr key={i}>
                      <td>{e.ligne}</td>
                      <td>{e.colonne}</td>
                      <td>{String(e.valeur)}</td>
                      <td className="erreur-texte">{e.erreur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="import-actions">
              <button className="bouton" onClick={() => { setEtape(1); setEtat(VALEURS_INITIALES) }}>
                Nouvel import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
