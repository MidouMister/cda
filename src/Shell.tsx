import type { ReactNode } from 'react'

const SECTIONS_NAV = [
  {
    titre: 'Pilotage',
    entrees: [{ id: 'tableau-de-bord', label: 'Tableau de bord' }],
  },
  {
    titre: 'Commercial',
    entrees: [
      { id: 'clients', label: 'Clients' },
      { id: 'devis', label: 'Devis' },
      { id: 'affaires', label: 'Affaires' },
    ],
  },
  {
    titre: 'Facturation',
    entrees: [
      { id: 'facturation', label: 'Facturation' },
      { id: 'encaissements', label: 'Encaissements' },
    ],
  },
  {
    titre: 'Garanties',
    entrees: [
      { id: 'cautions', label: 'Cautions' },
      { id: 'retenues', label: 'Retenues de garantie' },
    ],
  },
  {
    titre: 'Ressources',
    entrees: [
      { id: 'sous-traitants', label: 'Sous-traitants' },
      { id: 'catalogue', label: 'Catalogue' },
    ],
  },
  {
    titre: 'Système',
    entrees: [{ id: 'parametrage', label: 'Paramétrage' }],
  },
]

const AUJOURDHUI = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function Shell({ children }: { children?: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="feux">
          <span className="feu" style={{ background: 'var(--tl-red)' }} />
          <span className="feu" style={{ background: 'var(--tl-yellow)' }} />
          <span className="feu" style={{ background: 'var(--tl-green)' }} />
        </div>
        <span className="titre">EGTO — Gestion Commerciale</span>
      </header>

      <nav className="sidebar">
        {SECTIONS_NAV.map((section) => (
          <div key={section.titre}>
            <div className="section-titre">{section.titre}</div>
            {section.entrees.map((entree) => (
              <a key={entree.id} className="entree" href={`#${entree.id}`}>
                {entree.label}
              </a>
            ))}
          </div>
        ))}
        <div className="pied">
          <p className="poste">Poste unique — session locale</p>
        </div>
      </nav>

      <main className="contenu">
        {children ?? <p style={{ color: 'var(--text-secondary)' }}>Sélectionnez un module dans la barre latérale.</p>}
      </main>

      <footer className="statusbar">
        <span className="pastille">
          <span className="rond" />
          Base chiffrée (SQLCipher)
        </span>
        <span>Hors ligne — poste unique</span>
        <span style={{ marginLeft: 'auto' }}>{AUJOURDHUI}</span>
      </footer>
    </div>
  )
}
