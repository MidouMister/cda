import { useEffect, useState } from 'react'
import type { Diagnostic } from '../contrats'

export function App() {
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let actif = true

    window.egto
      .diagnostic()
      .then((resultat) => {
        if (actif) {
          setDiagnostic(resultat)
        }
      })
      .catch((raison) => {
        if (actif) {
          setErreur(raison instanceof Error ? raison.message : String(raison))
        }
      })

    return () => {
      actif = false
    }
  }, [])

  return (
    <main className="ecran-diagnostic">
      <h1>EGTO — Diagnostic J1</h1>
      {erreur ? (
        <p className="erreur">{erreur}</p>
      ) : diagnostic ? (
        <section className="versions" aria-label="Versions d'environnement">
          <p>
            Electron : <code>{diagnostic.versions.electron}</code>
          </p>
          <p>
            Chromium : <code>{diagnostic.versions.chromium}</code>
          </p>
          <p>
            Node : <code>{diagnostic.versions.node}</code>
          </p>
          <p>
            Plateforme : <code>{diagnostic.plateforme}</code>
          </p>
          <p className="ok">IPC fonctionnel</p>
        </section>
      ) : (
        <p className="en-attente">Chargement…</p>
      )}
    </main>
  )
}
