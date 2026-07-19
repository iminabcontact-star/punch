import * as P from './punch.js';

const KEY = 'punch:v1';
const $ = (id) => document.getElementById(id);

let records = load();
let viewMonth = P.monthKey(P.todayStr(new Date()));
let undoSnapshot = null;
let undoTimer = null;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return []; // 깨진 데이터는 빈 상태로 시작 (백업 복원으로 되살릴 수 있음)
  }
}

function setRecords(next, { undoable = false } = {}) {
  if (undoable) {
    undoSnapshot = records;
    clearTimeout(undoTimer);
    $('undo-bar').hidden = false;
    undoTimer = setTimeout(() => {
      $('undo-bar').hidden = true;
      undoSnapshot = null;
    }, 3000);
  }
  records = next;
  localStorage.setItem(KEY, JSON.stringify(records));
  render();
}

$('undo-btn').onclick = () => {
  if (undoSnapshot) {
    records = undoSnapshot;
    localStorage.setItem(KEY, JSON.stringify(records));
  }
  undoSnapshot = null;
  clearTimeout(undoTimer);
  $('undo-bar').hidden = true;
  render();
};

$('punch-btn').onclick = () => {
  const now = new Date();
  const today = P.todayStr(now);
  const hm = P.nowHM(now);
  const active = P.activeRecord(records, today);

  if (!active) {
    setRecords(P.punchIn(records, today, hm), { undoable: true });
    return;
  }
  if (active.date === today) {
    setRecords(P.punchOut(records, today, hm), { undoable: true });
    return;
  }
  // 어제의 미퇴근 기록: 자정 넘긴 야근인지, 어제 퇴근을 깜빡한 건지 사용자에게 확인
  const asOvernight = confirm(
    `어제(${active.date}) ${active.in} 출근의 퇴근으로 기록할까요?\n` +
    `(취소하면 오늘 출근으로 기록되고, 어제 기록은 나중에 수정하면 됩니다)`
  );
  if (asOvernight) {
    setRecords(P.punchOut(records, active.date, hm, true), { undoable: true });
  } else {
    setRecords(P.punchIn(records, today, hm), { undoable: true });
  }
};

$('prev-month').onclick = () => { viewMonth = P.shiftMonth(viewMonth, -1); render(); };
$('next-month').onclick = () => { viewMonth = P.shiftMonth(viewMonth, 1); render(); };

function render() {
  const now = new Date();
  const today = P.todayStr(now);

  $('today-title').textContent = new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  }).format(now);

  const active = P.activeRecord(records, today);
  const todayRec = P.getRecord(records, today);
  const btn = $('punch-btn');
  if (active) {
    btn.textContent = '퇴근 🌇';
    btn.className = 'out';
    btn.disabled = false;
    $('today-sub').textContent =
      `${active.in} 출근함${active.date !== today ? ' (어제)' : ''}`;
  } else if (todayRec?.out) {
    btn.textContent = `오늘 ${P.formatDuration(P.durationMinutes(todayRec))} 근무 완료 ✅`;
    btn.className = 'done';
    btn.disabled = true;
    $('today-sub').textContent = `${todayRec.in} ~ ${todayRec.out}`;
  } else {
    btn.textContent = '출근 🌅';
    btn.className = 'in';
    btn.disabled = false;
    $('today-sub').textContent = '';
  }

  const [y, m] = viewMonth.split('-');
  $('month-title').textContent = `${y}년 ${Number(m)}월`;

  const list = $('record-list');
  list.replaceChildren();
  for (const r of P.monthRecords(records, viewMonth)) {
    const li = document.createElement('li');
    const [, mm, dd] = r.date.split('-');
    const outText = r.out ?? (P.missingOut(r, today) ? '퇴근 미입력' : '근무 중');
    li.innerHTML =
      `<span class="d">${Number(mm)}/${Number(dd)}</span>` +
      `<span class="t">${r.in} ~ ${r.out ? r.out : `<em class="miss">${outText}</em>`}</span>` +
      `<span class="dur">${P.formatDuration(P.durationMinutes(r))}</span>`;
    list.appendChild(li);
  }

  $('month-total').textContent =
    `이번 달 합계: ${P.formatDuration(P.monthTotalMinutes(records, viewMonth)) || '0h 00m'}`;
}

render();
