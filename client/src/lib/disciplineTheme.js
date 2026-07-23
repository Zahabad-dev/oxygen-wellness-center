// Tema visual por disciplina: color + foto. Las fotos son stock de referencia
// (mujeres diversas practicando cada disciplina) hasta que la clienta mande fotos reales de sus coaches.
const THEME = {
  'Functional Training': { color: 'var(--d-functional)', image: '/images/funcional.jpg' },
  'Pilates': { color: 'var(--d-pilates)', image: '/images/pilates.jpg' },
  'Yoga': { color: 'var(--d-yoga)', image: '/images/yoga.jpg' },
  'Barre': { color: 'var(--d-barre)', image: '/images/pilates.jpg' },
  'Mobility': { color: 'var(--d-mobility)', image: '/images/mobility.jpg' },
  'Stretching': { color: 'var(--d-stretch)', image: '/images/mobility.jpg' },
  'HIIT': { color: 'var(--d-hiit)', image: '/images/funcional.jpg' },
  'Meditación': { color: 'var(--d-meditation)', image: '/images/yoga.jpg' },
};

const FALLBACK = { color: 'var(--accent)', image: '/images/hero.jpg' };

export function disciplineTheme(nombre) {
  return THEME[nombre] || FALLBACK;
}
