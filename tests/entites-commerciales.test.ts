import { describe, expect, it } from 'vitest'
import { NumeroDocument, Reference } from '../domaine/identites'
import {
  Affaire,
  Avenant,
  Devis,
  LigneDevis,
  PosteDqe,
  Reception,
  calculerMontantLigne,
} from '../domaine/entites-commerciales'

const referenceValide = () => Reference.depuisValeur('AFG-2026-00001')
const numeroDevisValide = () => NumeroDocument.depuisValeur('DEV-2026-00001')

describe('Affaire', () => {
  it('construit une affaire marché public complète', () => {
    const affaire = Affaire.depuisDonnees({
      id: 1,
      statut: 'EN_COURS',
      reference: referenceValide(),
      type_affaire: 'MARCHE_PUBLIC',
      client_id: 7,
      objet: 'Travaux de voirie — Oran',
      montant_initial_ht_centimes: 150000000,
      taux_tva_bps: 1900,
      date_signature: '2026-01-15',
      date_notification: '2026-02-01',
      numero_ods: 'ODS-2026-01',
      date_ods: '2026-03-01',
      date_demarrage_effectif: '2026-03-10',
      delai_execution_jours: 180,
      date_fin_contractuelle: '2026-08-27',
      date_fin_revisee: '2026-09-10',
      motif_depassement: 'AVENANT',
      rabais_global_bps: 500,
      responsable: 'K. Benali',
      numero_marche: '12/2026',
      service_contractant: 'DSP Oran',
      type_procedure: 'AO_OUVERT',
      avance_forfaitaire_bps: 1500,
      avance_approvisionnement_bps: 1000,
      retenue_garantie_bps: 500,
      delai_garantie_mois: 13,
      type_revision: 'REVISABLE',
      formule_revision: '{}',
      penalite_retard_taux_bps: 200,
      penalite_retard_base_centimes: 150000000,
      penalite_retard_plafond_bps: 1000,
      date_decompte_provisoire: '2026-12-01',
      date_decompte_definitif: '2027-06-01',
      numero_contrat: 'CT-2026-12',
      modalites_paiement: 'Virement à 60 jours',
      avance_contractuelle_centimes: 30000000,
      motif_resiliation: 'Abandon du chantier',
      date_resiliation: '2027-02-01',
      decompte_resiliation_centimes: 5000000,
      sort_cautions: 'RETENUE',
      sort_retenue_garantie: 'A_RESTITUER',
    })

    expect(affaire.id).toBe(1)
    expect(affaire.statut).toBe('EN_COURS')
    expect(affaire.reference.valeur).toBe('AFG-2026-00001')
    expect(affaire.type_affaire).toBe('MARCHE_PUBLIC')
    expect(affaire.client_id).toBe(7)
    expect(affaire.objet).toBe('Travaux de voirie — Oran')
    expect(affaire.montant_initial_ht_centimes).toBe(150000000)
    expect(affaire.taux_tva_bps).toBe(1900)
    expect(affaire.date_signature).toBe('2026-01-15')
    expect(affaire.date_notification).toBe('2026-02-01')
    expect(affaire.numero_ods).toBe('ODS-2026-01')
    expect(affaire.date_ods).toBe('2026-03-01')
    expect(affaire.date_demarrage_effectif).toBe('2026-03-10')
    expect(affaire.delai_execution_jours).toBe(180)
    expect(affaire.date_fin_contractuelle).toBe('2026-08-27')
    expect(affaire.date_fin_revisee).toBe('2026-09-10')
    expect(affaire.motif_depassement).toBe('AVENANT')
    expect(affaire.rabais_global_bps).toBe(500)
    expect(affaire.responsable).toBe('K. Benali')
    expect(affaire.numero_marche).toBe('12/2026')
    expect(affaire.service_contractant).toBe('DSP Oran')
    expect(affaire.type_procedure).toBe('AO_OUVERT')
    expect(affaire.avance_forfaitaire_bps).toBe(1500)
    expect(affaire.avance_approvisionnement_bps).toBe(1000)
    expect(affaire.retenue_garantie_bps).toBe(500)
    expect(affaire.delai_garantie_mois).toBe(13)
    expect(affaire.type_revision).toBe('REVISABLE')
    expect(affaire.formule_revision).toBe('{}')
    expect(affaire.penalite_retard_taux_bps).toBe(200)
    expect(affaire.penalite_retard_base_centimes).toBe(150000000)
    expect(affaire.penalite_retard_plafond_bps).toBe(1000)
    expect(affaire.date_decompte_provisoire).toBe('2026-12-01')
    expect(affaire.date_decompte_definitif).toBe('2027-06-01')
    expect(affaire.numero_contrat).toBe('CT-2026-12')
    expect(affaire.modalites_paiement).toBe('Virement à 60 jours')
    expect(affaire.avance_contractuelle_centimes).toBe(30000000)
    expect(affaire.motif_resiliation).toBe('Abandon du chantier')
    expect(affaire.date_resiliation).toBe('2027-02-01')
    expect(affaire.decompte_resiliation_centimes).toBe(5000000)
    expect(affaire.sort_cautions).toBe('RETENUE')
    expect(affaire.sort_retenue_garantie).toBe('A_RESTITUER')
    expect(affaire.affaire_mere_id).toBeNull()
  })

  it('applique les défauts du schéma', () => {
    const affaire = Affaire.depuisDonnees({
      id: 1,
      reference: referenceValide(),
      type_affaire: 'CONTRAT_PRIVE',
      client_id: 7,
    })
    expect(affaire.statut).toBe('SIGNE')
    expect(affaire.montant_initial_ht_centimes).toBe(0)
    expect(affaire.taux_tva_bps).toBe(1900)
    expect(affaire.rabais_global_bps).toBe(0)
    expect(affaire.retenue_garantie_bps).toBe(500)
    expect(affaire.affaire_mere_id).toBeNull()
    expect(affaire.objet).toBeNull()
    expect(affaire.motif_depassement).toBeNull()
    expect(affaire.type_procedure).toBeNull()
    expect(affaire.date_ods).toBeNull()
  })

  it('construit un avenant avec son affaire mère', () => {
    const affaire = Affaire.depuisDonnees({
      id: 2,
      reference: Reference.depuisValeur('AVT-2026-00001'),
      type_affaire: 'AVENANT',
      affaire_mere_id: 1,
      client_id: 7,
    })
    expect(affaire.type_affaire).toBe('AVENANT')
    expect(affaire.affaire_mere_id).toBe(1)
  })

  it('refuse un statut inconnu', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        statut: 'PERDU' as 'SIGNE',
      }),
    ).toThrow(Error)
  })

  it('refuse un type_affaire inconnu', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'VENTE' as 'BC',
        client_id: 7,
      }),
    ).toThrow(Error)
  })

  it('refuse un AVENANT sans affaire mère', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 2,
        reference: Reference.depuisValeur('AVT-2026-00001'),
        type_affaire: 'AVENANT',
        client_id: 7,
      }),
    ).toThrow(/affaire mère/)
  })

  it('refuse une référence passée en chaîne brute', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: 'AFG-2026-00001' as unknown as Reference,
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
      }),
    ).toThrow(TypeError)
  })

  it('refuse une référence au préfixe inconnu', () => {
    expect(() => Reference.depuisValeur('XYZ-2026-00001')).toThrow(Error)
  })

  it('refuse un montant initial négatif', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        montant_initial_ht_centimes: -1,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un montant initial flottant', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        montant_initial_ht_centimes: 100.5,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un taux de TVA flottant', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        taux_tva_bps: 1900.5,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un client_id non positif', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 0,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un motif de dépassement inconnu', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        motif_depassement: 'AUTRES' as 'AUTRE',
      }),
    ).toThrow(Error)
  })

  it('refuse un type de procédure inconnu', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'MARCHE_PUBLIC',
        client_id: 7,
        type_procedure: 'AO_SIMPLE' as 'AO_OUVERT',
      }),
    ).toThrow(Error)
  })

  it('refuse un type de révision inconnu', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'MARCHE_PUBLIC',
        client_id: 7,
        type_revision: 'LIBRE' as 'FERME',
      }),
    ).toThrow(Error)
  })

  it('refuse un sort de retenue de garantie inconnu', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        sort_retenue_garantie: 'CONSERVEE' as 'RETENUE',
      }),
    ).toThrow(Error)
  })

  it('refuse une date de signature invalide', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        date_signature: '15/01/2026',
      }),
    ).toThrow(Error)
  })

  it('refuse un délai d’exécution négatif', () => {
    expect(() =>
      Affaire.depuisDonnees({
        id: 1,
        reference: referenceValide(),
        type_affaire: 'CONTRAT_PRIVE',
        client_id: 7,
        delai_execution_jours: -5,
      }),
    ).toThrow(TypeError)
  })
})

