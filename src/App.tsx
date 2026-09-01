import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { utiliserSession } from './etat-session'
import { Connexion } from './ecrans/Connexion'
import { PremierDemarrage } from './ecrans/PremierDemarrage'
import { Shell } from './Shell'
import { Clients } from './ecrans/Clients'
import { FicheClient } from './ecrans/FicheClient'
import { Catalogue } from './ecrans/Catalogue'
import { FicheProduit } from './ecrans/FicheProduit'
import { Import } from './ecrans/Import'
import { Devis } from './ecrans/Devis'
import { FicheDevis } from './ecrans/FicheDevis'
import { Affaires } from './ecrans/Affaires'
import { FicheAffaire } from './ecrans/FicheAffaire'
import { Factures } from './ecrans/Factures'
import { FicheFacture } from './ecrans/FicheFacture'
import { BonsLivraison } from './ecrans/BonsLivraison'
import { FicheBonLivraison } from './ecrans/FicheBonLivraison'
import { FicheAvoir } from './ecrans/FicheAvoir'
import { Parametrage } from './ecrans/Parametrage'

function AppInterne() {
  const ecran = utiliserSession((s) => s.ecran)
  const definirEcran = utiliserSession((s) => s.definirEcran)
  const definirErreur = utiliserSession((s) => s.definirErreur)

  useEffect(() => {
    let actif = true
    window.egto.session
      .etat()
      .then((etat) => {
        if (!actif) return
        if (!etat.premierDemarrage) {
          definirEcran('premier_demarrage')
        } else {
          definirEcran('connexion')
        }
      })
      .catch(() => {
        if (actif) definirErreur('Erreur de connexion au serveur.')
      })
    return () => {
      actif = false
    }
  }, [definirEcran, definirErreur])

  if (ecran === 'chargement') {
    return <div className="ecran-chargement">Chargement…</div>
  }

  if (ecran === 'premier_demarrage') return <PremierDemarrage />
  if (ecran === 'connexion') return <Connexion />

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/clients" replace />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<FicheClient />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/catalogue/:id" element={<FicheProduit />} />
        <Route path="/import" element={<Import />} />
        <Route path="/devis" element={<Devis />} />
        <Route path="/devis/:id" element={<FicheDevis />} />
        <Route path="/affaires" element={<Affaires />} />
        <Route path="/affaires/:id" element={<FicheAffaire />} />
        <Route path="/factures" element={<Factures />} />
        <Route path="/factures/nouveau" element={<FicheFacture />} />
        <Route path="/factures/avoir/nouveau" element={<FicheAvoir />} />
        <Route path="/factures/:id" element={<FicheFacture />} />
        <Route path="/bons-livraison" element={<BonsLivraison />} />
        <Route path="/bons-livraison/nouveau" element={<FicheBonLivraison />} />
        <Route path="/bons-livraison/:id" element={<FicheBonLivraison />} />
        <Route path="/parametrage" element={<Parametrage />} />
      </Routes>
    </Shell>
  )
}

export function App() {
  return (
    <HashRouter>
      <AppInterne />
    </HashRouter>
  )
}
