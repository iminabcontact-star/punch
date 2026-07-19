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

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    alert('저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.');
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
  } else {
    undoSnapshot = null;
    clearTimeout(undoTimer);
    $('undo-bar').hidden = true;
  }
  records = next;
  persist();
  render();
}

$('undo-btn').onclick = () => {
  if (undoSnapshot) {
    records = undoSnapshot;
    persist();
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

// localStorage는 load()에서 형식 검증 없이 읽으므로, innerHTML에 넣기 전에 이스케이프
function esc(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render() {
  const now = new Date();
  const today = P.todayStr(now);

  $('today-title').textContent = new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  }).format(now);

  const active = P.activeRecord(records, today);
  const todayRec = P.getRecord(records, today);
  const btn = $('punch-btn');
  // 히어로 버튼은 큰 라벨 + 작은 힌트 2단 구성 (이모지는 기기마다 깨져서 쓰지 않음)
  const hero = (label, hint) =>
    `<span class="hero-label">${esc(label)}</span><span class="hero-hint">${esc(hint)}</span>`;
  if (active) {
    btn.innerHTML = hero('퇴근',
      `${active.in} 출근함${active.date !== today ? ' (어제)' : ''}`);
    btn.className = 'out';
    btn.disabled = false;
  } else if (todayRec?.out) {
    btn.innerHTML = hero(P.formatDuration(P.durationMinutes(todayRec)),
      `오늘 근무 완료 · ${todayRec.in} ~ ${todayRec.out}`);
    btn.className = 'done';
    btn.disabled = true;
  } else {
    btn.innerHTML = hero('출근', '탭 한 번으로 기록');
    btn.className = 'in';
    btn.disabled = false;
  }
  $('today-sub').textContent = '';

  const [y, m] = viewMonth.split('-');
  $('month-title').textContent = `${y}년 ${Number(m)}월`;

  const list = $('record-list');
  list.replaceChildren();
  for (const r of P.monthRecords(records, viewMonth)) {
    const li = document.createElement('li');
    const [, mm, dd] = r.date.split('-');
    const outText = r.out ?? (P.missingOut(r, today) ? '퇴근 미입력' : '근무 중');
    li.innerHTML =
      `<span class="d">${esc(Number(mm))}/${esc(Number(dd))}</span>` +
      `<span class="t">${esc(r.in)} ~ ${r.out ? esc(r.out) : `<em class="miss">${esc(outText)}</em>`}</span>` +
      `<span class="dur">${esc(P.formatDuration(P.durationMinutes(r)))}</span>`;
    li.onclick = () => openEdit(r);
    list.appendChild(li);
  }

  $('month-total').textContent =
    `이번 달 합계: ${P.formatDuration(P.monthTotalMinutes(records, viewMonth)) || '0h 00m'}`;
}

const dlg = $('edit-dialog');
const form = $('edit-form');
let editingDate = null; // null이면 추가 모드

function openEdit(rec) {
  editingDate = rec?.date ?? null;
  $('edit-title').textContent = rec ? '기록 수정' : '기록 추가';
  $('edit-delete').hidden = !rec;
  form.elements.date.value = rec?.date ?? P.todayStr(new Date());
  form.elements.in.value = rec?.in ?? '09:00';
  form.elements.out.value = rec?.out ?? '';
  form.elements.overnight.checked = !!rec?.overnight;
  dlg.showModal();
}

$('add-btn').onclick = () => openEdit(null);
// 삭제/취소는 type="button": Enter의 암묵적 제출이 저장으로만 가도록
$('edit-delete').onclick = () => dlg.close('delete');
$('edit-cancel').onclick = () => dlg.close('cancel');

dlg.onclose = () => {
  const f = form.elements;
  if (dlg.returnValue === 'delete' && editingDate) {
    if (confirm('이 기록을 삭제할까요?')) setRecords(P.deleteRecord(records, editingDate));
    return;
  }
  if (dlg.returnValue !== 'save') return;

  const rec = {
    date: f.date.value,
    in: f.in.value,
    out: f.out.value || null,
    overnight: f.overnight.checked,
  };
  // 자정 넘긴 야근: 퇴근이 출근보다 이르면 확인
  if (rec.out && !rec.overnight && P.isOvernightCandidate(rec.in, rec.out)) {
    rec.overnight = confirm('퇴근이 출근보다 이릅니다. 다음날 퇴근(야근)으로 계산할까요?');
  }
  let next = records;
  if (editingDate && editingDate !== rec.date) next = P.deleteRecord(next, editingDate);
  // 날짜 충돌: 다른 기록이 있는 날짜로 저장하려면 확인 (거절 시 records는 그대로)
  if ((!editingDate || editingDate !== rec.date) && P.getRecord(next, rec.date)) {
    if (!confirm(`${rec.date}에 이미 기록이 있습니다. 덮어쓸까요?`)) return;
  }
  setRecords(P.upsertRecord(next, rec));
};

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('csv-btn').onclick = () => download('punch.csv', P.toCSV(records), 'text/csv');
$('backup-btn').onclick = () => download('punch-backup.json', P.toBackup(records), 'application/json');
$('restore-btn').onclick = () => $('restore-input').click();
$('restore-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const restored = P.fromBackup(await file.text());
    if (confirm(`${restored.length}건의 기록으로 교체할까요?\n현재 기록은 사라집니다.`)) {
      setRecords(restored);
    }
  } catch (err) {
    alert(`복원 실패: ${err.message}`);
  }
  e.target.value = '';
};

render();
