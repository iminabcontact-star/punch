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

// ---- 기록 CRUD / 집계 ----

function sortRecords(records) {
  return [...records].sort((a, b) => b.date.localeCompare(a.date)); // 최신이 위
}

export function getRecord(records, date) {
  return records.find(r => r.date === date) ?? null;
}

export function todayState(records, date) {
  const r = getRecord(records, date);
  if (!r || !r.in) return 'none';
  return r.out ? 'done' : 'in';
}

export function activeRecord(records, today) {
  const yesterday = addDays(today, -1);
  return records.find(r => r.out == null && (r.date === today || r.date === yesterday)) ?? null;
}

export function punchIn(records, date, hm) {
  if (getRecord(records, date)) throw new Error(`${date}에 이미 기록이 있습니다`);
  return sortRecords([...records, { date, in: hm, out: null, overnight: false }]);
}

export function punchOut(records, date, hm, overnight = false) {
  const r = getRecord(records, date);
  if (!r || r.out) throw new Error(`${date}는 퇴근을 기록할 상태가 아닙니다`);
  return records.map(x => (x.date === date ? { ...x, out: hm, overnight } : x));
}

export function upsertRecord(records, rec) {
  const rest = records.filter(r => r.date !== rec.date);
  return sortRecords([...rest, { out: null, overnight: false, ...rec }]);
}

export function deleteRecord(records, date) {
  return records.filter(r => r.date !== date);
}

export function monthRecords(records, month) {
  return records.filter(r => r.date.startsWith(month));
}

export function monthTotalMinutes(records, month) {
  return monthRecords(records, month)
    .map(durationMinutes)
    .filter(m => m != null)
    .reduce((a, b) => a + b, 0);
}

export function missingOut(rec, today) {
  return rec.out == null && rec.date < today;
}
