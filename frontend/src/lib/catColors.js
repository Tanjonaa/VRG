/**
 * Palette de couleurs pour les catégories produits.
 * Toute nouvelle catégorie reçoit automatiquement une couleur
 * déterministe basée sur le hash de son nom.
 */
const PALETTE = [
  { color: '#ca8a04', bg: 'rgba(202,138,4,0.1)',   border: 'rgba(202,138,4,0.25)'   }, // ambre
  { color: '#CC5500', bg: 'rgba(204,85,0,0.1)',    border: 'rgba(204,85,0,0.25)'    }, // orange foncé
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  }, // bleu
  { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' }, // violet
  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)'  }, // vert menthe
  { color: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)' }, // rose
  { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)'  }, // orange
  { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)'  }, // vert
  { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)'  }, // cyan
  { color: '#e879f9', bg: 'rgba(232,121,249,0.1)', border: 'rgba(232,121,249,0.25)' }, // fuchsia
]

function hashStr(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33 ^ str.charCodeAt(i)) >>> 0
  return h
}

/**
 * Retourne { color, bg, border } pour n'importe quelle catégorie.
 * Le résultat est toujours le même pour un même nom de catégorie.
 */
export function getCatStyle(cat) {
  if (!cat) return PALETTE[0]
  return PALETTE[hashStr(cat) % PALETTE.length]
}

/**
 * Alias pour compatibilité avec l'ancien format { colorBg, colorBorder }.
 */
export function getCatStyleLegacy(cat) {
  const s = getCatStyle(cat)
  return { color: s.color, colorBg: s.bg, colorBorder: s.border }
}
