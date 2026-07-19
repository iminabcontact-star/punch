import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../punch.js';

const R = (date, inHM, out = null, overnight = false) => ({ date, in: inHM, out, overnight });

test('punchIn: 추가 + 내림차순 정렬, 중복 출근은 throw', () => {
  let recs = P.punchIn([], '2026-07-18', '09:01');
  recs = P.punchIn(recs, '2026-07-19', '08:55');
  assert.deepEqual(recs.map(r => r.date), ['2026-07-19', '2026-07-18']);
  assert.deepEqual(recs[0], R('2026-07-19', '08:55'));
  assert.throws(() => P.punchIn(recs, '2026-07-19', '10:00'));
});

test('punchOut: 퇴근 기록, 상태 오류는 throw', () => {
  let recs = P.punchIn([], '2026-07-19', '09:00');
  recs = P.punchOut(recs, '2026-07-19', '18:30');
  assert.equal(recs[0].out, '18:30');
  assert.throws(() => P.punchOut(recs, '2026-07-19', '19:00')); // 이미 퇴근
  assert.throws(() => P.punchOut(recs, '2026-07-20', '19:00')); // 미출근
});

test('punchOut: overnight 플래그', () => {
  let recs = P.punchIn([], '2026-07-18', '22:00');
  recs = P.punchOut(recs, '2026-07-18', '01:30', true);
  assert.equal(recs[0].overnight, true);
  assert.equal(P.durationMinutes(recs[0]), 210);
});

test('todayState', () => {
  assert.equal(P.todayState([], '2026-07-19'), 'none');
  const open = [R('2026-07-19', '09:00')];
  assert.equal(P.todayState(open, '2026-07-19'), 'in');
  const done = [R('2026-07-19', '09:00', '18:00')];
  assert.equal(P.todayState(done, '2026-07-19'), 'done');
});

test('activeRecord: 오늘 또는 어제의 미퇴근 기록', () => {
  assert.equal(P.activeRecord([], '2026-07-19'), null);
  const todayOpen = [R('2026-07-19', '09:00')];
  assert.equal(P.activeRecord(todayOpen, '2026-07-19').date, '2026-07-19');
  const yesterdayOpen = [R('2026-07-18', '22:00')];
  assert.equal(P.activeRecord(yesterdayOpen, '2026-07-19').date, '2026-07-18');
  const tooOld = [R('2026-07-15', '09:00')];
  assert.equal(P.activeRecord(tooOld, '2026-07-19'), null); // 그제 이전은 수동 수정 대상
  const closed = [R('2026-07-19', '09:00', '18:00')];
  assert.equal(P.activeRecord(closed, '2026-07-19'), null);
});

test('upsertRecord: 수정과 추가, 정렬 유지', () => {
  let recs = [R('2026-07-19', '09:00', '18:00'), R('2026-07-17', '09:00', '18:00')];
  recs = P.upsertRecord(recs, R('2026-07-18', '10:00', '19:00')); // 추가
  assert.deepEqual(recs.map(r => r.date), ['2026-07-19', '2026-07-18', '2026-07-17']);
  recs = P.upsertRecord(recs, R('2026-07-19', '08:30', '17:30')); // 교체
  assert.equal(recs.length, 3);
  assert.equal(recs[0].in, '08:30');
});

test('deleteRecord', () => {
  const recs = [R('2026-07-19', '09:00', '18:00')];
  assert.deepEqual(P.deleteRecord(recs, '2026-07-19'), []);
});

test('monthRecords / monthTotalMinutes: 미퇴근 제외', () => {
  const recs = [
    R('2026-08-01', '09:00', '18:00'),          // 다른 달 (540)
    R('2026-07-19', '09:00'),                   // 미퇴근 → 합계 제외
    R('2026-07-18', '09:00', '18:00'),          // 540
    R('2026-07-17', '22:00', '01:00', true),    // 야근 180
  ];
  assert.equal(P.monthRecords(recs, '2026-07').length, 3);
  assert.equal(P.monthTotalMinutes(recs, '2026-07'), 720);
});

test('missingOut: 지난 날짜의 퇴근 미입력만 true', () => {
  assert.equal(P.missingOut(R('2026-07-18', '09:00'), '2026-07-19'), true);
  assert.equal(P.missingOut(R('2026-07-19', '09:00'), '2026-07-19'), false); // 오늘은 아직 근무 중
  assert.equal(P.missingOut(R('2026-07-18', '09:00', '18:00'), '2026-07-19'), false);
});