describe('PosteDqe', () => {
  it('construit un poste valide et calcule le montant HT', () => {
    const poste = PosteDqe.depuisDonnees({
      id: 1,
      affaire_id: 1,
      numero: 1,
      designation: 'Fourniture et pose de bordure T2',
      unite: 'M3',
      quantite_milliemes: 12500,
      pu_ht_centimes: 15000,
      famille_id: 3,
      sous_famille_id: 9,
      classification: 'BLANC',
      origine: 'DEVIS',
      ligne_devis_id: 4,
    })
    expect(poste.id).toBe(1)
    expect(poste.affaire_id).toBe(1)
    expect(poste.numero).toBe(1)
    expect(poste.designation).toBe('Fourniture et pose de bordure T2')
    expect(poste.unite).toBe('M3')
    expect(poste.quantite_milliemes).toBe(12500)
    expect(poste.pu_ht_centimes).toBe(15000)
    expect(poste.montant_ht_centimes).toBe(187500)
    expect(poste.famille_id).toBe(3)
    expect(poste.sous_famille_id).toBe(9)
    expect(poste.classification).toBe('BLANC')
    expect(poste.origine).toBe('DEVIS')
    expect(poste.ligne_devis_id).toBe(4)
  })

  it('applique les défauts : quantité, PU, montant, origine MANUEL', () => {
    const poste = PosteDqe.depuisDonnees({
      id: 1,
      affaire_id: 1,
      numero: 1,
      designation: 'Poste minimal',
      unite: 'T',
    })
    expect(poste.quantite_milliemes).toBe(0)
    expect(poste.pu_ht_centimes).toBe(0)
    expect(poste.montant_ht_centimes).toBe(0)
    expect(poste.origine).toBe('MANUEL')
    expect(poste.classification).toBeNull()
    expect(poste.famille_id).toBeNull()
    expect(poste.ligne_devis_id).toBeNull()
  })

  it('calcule 12,5 t × 150 DA = 1 875,00 DA exactement', () => {
    const poste = PosteDqe.depuisDonnees({
      id: 1,
      affaire_id: 1,
      numero: 1,
      designation: 'Enrobé',
      unite: 'T',
      quantite_milliemes: 12500,
      pu_ht_centimes: 15000,
    })
    expect(poste.montant_ht_centimes).toBe(187500)
  })

  it('arrondit half-up au centime (333 × 1,5 = 499,5 → 500)', () => {
    const poste = PosteDqe.depuisDonnees({
      id: 1,
      affaire_id: 1,
      numero: 1,
      designation: 'Enrobé',
      unite: 'T',
      quantite_milliemes: 1500,
      pu_ht_centimes: 333,
    })
    expect(poste.montant_ht_centimes).toBe(500)
  })

  it('refuse une unité inconnue', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 1,
        designation: 'X',
        unite: 'KG' as 'T',
      }),
    ).toThrow(Error)
  })

  it('refuse une quantité négative', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 1,
        designation: 'X',
        unite: 'T',
        quantite_milliemes: -100,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un PU négatif', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 1,
        designation: 'X',
        unite: 'T',
        pu_ht_centimes: -5,
      }),
    ).toThrow(TypeError)
  })

  it('refuse une désignation vide', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 1,
        designation: '  ',
        unite: 'T',
      }),
    ).toThrow(TypeError)
  })

  it('refuse une classification inconnue', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 1,
        designation: 'X',
        unite: 'T',
        classification: 'VERT' as 'AUTRE',
      }),
    ).toThrow(Error)
  })

  it('refuse une origine inconnue', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 1,
        designation: 'X',
        unite: 'T',
        origine: 'XLS' as 'MANUEL',
      }),
    ).toThrow(Error)
  })

  it('refuse un numéro de poste non positif', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 1,
        numero: 0,
        designation: 'X',
        unite: 'T',
      }),
    ).toThrow(TypeError)
  })

  it('refuse un identifiant affaire non positif', () => {
    expect(() =>
      PosteDqe.depuisDonnees({
        id: 1,
        affaire_id: 0,
        numero: 1,
        designation: 'X',
        unite: 'T',
      }),
    ).toThrow(TypeError)
  })
})

