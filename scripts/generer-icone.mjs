import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dossierSortie = join(racine, 'assets')
const cheminIco = join(dossierSortie, 'icon.ico')

if (!existsSync(dossierSortie)) {
  mkdirSync(dossierSortie, { recursive: true })
}

const TAILLES = [16, 32, 48, 256]
const COULEUR_FOND = [0x00, 0x71, 0xE3, 0xFF]
const COULEUR_LETTRE = [0xFF, 0xFF, 0xFF, 0xFF]
const COULEUR_ACCENT = [0xFF, 0x8C, 0x00, 0xFF]
const COULEUR_BORD = [0x00, 0x55, 0xB0, 0xFF]

function pixelCercle(cx, cy, rx, ry, x, y) {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1.0
}

function dessinerCarreArrondi(pixels, taille) {
  const rayon = Math.max(1, Math.round(taille * 0.22))
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      let dansLeCadre = true
      if (x < rayon && y < rayon) {
        dansLeCadre = pixelCercle(rayon, rayon, rayon, rayon, x, y)
      } else if (x >= taille - rayon && y < rayon) {
        dansLeCadre = pixelCercle(taille - 1 - rayon, rayon, rayon, rayon, x, y)
      } else if (x < rayon && y >= taille - rayon) {
        dansLeCadre = pixelCercle(rayon, taille - 1 - rayon, rayon, rayon, x, y)
      } else if (x >= taille - rayon && y >= taille - rayon) {
        dansLeCadre = pixelCercle(taille - 1 - rayon, taille - 1 - rayon, rayon, rayon, x, y)
      }
      if (!dansLeCadre) {
        const i = (y * taille + x) * 4
        pixels[i] = 0
        pixels[i + 1] = 0
        pixels[i + 2] = 0
        pixels[i + 3] = 0
      }
    }
  }
}

function dessinerBordure(pixels, taille) {
  const rayon = Math.max(1, Math.round(taille * 0.22))
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      const i = (y * taille + x) * 4
      if (pixels[i + 3] === 0) continue
      const estBordHaut = y === 1 || (y === 0 && x >= rayon && x < taille - rayon)
      const estBordBas = y === taille - 2 || (y === taille - 1 && x >= rayon && x < taille - rayon)
      const estBordGauche = x === 1 || (x === 0 && y >= rayon && y < taille - rayon)
      const estBordDroit = x === taille - 2 || (x === taille - 1 && y >= rayon && y < taille - rayon)
      if (estBordHaut || estBordBas || estBordGauche || estBordDroit) {
        pixels[i] = COULEUR_BORD[0]
        pixels[i + 1] = COULEUR_BORD[1]
        pixels[i + 2] = COULEUR_BORD[2]
        pixels[i + 3] = COULEUR_BORD[3]
      }
    }
  }
}

function dessinerBatiment(pixels, taille) {
  const e = Math.max(1, Math.round(taille / 16))

  const yBase = Math.round(taille * 0.78)
  const xDebut = Math.round(taille * 0.18)
  const xFin = Math.round(taille * 0.82)
  const epaisseurBase = Math.max(1, Math.round(taille * 0.06))
  for (let dy = 0; dy < epaisseurBase; dy++) {
    for (let x = xDebut; x < xFin; x++) {
      if (yBase + dy < taille) {
        setPixel(pixels, taille, x, yBase + dy, COULEUR_LETTRE)
      }
    }
  }

  const tours = [
    { x: 0.36, w: 0.28, h: 0.44 },
    { x: 0.18, w: 0.18, h: 0.28 },
  ]
  for (const tour of tours) {
    const tx = Math.round(taille * tour.x)
    const tw = Math.max(e, Math.round(taille * tour.w))
    const th = Math.max(e, Math.round(taille * tour.h))
    const ty = yBase - th
    for (let dy = 0; dy < th; dy++) {
      for (let dx = 0; dx < tw; dx++) {
        if (ty + dy >= 0 && ty + dy < yBase && tx + dx >= 0 && tx + dx < taille) {
          setPixel(pixels, taille, tx + dx, ty + dy, COULEUR_LETTRE)
        }
      }
    }
  }

  const fenetreTaille = Math.max(1, Math.round(taille * 0.07))
  const fenetreEspacement = Math.max(1, Math.round(taille * 0.12))
  const tourPrincipaleX = Math.round(taille * 0.36)
  const tourPrincipaleW = Math.max(e, Math.round(taille * 0.28))
  const centreTour = tourPrincipaleX + Math.floor(tourPrincipaleW / 2)

  for (let fy = 0; fy < 2; fy++) {
    for (let fx = -1; fx <= 1; fx++) {
      const px = centreTour + fx * fenetreEspacement - Math.floor(fenetreTaille / 2)
      const py = Math.round(taille * 0.42) + fy * fenetreEspacement
      for (let dy = 0; dy < fenetreTaille; dy++) {
        for (let dx = 0; dx < fenetreTaille; dx++) {
          if (py + dy < yBase && px + dx >= 0 && px + dx < taille) {
            setPixel(pixels, taille, px + dx, py + dy, COULEUR_FOND)
          }
        }
      }
    }
  }

  if (taille >= 32) {
    const grueX = Math.round(taille * 0.64)
    const grueY = Math.round(taille * 0.12)
    const grueW = Math.max(1, Math.round(taille * 0.2))
    for (let dx = 0; dx < grueW; dx++) {
      if (grueX + dx < taille) {
        setPixel(pixels, taille, grueX + dx, grueY, COULEUR_ACCENT)
      }
    }
    const grueFinX = grueX + grueW - 1
    const grueFinY = Math.round(taille * 0.12)
    const grueDescY = Math.round(taille * 0.28)
    for (let dy = grueFinY; dy <= Math.min(grueDescY, taille - 1); dy++) {
      setPixel(pixels, taille, grueFinX, dy, COULEUR_ACCENT)
    }
    const crochetY = Math.min(grueDescY + Math.max(1, Math.round(taille * 0.04)), taille - 1)
    setPixel(pixels, taille, grueFinX, crochetY, COULEUR_ACCENT)
    if (grueFinX + 1 < taille) {
      setPixel(pixels, taille, grueFinX + 1, crochetY, COULEUR_ACCENT)
    }
  }
}

