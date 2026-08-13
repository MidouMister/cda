import { STATUTS_AFFAIRE, STATUTS_DEVIS, type StatutAffaire, type StatutDevis } from './entites-commerciales'
import { STATUTS_FACTURE, type StatutFacture } from './entites-facturation'

export type TableTransitions<Etat extends string, Action extends string> = Partial<
  Record<Etat, Partial<Record<Action, Etat>>>
>

export interface MachineEtats<Etat extends string, Action extends string> {
  readonly etats: readonly Etat[]
  readonly actions: readonly Action[]
  readonly transitions: TableTransitions<Etat, Action>
}

export function creerMachineEtats<Etat extends string, Action extends string>(
  etats: readonly Etat[],
  transitions: TableTransitions<Etat, Action>,
): MachineEtats<Etat, Action> {
  const ensembleEtats = new Set<Etat>(etats)
  const actionsDeclarees: Action[] = []
  const actionsDejaVues = new Set<Action>()

  for (const [etatSource, tableActions] of Object.entries(transitions) as [Etat, Partial<Record<Action, Etat>>][]) {
    if (!ensembleEtats.has(etatSource)) {
      throw new Error(`État source inconnu dans la machine : « ${etatSource} ».`)
    }
    for (const [action, etatCible] of Object.entries(tableActions) as [Action, Etat][]) {
      if (!ensembleEtats.has(etatCible)) {
        throw new Error(`Transition « ${etatSource} → ${etatCible} » par « ${action} » vers un état non déclaré.`)
      }
      if (!actionsDejaVues.has(action)) {
        actionsDejaVues.add(action)
        actionsDeclarees.push(action)
      }
    }
  }

  return { etats, actions: actionsDeclarees, transitions }
}

export function transiter<Etat extends string, Action extends string>(
  machine: MachineEtats<Etat, Action>,
  etatCourant: Etat,
  action: Action,
): Etat {
  if (!machine.etats.includes(etatCourant)) {
    throw new Error(`État inconnu : « ${etatCourant} ».`)
  }
  if (!machine.actions.includes(action)) {
    throw new Error(`Action inconnue : « ${action} ».`)
  }
  const etatCible = machine.transitions[etatCourant]?.[action]
  if (etatCible === undefined) {
    throw new Error(`Transition impossible : de ${etatCourant} par ${action}.`)
  }
  return etatCible
}

export type ActionFacture = 'VALIDER' | 'IMPRIMER' | 'ENVOYER' | 'ENCAISSER' | 'ARCHIVER'

export const machineEtatsFacture: MachineEtats<StatutFacture, ActionFacture> = creerMachineEtats<
  StatutFacture,
  ActionFacture
>(STATUTS_FACTURE, {
  // La validation attribue le numéro (règle fiscale) et verrouille la facture.
  BROUILLON: { VALIDER: 'VALIDE' },
  // L'impression matérialise le document.
  VALIDE: { IMPRIMER: 'IMPRIMEE' },
  // L'envoi au client.
  IMPRIMEE: { ENVOYER: 'ENVOYEE' },
  // L'encaissement règle la facture.
  ENVOYEE: { ENCAISSER: 'PAYEE' },
  // La facture payée est archivée.
  PAYEE: { ARCHIVER: 'ARCHIVEE' },
})

export type ActionAffaire = 'RECEVOIR_ODS' | 'DEMARRER' | 'FACTURER' | 'RESILIER' | 'SOLDER' | 'ARCHIVER'

export const machineEtatsAffaire: MachineEtats<StatutAffaire, ActionAffaire> = creerMachineEtats<
  StatutAffaire,
  ActionAffaire
>(STATUTS_AFFAIRE, {
  // Marché public : l'ordre de service de démarrage est reçu.
  SIGNE: { RECEVOIR_ODS: 'ODS_RECU', DEMARRER: 'EN_COURS' },
  // L'exécution démarre après l'ordre de service.
  ODS_RECU: { DEMARRER: 'EN_COURS' },
  // L'affaire en cours est facturée, ou résiliée (§4.1.12).
  EN_COURS: { FACTURER: 'FACTURE', RESILIER: 'RESILIE' },
  // Le solde clôture l'affaire facturée.
  FACTURE: { SOLDER: 'SOLDE' },
  // L'affaire soldée est archivée.
  SOLDE: { ARCHIVER: 'ARCHIVE' },
})

export type ActionDevis = 'ENVOYER' | 'ACCEPTER' | 'REFUSER' | 'EXPIRER'

export const machineEtatsDevis: MachineEtats<StatutDevis, ActionDevis> = creerMachineEtats<StatutDevis, ActionDevis>(
  STATUTS_DEVIS,
  {
    // L'envoi au client.
    BROUILLON: { ENVOYER: 'ENVOYE' },
    // L'acceptation prépare la conversion en affaire (§4.9.3).
    ENVOYE: { ACCEPTER: 'ACCEPTE', REFUSER: 'REFUSE', EXPIRER: 'EXPIRE' },
  },
)