describe('calculerMontantLigne', () => {
  it('calcule un produit exact', () => {
    expect(calculerMontantLigne(15000, 12500)).toBe(187500)
  })

  it('arrondit half-up au centime', () => {
    expect(calculerMontantLigne(1, 500)).toBe(1)
    expect(calculerMontantLigne(1, 250)).toBe(0)
    expect(calculerMontantLigne(1, 750)).toBe(1)
  })

  it('refuse une quantité flottante', () => {
    expect(() => calculerMontantLigne(100, 12.5)).toThrow(TypeError)
  })
})

describe('Devis', () => {
  it('construit un devis complet valide', () => {
    const devis = Devis.depuisDonnees({
      id: 1,
      statut: 'ENVOYE',
      numero_devis: numeroDevisValide(),
      client_id: 7,
      date_devis: '2026-07-01',
      date_validite: '2026-08-01',
      rabais_global_bps: 300,
      affaire_id: 5,
      exercice_id: 2,
    })
    expect(devis.id).toBe(1)
    expect(devis.statut).toBe('ENVOYE')
    expect(devis.numero_devis.valeur).toBe('DEV-2026-00001')
    expect(devis.client_id).toBe(7)
    expect(devis.date_devis).toBe('2026-07-01')
    expect(devis.date_validite).toBe('2026-08-01')
    expect(devis.rabais_global_bps).toBe(300)
    expect(devis.affaire_id).toBe(5)
    expect(devis.exercice_id).toBe(2)
  })

  it('applique les défauts du schéma', () => {
    const devis = Devis.depuisDonnees({
      id: 1,
      numero_devis: numeroDevisValide(),
      client_id: 7,
      date_devis: '2026-07-01',
    })
    expect(devis.statut).toBe('BROUILLON')
    expect(devis.rabais_global_bps).toBe(0)
    expect(devis.date_validite).toBeNull()
    expect(devis.affaire_id).toBeNull()
    expect(devis.exercice_id).toBeNull()
  })

  it('refuse un numéro de devis passé en chaîne brute', () => {
    expect(() =>
      Devis.depuisDonnees({
        id: 1,
        numero_devis: 'DEV-2026-00001' as unknown as NumeroDocument,
        client_id: 7,
        date_devis: '2026-07-01',
      }),
    ).toThrow(TypeError)
  })

  it('refuse un numéro de devis au format invalide', () => {
    expect(() => NumeroDocument.depuisValeur('DEV-2026')).toThrow(Error)
  })

  it('refuse un statut inconnu', () => {
    expect(() =>
      Devis.depuisDonnees({
        id: 1,
        numero_devis: numeroDevisValide(),
        client_id: 7,
        date_devis: '2026-07-01',
        statut: 'PERDU' as 'BROUILLON',
      }),
    ).toThrow(Error)
  })

  it('refuse une date de devis invalide', () => {
    expect(() =>
      Devis.depuisDonnees({
        id: 1,
        numero_devis: numeroDevisValide(),
        client_id: 7,
        date_devis: '01/07/2026',
      }),
    ).toThrow(Error)
  })

  it('refuse un rabais global négatif', () => {
    expect(() =>
      Devis.depuisDonnees({
        id: 1,
        numero_devis: numeroDevisValide(),
        client_id: 7,
        date_devis: '2026-07-01',
        rabais_global_bps: -10,
      }),
    ).toThrow(TypeError)
  })
})

