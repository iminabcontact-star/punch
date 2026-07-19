// punch.js — 순수 로직 (DOM/localStorage 없음). node --test로 테스트한다.

export function todayStr(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nowHM(now) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + delta));
}

export function toMinutes(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function durationMinutes(rec) {
  if (!rec.in || !rec.out) return null;
  let diff = toMinutes(rec.out) - toMinutes(rec.in);
  if (rec.overnight) diff += 1440; // 자정 넘긴 야근
  return diff;
}

export function isOvernightCandidate(inHM, outHM) {
  return toMinutes(outHM) < toMinutes(inHM);
}

export function formatDuration(min) {
  if (min == null) return '';
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}
