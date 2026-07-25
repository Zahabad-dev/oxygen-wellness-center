// Tema visual por disciplina: color + foto real del coach que la imparte.
const THEME = {
  'Funcional': { color: 'var(--d-functional)', image: '/images/coach/CoachFabiFuncional.jpeg' },
  'Sculpt': { color: 'var(--d-sculpt)', image: '/images/coach/CoachAleSculp.jpeg' },
  'Pilates': { color: 'var(--d-pilates)', image: '/images/coach/CoachGeraldPilates.jpeg' },
  'Baile': { color: 'var(--d-baile)', image: '/images/coach/CoachJuniorBaile.jpeg' },
};

const FALLBACK = { color: 'var(--accent)', image: '/images/hero.jpg' };

export function disciplineTheme(nombre) {
  return THEME[nombre] || FALLBACK;
}
