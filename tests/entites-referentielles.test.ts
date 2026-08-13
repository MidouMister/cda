import { describe, expect, it } from 'vitest'
import { Nif, Nis } from '../domaine/identites'
import {
  Client,
  Contact,
  Famille,
  Interaction,
  Produit,
  SousFamille,
  Tarif,
} from '../domaine/entites-referentielles'

const nifValide = () => Nif.depuisValeur('099916012345678')
const nisValide = () => Nis.depuisValeur('09991601234')

describe('Client', () => {
  it('construit un client complet valide avec tous les champs optionnels', () => {
    const client = Client.depuisDonnees({
      id: 1,
      statut: 'EN_VIGILANCE',
      code_client: 'CLI-2026-00001',
      type_client: 'SARL',
      raison_sociale: 'BTP Méditerranée',
      sigle: 'BTPM',
      categorie: 'PRIVE',
      secteur: 'BTP',
      client_groupe: 1,
      nom_groupe: 'Groupe GITRA',
      responsable_commercial: 'K. Benali',
      contentieux_declare: 1,
      adresse: 'Zone industrielle, Oran',
      wilaya: '31',
      commune: 'Bir El Djir',
      tel_fixe: '041 33 00 00',
      tel_mobile: '0550 00 00 00',
      fax: '041 33 00 01',
      email: 'contact@btpm.dz',
      adresse_chantier: 'Route d’Arzew',
      nif: nifValide(),
      nis: nisValide(),
      rc: 'RC 31/00-000',
      ai: 'AI 31 00 000',
      rib: '001 002 003 004 005',
      banque: 'BNA Oran',
      agence: 'Agence Centrale',
      mode_reglement_prefere: 'VIREMENT',
      delai_paiement_jours: 60,
      plafond_credit_centimes: 15000000,
      score_client: 'B',
      derniere_evaluation_score_le: '2026-07-01',
    })

    expect(client.id).toBe(1)
    expect(client.statut).toBe('EN_VIGILANCE')
    expect(client.code_client).toBe('CLI-2026-00001')
    expect(client.type_client).toBe('SARL')
    expect(client.raison_sociale).toBe('BTP Méditerranée')
    expect(client.sigle).toBe('BTPM')
    expect(client.categorie).toBe('PRIVE')
    expect(client.secteur).toBe('BTP')
    expect(client.client_groupe).toBe(1)
    expect(client.nom_groupe).toBe('Groupe GITRA')
    expect(client.responsable_commercial).toBe('K. Benali')
    expect(client.contentieux_declare).toBe(1)
    expect(client.adresse).toBe('Zone industrielle, Oran')
    expect(client.wilaya).toBe('31')
    expect(client.commune).toBe('Bir El Djir')
    expect(client.tel_fixe).toBe('041 33 00 00')
    expect(client.tel_mobile).toBe('0550 00 00 00')
    expect(client.fax).toBe('041 33 00 01')
    expect(client.email).toBe('contact@btpm.dz')
    expect(client.adresse_chantier).toBe('Route d’Arzew')
    expect(client.nif?.valeur).toBe('099916012345678')
    expect(client.nis?.valeur).toBe('09991601234')
    expect(client.rc).toBe('RC 31/00-000')
    expect(client.ai).toBe('AI 31 00 000')
    expect(client.rib).toBe('001 002 003 004 005')
    expect(client.banque).toBe('BNA Oran')
    expect(client.agence).toBe('Agence Centrale')
    expect(client.mode_reglement_prefere).toBe('VIREMENT')
    expect(client.delai_paiement_jours).toBe(60)
    expect(client.plafond_credit_centimes).toBe(15000000)
    expect(client.score_client).toBe('B')
    expect(client.derniere_evaluation_score_le).toBe('2026-07-01')
  })

  it('applique les défauts du schéma', () => {
    const client = Client.depuisDonnees({
      id: 1,
      code_client: 'CLI-2026-00001',
      type_client: 'SARL',
      raison_sociale: 'BTP Méditerranée',
      categorie: 'PRIVE',
      nif: nifValide(),
    })

    expect(client.statut).toBe('PROSPECT')
    expect(client.client_groupe).toBe(0)
    expect(client.contentieux_declare).toBe(0)
    expect(client.secteur).toBeNull()
    expect(client.nom_groupe).toBeNull()
    expect(client.mode_reglement_prefere).toBeNull()
    expect(client.score_client).toBeNull()
  })

  it('accepte un particulier sans NIF', () => {
    const client = Client.depuisDonnees({
      id: 2,
      code_client: 'CLI-2026-00002',
      type_client: 'PARTICULIER',
      raison_sociale: 'Ahmed Ben Ali',
      categorie: 'PRIVE',
    })
    expect(client.nif).toBeNull()
  })

  it('refuse un statut inconnu', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
        statut: 'SUPPRIME' as 'PROSPECT',
      }),
    ).toThrow(Error)
  })

  it('refuse un type_client inconnu', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SA' as 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
      }),
    ).toThrow(Error)
  })

  it('refuse une catégorie inconnue', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'MIXTE' as 'PRIVE',
        nif: nifValide(),
      }),
    ).toThrow(Error)
  })

  it('refuse un secteur inconnu', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        secteur: 'TEXTILE' as 'BTP',
        nif: nifValide(),
      }),
    ).toThrow(Error)
  })

  it('refuse un code_client vide', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: '',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
      }),
    ).toThrow(TypeError)
  })

  it('refuse une raison_sociale vide', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: '   ',
        categorie: 'PRIVE',
        nif: nifValide(),
      }),
    ).toThrow(TypeError)
  })

  it('refuse un client de groupe sans nom_groupe', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'EPE_SPA',
        raison_sociale: 'Filiale GITRA',
        categorie: 'PRIVE',
        client_groupe: 1,
        nif: nifValide(),
      }),
    ).toThrow(Error)
  })

  it('refuse un client de groupe avec nom_groupe vide', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'EPE_SPA',
        raison_sociale: 'Filiale GITRA',
        categorie: 'PRIVE',
        client_groupe: 1,
        nom_groupe: '  ',
        nif: nifValide(),
      }),
    ).toThrow(Error)
  })

  it('refuse un NIF manquant pour un client hors particulier', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
      }),
    ).toThrow(/NIF/)
  })

  it('refuse un NIF passé en chaîne brute', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: '099916012345678' as unknown as Nif,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un NIS passé en chaîne brute', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
        nis: '09991601234' as unknown as Nis,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un mode de règlement préféré inconnu', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
        mode_reglement_prefere: 'PAYPAL' as 'VIREMENT',
      }),
    ).toThrow(Error)
  })

  it('refuse un score client inconnu', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
        score_client: 'E' as 'A',
      }),
    ).toThrow(Error)
  })

  it('refuse un délai de paiement négatif ou flottant', () => {
    const base = {
      id: 1,
      code_client: 'CLI-2026-00001',
      type_client: 'SARL',
      raison_sociale: 'BTP Méditerranée',
      categorie: 'PRIVE',
      nif: nifValide(),
    } as const
    expect(() => Client.depuisDonnees({ ...base, delai_paiement_jours: -5 })).toThrow(TypeError)
    expect(() => Client.depuisDonnees({ ...base, delai_paiement_jours: 30.5 })).toThrow(TypeError)
  })

  it('refuse un plafond de crédit négatif ou flottant', () => {
    const base = {
      id: 1,
      code_client: 'CLI-2026-00001',
      type_client: 'SARL',
      raison_sociale: 'BTP Méditerranée',
      categorie: 'PRIVE',
      nif: nifValide(),
    } as const
    expect(() => Client.depuisDonnees({ ...base, plafond_credit_centimes: -100 })).toThrow(TypeError)
    expect(() => Client.depuisDonnees({ ...base, plafond_credit_centimes: 100.5 })).toThrow(TypeError)
  })

  it('refuse une date de dernière évaluation du score invalide', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 1,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
        derniere_evaluation_score_le: '01/07/2026',
      }),
    ).toThrow(Error)
  })

  it('refuse un identifiant non positif', () => {
    expect(() =>
      Client.depuisDonnees({
        id: 0,
        code_client: 'CLI-2026-00001',
        type_client: 'SARL',
        raison_sociale: 'BTP Méditerranée',
        categorie: 'PRIVE',
        nif: nifValide(),
      }),
    ).toThrow(TypeError)
  })
})