describe('LigneDevis', () => {
  it('construit une ligne valide et calcule le montant HT', () => {
    const ligne = LigneDevis.depuisDonnees({
      id: 1,
      devis_id: 1,
      produit_id: 3,
      designation: 'Gravier bitumé',
      unite: 'T',
      quantite_milliemes: 12500,
      pu_ht_centimes: 15000,
      famille_id: 1,
      sous_famille_id: 4,
    })
    expect(ligne.devis_id).toBe(1)
    expect(ligne.produit_id).toBe(3)
    expect(ligne.designation).toBe('Gravier bitumé')
    expect(ligne.unite).toBe('T')
    expect(ligne.montant_ht_centimes).toBe(187500)
    expect(ligne.famille_id).toBe(1)
    expect(ligne.sous_famille_id).toBe(4)
  })

  it('arrondit half-up au centime', () => {
    const ligne = LigneDevis.depuisDonnees({
      id: 1,
      devis_id: 1,
      designation: 'X',
      unite: 'T',
      quantite_milliemes: 1500,
      pu_ht_centimes: 333,
    })
    expect(ligne.montant_ht_centimes).toBe(500)
  })

  it('refuse une désignation vide', () => {
    expect(() =>
      LigneDevis.depuisDonnees({
        id: 1,
        devis_id: 1,
        designation: '',
        unite: 'T',
      }),
    ).toThrow(TypeError)
  })

  it('refuse une quantité flottante', () => {
    expect(() =>
      LigneDevis.depuisDonnees({
        id: 1,
        devis_id: 1,
        designation: 'X',
        unite: 'T',
        quantite_milliemes: 10.5,
      }),
    ).toThrow(TypeError)
  })
})