function setPixel(pixels, taille, x, y, couleur) {
  if (x < 0 || x >= taille || y < 0 || y >= taille) return
  const i = (y * taille + x) * 4
  pixels[i] = couleur[0]
  pixels[i + 1] = couleur[1]
  pixels[i + 2] = couleur[2]
  pixels[i + 3] = couleur[3]
}

function genererPNG32(taille, pixels) {
  const longueurLigne = taille * 4
  const padding = (4 - (longueurLigne % 4)) % 4
  const tailleLigne = longueurLigne + padding

  const enTeteBmp = Buffer.alloc(40)
  enTeteBmp.writeUInt32LE(40, 0)
  enTeteBmp.writeInt32LE(taille, 4)
  enTeteBmp.writeInt32LE(taille * 2, 8)
  enTeteBmp.writeUInt16LE(1, 12)
  enTeteBmp.writeUInt16LE(32, 14)
  enTeteBmp.writeUInt32LE(0, 16)
  enTeteBmp.writeUInt32LE(0, 20)
  enTeteBmp.writeInt32LE(0, 24)
  enTeteBmp.writeInt32LE(0, 28)
  enTeteBmp.writeUInt32LE(0, 32)
  enTeteBmp.writeUInt32LE(0, 36)

  const donneesPixel = Buffer.alloc(tailleLigne * taille)
  for (let y = 0; y < taille; y++) {
    const ligneSrc = (taille - 1 - y) * taille * 4
    const ligneDst = y * tailleLigne
    for (let x = 0; x < taille; x++) {
      const srcI = ligneSrc + x * 4
      const dstI = ligneDst + x * 4
      donneesPixel[dstI] = pixels[srcI + 2]
      donneesPixel[dstI + 1] = pixels[srcI + 1]
      donneesPixel[dstI + 2] = pixels[srcI]
      donneesPixel[dstI + 3] = pixels[srcI + 3]
    }
  }

  const tailleOctetsMasque = Math.ceil(taille / 8) * taille
  const masqueEt = Buffer.alloc(tailleOctetsMasque, 0)

  return Buffer.concat([enTeteBmp, donneesPixel, masqueEt])
}

function genererEnTeteICO(nombreImages) {
  const enTete = Buffer.alloc(6)
  enTete.writeUInt16LE(0, 0)
  enTete.writeUInt16LE(1, 2)
  enTete.writeUInt16LE(nombreImages, 4)
  return enTete
}

function genererEntreeICO(taille, offset, tailleDonnees) {
  const entree = Buffer.alloc(16)
  entree.writeUInt8(taille <= 255 ? taille : 0, 0)
  entree.writeUInt8(taille <= 255 ? taille : 0, 1)
  entree.writeUInt16LE(0, 2)
  entree.writeUInt16LE(1, 4)
  entree.writeUInt16LE(32, 6)
  entree.writeUInt32LE(tailleDonnees, 8)
  entree.writeUInt32LE(offset, 12)
  return entree
}

console.log('Génération de icon.ico...')
console.log(`Tailles : ${TAILLES.join(', ')} px`)

const donneesImages = []
for (const taille of TAILLES) {
  console.log(`  Rendu ${taille}×${taille}...`)
  const pixels = Buffer.alloc(taille * taille * 4)

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = COULEUR_FOND[0]
    pixels[i + 1] = COULEUR_FOND[1]
    pixels[i + 2] = COULEUR_FOND[2]
    pixels[i + 3] = COULEUR_FOND[3]
  }

  dessinerCarreArrondi(pixels, taille)
  dessinerBordure(pixels, taille)
  dessinerBatiment(pixels, taille)

  donneesImages.push(genererPNG32(taille, pixels))
}

const enTete = genererEnTeteICO(TAILLES.length)
const entrees = []
let decalage = 6 + TAILLES.length * 16

for (let i = 0; i < TAILLES.length; i++) {
  entrees.push(genererEntreeICO(TAILLES[i], decalage, donneesImages[i].length))
  decalage += donneesImages[i].length
}

const ico = Buffer.concat([enTete, ...entrees, ...donneesImages])
writeFileSync(cheminIco, ico)

const tailleOctets = ico.length
const reserve1 = ico.readUInt16LE(0)
const type = ico.readUInt16LE(2)
const nombreImages = ico.readUInt16LE(4)

console.log(`\nFichier écrit : ${cheminIco}`)
console.log(`Taille : ${tailleOctets} octets`)
console.log(`Réservé : ${reserve1} (attendu 0)`)
console.log(`Type : ${type} (attendu 1 = ICO)`)
console.log(`Nombre d'images : ${nombreImages}`)

if (reserve1 === 0 && type === 1 && nombreImages === TAILLES.length) {
  console.log('\n✓ En-tête ICO valide')
} else {
  console.error('\n✗ En-tête ICO invalide')
  process.exit(1)
}

if (tailleOctets > 1024) {
  console.log(`✓ Taille > 1 Ko (${tailleOctets} octets)`)
} else {
  console.error(`✗ Taille insuffisante (${tailleOctets} octets < 1024)`)
  process.exit(1)
}

console.log('\nTerminé.')