describe('Contact', () => {
  it('construit un contact valide, contact_principal par défaut à 0', () => {
    const contact = Contact.depuisDonnees({ id: 1, client_id: 1, nom: 'Karim Benali' })
    expect(contact.id).toBe(1)
    expect(contact.client_id).toBe(1)
    expect(contact.nom).toBe('Karim Benali')
    expect(contact.fonction).toBeNull()
    expect(contact.contact_principal).toBe(0)
  })

  it('construit un contact principal avec tous les champs optionnels', () => {
    const contact = Contact.depuisDonnees({
      id: 2,
      client_id: 1,
      nom: 'Nadia Cherif',
      fonction: 'Acheteuse',
      telephone: '0550 11 22 33',
      email: 'n.cherif@btpm.dz',
      contact_principal: 1,
    })
    expect(contact.fonction).toBe('Acheteuse')
    expect(contact.telephone).toBe('0550 11 22 33')
    expect(contact.email).toBe('n.cherif@btpm.dz')
    expect(contact.contact_principal).toBe(1)
  })

  it('refuse un nom vide', () => {
    expect(() => Contact.depuisDonnees({ id: 1, client_id: 1, nom: '' })).toThrow(TypeError)
  })

  it('refuse un contact_principal différent de 0 ou 1', () => {
    expect(() => Contact.depuisDonnees({ id: 1, client_id: 1, nom: 'X', contact_principal: 2 as 0 | 1 })).toThrow(Error)
  })

  it('refuse un identifiant client non positif', () => {
    expect(() => Contact.depuisDonnees({ id: 1, client_id: 0, nom: 'X' })).toThrow(TypeError)
  })
})