describe('Avenant', () => {
  it('construit un avenant valide', () => {
    const avenant = Avenant.depuisDonnees({
      id: 1,
      statut: 'VALIDE',
      numero: 'AVT-2026-00002',
      affaire_id: 1,
      objet: 'Prolongation du délai',
      date_avenant: '2026-09-15',
      impact_delai_jours: 30,
      impact_montant_ht_centimes: 2500000,
    })
    expect(avenant.id).toBe(1)
    expect(avenant.statut).toBe('VALIDE')
    expect(avenant.numero).toBe('AVT-2026-00002')
    expect(avenant.affaire_id).toBe(1)
    expect(avenant.objet).toBe('Prolongation du délai')
    expect(avenant.date_avenant).toBe('2026-09-15')
    expect(avenant.impact_delai_jours).toBe(30)
    expect(avenant.impact_montant_ht_centimes).toBe(2500000)
  })

  it('applique les défauts : statut BROUILLON et impacts nuls', () => {
    const avenant = Avenant.depuisDonnees({
      id: 1,
      numero: 'AVT-2026-00001',
      affaire_id: 1,
    })
    expect(avenant.statut).toBe('BROUILLON')
    expect(avenant.impact_delai_jours).toBe(0)
    expect(avenant.impact_montant_ht_centimes).toBe(0)
    expect(avenant.objet).toBeNull()
    expect(avenant.date_avenant).toBeNull()
  })

  it('accepte un impact négatif (moins-value)', () => {
    const avenant = Avenant.depuisDonnees({
      id: 1,
      numero: 'AVT-2026-00003',
      affaire_id: 1,
      impact_montant_ht_centimes: -500000,
      impact_delai_jours: -10,
    })
    expect(avenant.impact_montant_ht_centimes).toBe(-500000)
    expect(avenant.impact_delai_jours).toBe(-10)
  })

  it('refuse un numéro vide', () => {
    expect(() =>
      Avenant.depuisDonnees({
        id: 1,
        numero: '  ',
        affaire_id: 1,
      }),
    ).toThrow(TypeError)
  })

  it('refuse un statut inconnu', () => {
    expect(() =>
      Avenant.depuisDonnees({
        id: 1,
        numero: 'AVT-2026-00001',
        affaire_id: 1,
        statut: 'CLOTURE' as 'BROUILLON',
      }),
    ).toThrow(Error)
  })

  it('refuse une date d’avenant invalide', () => {
    expect(() =>
      Avenant.depuisDonnees({
        id: 1,
        numero: 'AVT-2026-00001',
        affaire_id: 1,
        date_avenant: '15/09/2026',
      }),
    ).toThrow(Error)
  })

  it('refuse un impact flottant', () => {
    expect(() =>
      Avenant.depuisDonnees({
        id: 1,
        numero: 'AVT-2026-00001',
        affaire_id: 1,
        impact_delai_jours: 2.5,
      }),
    ).toThrow(TypeError)
  })
})

