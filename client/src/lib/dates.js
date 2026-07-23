const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekDays(count = 7) {
  const today = new Date();
  const todayIso = toIso(today);
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toIso(d);
    days.push({ iso, dow: DOW[d.getDay()], num: d.getDate(), isToday: iso === todayIso });
  }
  return days;
}