describe('Interaction', () => {
  it('construit une interaction valide', () => {
    const interaction = Interaction.depuisDonnees({
      id: 1,
      client_id: 1,
      date_interaction: '2026-08-01',
      type_interaction: 'RELANCE',
      note: 'Relance n°2',
    })
    expect(interaction.date_interaction).toBe('2026-08-01')
    expect(interaction.type_interaction).toBe('RELANCE')
    expect(interaction.note).toBe('Relance n°2')
  })

  it('accepte une note absente', () => {
    const interaction = Interaction.depuisDonnees({
      id: 1,
      client_id: 1,
      date_interaction: '2026-08-01',
      type_interaction: 'APPEL',
    })
    expect(interaction.note).toBeNull()
  })

  it('refuse un type_interaction inconnu', () => {
    expect(() =>
      Interaction.depuisDonnees({
        id: 1,
        client_id: 1,
        date_interaction: '2026-08-01',
        type_interaction: 'EMAIL' as 'APPEL',
      }),
    ).toThrow(Error)
  })

  it('refuse une date d’interaction invalide', () => {
    expect(() =>
      Interaction.depuisDonnees({
        id: 1,
        client_id: 1,
        date_interaction: '01/08/2026',
        type_interaction: 'VISITE',
      }),
    ).toThrow(Error)
  })
})

describe('Produit', () => {
  it('construit un produit valide avec les défauts du schéma', () => {
    const produit = Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton bitumineux', famille_id: 3 })
    expect(produit.unite).toBe('U')
    expect(produit.pu_reference_centimes).toBe(0)
    expect(produit.type_tarification).toBe('FIXE')
    expect(produit.actif).toBe(1)
    expect(produit.sous_famille_id).toBeNull()
  })

  it('construit un produit complet', () => {
    const produit = Produit.depuisDonnees({
      id: 1,
      code_produit: 'GB-02',
      libelle: 'Gravier bitumé',
      famille_id: 1,
      sous_famille_id: 4,
      unite: 'T',
      pu_reference_centimes: 850000,
      type_tarification: 'PAR_CLIENT',
      actif: 0,
    })
    expect(produit.sous_famille_id).toBe(4)
    expect(produit.unite).toBe('T')
    expect(produit.pu_reference_centimes).toBe(850000)
    expect(produit.type_tarification).toBe('PAR_CLIENT')
    expect(produit.actif).toBe(0)
  })

  it('refuse un PU de référence négatif', () => {
    expect(() =>
      Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton', famille_id: 3, pu_reference_centimes: -1 }),
    ).toThrow(TypeError)
  })

  it('refuse un PU de référence flottant', () => {
    expect(() =>
      Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton', famille_id: 3, pu_reference_centimes: 10.5 }),
    ).toThrow(TypeError)
  })

  it('refuse une unité inconnue', () => {
    expect(() =>
      Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton', famille_id: 3, unite: 'KG' as 'T' }),
    ).toThrow(Error)
  })

  it('refuse un type de tarification inconnu', () => {
    expect(() =>
      Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton', famille_id: 3, type_tarification: 'LIBRE' as 'FIXE' }),
    ).toThrow(Error)
  })

  it('refuse un actif différent de 0 ou 1', () => {
    expect(() =>
      Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton', famille_id: 3, actif: 2 as 0 | 1 }),
    ).toThrow(Error)
  })

  it('refuse un identifiant sous-famille non positif', () => {
    expect(() =>
      Produit.depuisDonnees({ id: 1, code_produit: 'BB-01', libelle: 'Béton', famille_id: 3, sous_famille_id: -1 }),
    ).toThrow(TypeError)
  })
})