describe('Reception', () => {
  it('construit une réception valide, lot « Global » par défaut', () => {
    const reception = Reception.depuisDonnees({
      id: 1,
      affaire_id: 1,
      type_reception: 'PROVISOIRE',
      date_reception: '2026-12-01',
      numero_pv: 'PV-2026-001',
      montant_concerne_centimes: 10000000,
    })
    expect(reception.id).toBe(1)
    expect(reception.affaire_id).toBe(1)
    expect(reception.lot_tranche).toBe('Global')
    expect(reception.type_reception).toBe('PROVISOIRE')
    expect(reception.date_reception).toBe('2026-12-01')
    expect(reception.numero_pv).toBe('PV-2026-001')
    expect(reception.montant_concerne_centimes).toBe(10000000)
  })

  it('construit une réception définitive par lot', () => {
    const reception = Reception.depuisDonnees({
      id: 2,
      affaire_id: 1,
      lot_tranche: 'Tranche 2',
      type_reception: 'DEFINITIVE',
      date_reception: '2027-06-15',
    })
    expect(reception.lot_tranche).toBe('Tranche 2')
    expect(reception.type_reception).toBe('DEFINITIVE')
    expect(reception.numero_pv).toBeNull()
    expect(reception.montant_concerne_centimes).toBeNull()
  })

  it('refuse un type de réception inconnu', () => {
    expect(() =>
      Reception.depuisDonnees({
        id: 1,
        affaire_id: 1,
        type_reception: 'PARTIELLE' as 'PROVISOIRE',
        date_reception: '2026-12-01',
      }),
    ).toThrow(Error)
  })

  it('refuse une date de réception invalide', () => {
    expect(() =>
      Reception.depuisDonnees({
        id: 1,
        affaire_id: 1,
        type_reception: 'PROVISOIRE',
        date_reception: '01/12/2026',
      }),
    ).toThrow(Error)
  })

  it('refuse un montant concerné négatif', () => {
    expect(() =>
      Reception.depuisDonnees({
        id: 1,
        affaire_id: 1,
        type_reception: 'PROVISOIRE',
        date_reception: '2026-12-01',
        montant_concerne_centimes: -100,
      }),
    ).toThrow(TypeError)
  })
})
