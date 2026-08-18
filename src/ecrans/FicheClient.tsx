import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FicheAOnglets } from '../composants/FicheAOnglets'
import { Liste } from '../composants/Liste'
import { Formulaire } from '../composants/Formulaire'
import type { ClientVue, ContactVue, InteractionVue } from '../../contrats'
import type { ColumnDef } from '@tanstack/react-table'

const colonnesContacts: ColumnDef<ContactVue, unknown>[] = [
  { accessorKey: 'nom', header: 'Nom', size: 160 },
  { accessorKey: 'fonction', header: 'Fonction', size: 140, cell: (info) => info.getValue() ?? '—' },
  { accessorKey: 'telephone', header: 'Téléphone', size: 120, cell: (info) => info.getValue() ?? '—' },
  { accessorKey: 'email', header: 'Email', size: 180, cell: (info) => info.getValue() ?? '—' },
  {
    accessorKey: 'contactPrincipal',
    header: 'Principal',
    size: 80,
    cell: (info) => (info.getValue() ? '✓' : '—'),
  },
]

const colonnesInteractions: ColumnDef<InteractionVue, unknown>[] = [
  { accessorKey: 'dateInteraction', header: 'Date', size: 100 },
  { accessorKey: 'typeInteraction', header: 'Type', size: 120 },
  { accessorKey: 'note', header: 'Note', size: 300, cell: (info) => info.getValue() ?? '—' },
]

const CHAMPS_CONTACT = [
  { id: 'nom', label: 'Nom', type: 'texte' as const, obligatoire: true },
  { id: 'fonction', label: 'Fonction', type: 'texte' as const },
  { id: 'telephone', label: 'Téléphone', type: 'texte' as const },
  { id: 'email', label: 'Email', type: 'email' as const },
]

const CHAMPS_INTERACTION = [
  { id: 'dateInteraction', label: 'Date', type: 'date' as const, obligatoire: true },
  {
    id: 'typeInteraction',
    label: 'Type',
    type: 'select' as const,
    obligatoire: true,
    options: [
      { valeur: 'APPEL', libelle: 'Appel' },
      { valeur: 'REUNION', libelle: 'Réunion' },
      { valeur: 'EMAIL', libelle: 'Email' },
      { valeur: 'VISITE', libelle: 'Visite' },
      { valeur: 'AUTRE', libelle: 'Autre' },
    ],
  },
  { id: 'note', label: 'Note', type: 'textarea' as const },
]

function champLigne(label: string, valeur: string | number | null) {
  return (
    <div className="champ-lecture">
      <dt>{label}</dt>
      <dd>{valeur ?? '—'}</dd>
    </div>
  )
}