describe('Tarif', () => {
  it('construit un tarif CATALOGUE sans client ni affaire', () => {
    const tarif = Tarif.depuisDonnees({
      id: 1,
      produit_id: 1,
      type_niveau: 'CATALOGUE',
      prix_centimes: 850000,
      debut_periode: '2026-01-01',
      fin_periode: '2026-12-31',
    })
    expect(tarif.type_niveau).toBe('CATALOGUE')
    expect(tarif.client_id).toBeNull()
    expect(tarif.affaire_id).toBeNull()
    expect(tarif.prix_centimes).toBe(850000)
    expect(tarif.debut_periode).toBe('2026-01-01')
    expect(tarif.fin_periode).toBe('2026-12-31')
  })

  it('construit un tarif CLIENT avec client', () => {
    const tarif = Tarif.depuisDonnees({
      id: 2,
      produit_id: 1,
      type_niveau: 'CLIENT',
      client_id: 7,
      prix_centimes: 800000,
      debut_periode: '2026-03-01',
    })
    expect(tarif.client_id).toBe(7)
    expect(tarif.affaire_id).toBeNull()
    expect(tarif.fin_periode).toBeNull()
  })

  it('construit un tarif AFFAIRE avec affaire', () => {
    const tarif = Tarif.depuisDonnees({
      id: 3,
      produit_id: 1,
      type_niveau: 'AFFAIRE',
      affaire_id: 42,
      prix_centimes: 780000,
      debut_periode: '2026-05-15',
    })
    expect(tarif.affaire_id).toBe(42)
    expect(tarif.client_id).toBeNull()
  })

  it('accepte une fin de période égale au début', () => {
    const tarif = Tarif.depuisDonnees({
      id: 1,
      produit_id: 1,
      type_niveau: 'CATALOGUE',
      prix_centimes: 100,
      debut_periode: '2026-01-01',
      fin_periode: '2026-01-01',
    })
    expect(tarif.fin_periode).toBe('2026-01-01')
  })

  it('refuse une fin de période antérieure au début', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CATALOGUE',
        prix_centimes: 100,
        debut_periode: '2026-06-01',
        fin_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un tarif CATALOGUE avec un client', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CATALOGUE',
        client_id: 7,
        prix_centimes: 100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un tarif CATALOGUE avec une affaire', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CATALOGUE',
        affaire_id: 42,
        prix_centimes: 100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un tarif CLIENT sans client', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CLIENT',
        prix_centimes: 100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un tarif CLIENT avec une affaire', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CLIENT',
        client_id: 7,
        affaire_id: 42,
        prix_centimes: 100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un tarif AFFAIRE sans affaire', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'AFFAIRE',
        prix_centimes: 100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un tarif AFFAIRE avec un client', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'AFFAIRE',
        affaire_id: 42,
        client_id: 7,
        prix_centimes: 100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(Error)
  })

  it('refuse un prix négatif', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CATALOGUE',
        prix_centimes: -100,
        debut_periode: '2026-01-01',
      }),
    ).toThrow(TypeError)
  })

  it('refuse une date de période invalide', () => {
    expect(() =>
      Tarif.depuisDonnees({
        id: 1,
        produit_id: 1,
        type_niveau: 'CATALOGUE',
        prix_centimes: 100,
        debut_periode: '01/01/2026',
      }),
    ).toThrow(Error)
  })
})

describe('Famille', () => {
  it('construit une famille valide, statut par défaut ACTIF', () => {
    const famille = Famille.depuisDonnees({ id: 1, code: 'VTE', libelle: 'VENTES' })
    expect(famille.code).toBe('VTE')
    expect(famille.libelle).toBe('VENTES')
    expect(famille.statut).toBe('ACTIF')
  })

  it('accepte les quatre codes du schéma', () => {
    expect(Famille.depuisDonnees({ id: 1, code: 'LOC', libelle: 'LOCATIONS' }).code).toBe('LOC')
    expect(Famille.depuisDonnees({ id: 2, code: 'REA', libelle: 'RÉALISATIONS' }).code).toBe('REA')
    expect(Famille.depuisDonnees({ id: 3, code: 'ST', libelle: 'SOUS-TRAITANCE' }).code).toBe('ST')
  })

  it('refuse un code famille inconnu', () => {
    expect(() => Famille.depuisDonnees({ id: 1, code: 'SVC' as 'VTE', libelle: 'Services' })).toThrow(Error)
  })

  it('refuse un statut famille inconnu', () => {
    expect(() => Famille.depuisDonnees({ id: 1, code: 'VTE', libelle: 'VENTES', statut: 'SUSPENDU' as 'ACTIF' })).toThrow(Error)
  })
})

describe('SousFamille', () => {
  it('construit une sous-famille valide', () => {
    const sousFamille = SousFamille.depuisDonnees({ id: 1, famille_id: 1, code: 'BB', libelle: 'Béton bitumineux' })
    expect(sousFamille.famille_id).toBe(1)
    expect(sousFamille.code).toBe('BB')
    expect(sousFamille.libelle).toBe('Béton bitumineux')
  })

  it('refuse un identifiant famille non positif', () => {
    expect(() => SousFamille.depuisDonnees({ id: 1, famille_id: 0, code: 'BB', libelle: 'Béton bitumineux' })).toThrow(TypeError)
  })

  it('refuse un code vide', () => {
    expect(() => SousFamille.depuisDonnees({ id: 1, famille_id: 1, code: '', libelle: 'Béton' })).toThrow(TypeError)
  })
})
