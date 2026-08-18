import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const SECTIONS_NAV = [
  {
    titre: 'Commercial',
    entrees: [
      { path: '/clients', label: 'Clients' },
      { path: '/devis', label: 'Devis' },
      { path: '/affaires', label: 'Affaires' },
    ],
  },
  {
    titre: 'Facturation',
    entrees: [
      { path: '/facturation', label: 'Facturation' },
      { path: '/encaissements', label: 'Encaissements' },
    ],
  },
  {
    titre: 'Ressources',
    entrees: [
      { path: '/catalogue', label: 'Catalogue' },
    ],
  },
  {
    titre: 'Données',
    entrees: [
      { path: '/import', label: 'Import' },
    ],
  },
  {
    titre: 'Système',
    entrees: [{ path: '/parametrage', label: 'Paramétrage' }],
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
              <NavLink
                key={entree.path}
                to={entree.path}
                end={entree.path === '/'}
                className={({ isActive }) => `entree${isActive ? ' activee' : ''}`}
              >
                {entree.label}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="pied">
          <p className="poste">Poste unique — session locale</p>
        </div>
      </nav>

      <main className="contenu">
        {children || <Outlet />}
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
