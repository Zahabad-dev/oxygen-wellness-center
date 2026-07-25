// Tema visual por disciplina: color + foto real del coach que la imparte.
// "position" = punto focal (object-position) para que los recortes circulares
// chiquitos (medallones) centren la cara del coach en vez del fondo/cuerpo.
const THEME = {
  'Funcional': { color: 'var(--d-functional)', image: '/images/coach/CoachFabiFuncional.jpeg', position: '48% 25%' },
  'Sculpt': { color: 'var(--d-sculpt)', image: '/images/coach/CoachAleSculp.jpeg', position: '76% 33%' },
  'Pilates': { color: 'var(--d-pilates)', image: '/images/coach/CoachGeraldPilates.jpeg', position: '78% 45%' },
  'Baile': { color: 'var(--d-baile)', image: '/images/coach/CoachJuniorBaile.jpeg', position: '42% 15%' },
};

const FALLBACK = { color: 'var(--accent)', image: '/images/hero.jpg', position: '50% 50%' };

export function disciplineTheme(nombre) {
  return THEME[nombre] || FALLBACK;
}