export function FicheClient() {
  const { id } = useParams<{ id: string }>()
  const naviguer = useNavigate()
  const [client, setClient] = useState<ClientVue | null>(null)
  const [contacts, setContacts] = useState<ContactVue[]>([])
  const [interactions, setInteractions] = useState<InteractionVue[]>([])
  const [edition, setEdition] = useState(false)
  const [valeursEdit, setValeursEdit] = useState<Record<string, string | number>>({})
  const [ajoutContact, setAjoutContact] = useState(false)
  const [valeursContact, setValeursContact] = useState<Record<string, string | number>>({})
  const [ajoutInteraction, setAjoutInteraction] = useState(false)
  const [valeursInteraction, setValeursInteraction] = useState<Record<string, string | number>>({})
  const [score, setScore] = useState<{ score: string; motif: string } | null>(null)
  const [calculScore, setCalculScore] = useState(false)

  const clientId = Number(id)

  const chargerClient = () => {
    window.egto.clients.lire(clientId).then(setClient).catch(() => {})
  }

  const chargerContacts = () => {
    window.egto.clients.listerContacts(clientId).then(setContacts).catch(() => {})
  }

  const chargerInteractions = () => {
    window.egto.clients.listerInteractions(clientId).then(setInteractions).catch(() => {})
  }

  useEffect(() => {
    if (!clientId) return
    chargerClient()
    chargerContacts()
    chargerInteractions()
  }, [clientId])

  const demarrerEdition = () => {
    if (!client) return
    setValeursEdit({
      raisonSociale: client.raisonSociale,
      sigle: client.sigle ?? '',
      categorie: client.categorie,
      secteur: client.secteur ?? '',
      nif: client.nif ?? '',
      nis: client.nis ?? '',
      modeReglementPrefere: client.modeReglementPrefere ?? '',
    })
    setEdition(true)
  }

  const sauvegarderEdition = async () => {
    const ok = await window.egto.clients.modifier(clientId, {
      raisonSociale: String(valeursEdit.raisonSociale),
      sigle: String(valeursEdit.sigle) || null,
      categorie: String(valeursEdit.categorie) as 'PUBLIC' | 'PRIVE',
      secteur: (String(valeursEdit.secteur) || null) as 'BTP' | 'ENERGIE' | 'PORTUAIRE' | 'HYDRAULIQUE' | 'VRD' | 'AUTRE' | null,
      nif: String(valeursEdit.nif) || null,
      nis: String(valeursEdit.nis) || null,
      modeReglementPrefere: (String(valeursEdit.modeReglementPrefere) || null) as 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'TRAITE' | 'LCN' | null,
    })
    if (ok) {
      setEdition(false)
      chargerClient()
    }
  }

  const ajouterContact = async () => {
    await window.egto.clients.creerContact({
      clientId,
      nom: String(valeursContact.nom),
      fonction: String(valeursContact.fonction) || null,
      telephone: String(valeursContact.telephone) || null,
      email: String(valeursContact.email) || null,
    })
    setAjoutContact(false)
    setValeursContact({})
    chargerContacts()
  }

  const ajouterInteraction = async () => {
    await window.egto.clients.creerInteraction({
      clientId,
      dateInteraction: String(valeursInteraction.dateInteraction),
      typeInteraction: String(valeursInteraction.typeInteraction),
      note: String(valeursInteraction.note) || null,
    })
    setAjoutInteraction(false)
    setValeursInteraction({})
    chargerInteractions()
  }

  const calculerScore = async () => {
    setCalculScore(true)
    try {
      const resultat = await window.egto.clients.calculerScore(clientId)
      setScore(resultat)
    } catch {
      // Erreur silencieuse
    } finally {
      setCalculScore(false)
    }
  }

  if (!client) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  const ongletGeneral = edition ? (
    <Formulaire
      champs={[
        { id: 'raisonSociale', label: 'Raison sociale', type: 'texte', obligatoire: true },
        { id: 'sigle', label: 'Sigle', type: 'texte' },
        {
          id: 'categorie',
          label: 'Catégorie',
          type: 'select',
          obligatoire: true,
          options: [
            { valeur: 'PUBLIC', libelle: 'Public' },
            { valeur: 'PRIVE', libelle: 'Privé' },
          ],
        },
        {
          id: 'secteur',
          label: 'Secteur',
          type: 'select',
          options: [
            { valeur: 'BTP', libelle: 'BTP' },
            { valeur: 'ENERGIE', libelle: 'Énergie' },
            { valeur: 'PORTUAIRE', libelle: 'Portuaire' },
            { valeur: 'HYDRAULIQUE', libelle: 'Hydraulique' },
            { valeur: 'VRD', libelle: 'VRD' },
            { valeur: 'AUTRE', libelle: 'Autre' },
          ],
        },
        { id: 'nif', label: 'NIF', type: 'texte' },
        { id: 'nis', label: 'NIS', type: 'texte' },
        {
          id: 'modeReglementPrefere',
          label: 'Mode de règlement préféré',
          type: 'select',
          options: [
            { valeur: 'VIREMENT', libelle: 'Virement' },
            { valeur: 'CHEQUE', libelle: 'Chèque' },
            { valeur: 'ESPECES', libelle: 'Espèces' },
            { valeur: 'TRAITE', libelle: 'Traite' },
            { valeur: 'LCN', libelle: 'LCN' },
          ],
        },
      ]}
      valeurs={valeursEdit}
      onChange={(cle, val) => setValeursEdit((p) => ({ ...p, [cle]: val }))}
      soumettre={sauvegarderEdition}
      labelBouton="Enregistrer"
    />
  ) : (
    <div className="fiche-champs">
      {champLigne('Code client', client.codeClient)}
      {champLigne('Raison sociale', client.raisonSociale)}
      {champLigne('Sigle', client.sigle)}
      {champLigne('Type', client.typeClient)}
      {champLigne('Catégorie', client.categorie)}
      {champLigne('Secteur', client.secteur)}
      {champLigne('NIF', client.nif)}
      {champLigne('NIS', client.nis)}
      {champLigne('Règlement préféré', client.modeReglementPrefere)}
      {champLigne('Statut', client.statut)}
      <button className="bouton" onClick={demarrerEdition}>
        Modifier
      </button>
    </div>
  )

  const ongletContacts = (
    <div>
      <Liste<ContactVue>
        donnees={contacts}
        colonnes={colonnesContacts}
       
        etiquettesVide="Aucun contact."
        actions={
          <button className="bouton" onClick={() => setAjoutContact(true)}>
            Nouveau contact
          </button>
        }
      />
      {ajoutContact && (
        <div className="modal-superposition">
          <div className="modal-contenu">
            <h3>Nouveau contact</h3>
            <Formulaire
              champs={CHAMPS_CONTACT}
              valeurs={valeursContact}
              onChange={(cle, val) => setValeursContact((p) => ({ ...p, [cle]: val }))}
              soumettre={ajouterContact}
              labelBouton="Ajouter"
            />
            <button
              className="bouton-secondaire"
              style={{ marginTop: 8 }}
              onClick={() => {
                setAjoutContact(false)
                setValeursContact({})
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const ongletInteractions = (
    <div>
      <Liste<InteractionVue>
        donnees={interactions}
        colonnes={colonnesInteractions}
       
        etiquettesVide="Aucune interaction."
        actions={
          <button className="bouton" onClick={() => setAjoutInteraction(true)}>
            Nouvelle interaction
          </button>
        }
      />
      {ajoutInteraction && (
        <div className="modal-superposition">
          <div className="modal-contenu">
            <h3>Nouvelle interaction</h3>
            <Formulaire
              champs={CHAMPS_INTERACTION}
              valeurs={valeursInteraction}
              onChange={(cle, val) => setValeursInteraction((p) => ({ ...p, [cle]: val }))}
              soumettre={ajouterInteraction}
              labelBouton="Ajouter"
            />
            <button
              className="bouton-secondaire"
              style={{ marginTop: 8 }}
              onClick={() => {
                setAjoutInteraction(false)
                setValeursInteraction({})
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const ongletScore = (
    <div className="score-section">
      <div className="score-actions">
        <button className="bouton" onClick={calculerScore} disabled={calculScore}>
          {calculScore ? 'Calcul…' : 'Calculer le score'}
        </button>
      </div>
      {score && (
        <div className="score-resultat">
          <div className="score-chiffre">
            <span className={`badge-score badge-score-${score.score.toLowerCase()}`}>
              {score.score}
            </span>
          </div>
          <p className="score-motif">{score.motif}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="ecran-fiche">
      <div className="en-tete-ecran">
        <h1>{client.raisonSociale}</h1>
        <button className="bouton-secondaire" onClick={() => naviguer('/clients')}>
          ← Retour
        </button>
      </div>
      <FicheAOnglets
        onglets={[
          { id: 'general', label: 'Général', contenu: ongletGeneral },
          { id: 'contacts', label: 'Contacts', contenu: ongletContacts },
          { id: 'interactions', label: 'Interactions', contenu: ongletInteractions },
          { id: 'score', label: 'Score', contenu: ongletScore },
        ]}
      />
    </div>
  )
}
