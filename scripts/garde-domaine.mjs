import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dossierDomaine = join(racine, 'domaine')
const racineNormalisee = racine.replace(/\\/g, '/')

if (!existsSync(dossierDomaine)) {
  console.log('garde-domaine : dossier domaine/ introuvable, rien à vérifier.')
  process.exit(0)
}

const fichiers = []

const parcourir = (dossier) => {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) {
      parcourir(chemin)
    } else if (entree.endsWith('.ts')) {
      fichiers.push(chemin)
    }
  }
}

parcourir(dossierDomaine)

const motifs = [
  /(?:import|export)\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s*)?['"]([^'"]+)['"]/g,
  /(?:import|export)\s*\(\s*['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]/g,
]

let violation = false

const relatif = (chemin) => {
  const normalise = chemin.replace(/\\/g, '/')
  return normalise.replace(racineNormalisee, '.').replace(/^\//, '')
}

for (const fichier of fichiers) {
  const contenu = readFileSync(fichier, 'utf8')
  const sources = new Set()

  for (const motif of motifs) {
    let correspondance
    while ((correspondance = motif.exec(contenu)) !== null) {
      sources.add(correspondance[1])
    }
  }

  for (const source of sources) {
    if (!source.startsWith('.') && !source.startsWith('/')) {
      violation = true
      console.error(`garde-domaine : import externe interdit dans ${relatif(fichier)} → « ${source} »`)
    }
  }
}

if (violation) {
  console.error('garde-domaine : échec — domaine/ importe l’extérieur.')
  process.exit(1)
}

console.log('garde-domaine : aucun import externe dans domaine/ ✓')
