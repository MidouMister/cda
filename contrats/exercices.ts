export interface ExerciceVue {
  id: number
  annee: number
  dateDebut: string
  dateFin: string
  statut: 'OUVERT' | 'CLOTURE'
}
