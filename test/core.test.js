import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../punch.js';

test('todayStr: 로컬 날짜를 YYYY-MM-DD로', () => {
  assert.equal(P.todayStr(new Date(2026, 6, 19, 9, 2)), '2026-07-19');
  assert.equal(P.todayStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('nowHM: HH:MM 0채움', () => {
  assert.equal(P.nowHM(new Date(2026, 6, 19, 9, 2)), '09:02');
  assert.equal(P.nowHM(new Date(2026, 6, 19, 18, 24)), '18:24');
});

test('monthKey / shiftMonth / addDays', () => {
  assert.equal(P.monthKey('2026-07-19'), '2026-07');
  assert.equal(P.shiftMonth('2026-07', -1), '2026-06');
  assert.equal(P.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(P.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(P.addDays('2026-08-01', -1), '2026-07-31');
  assert.equal(P.addDays('2026-07-19', 1), '2026-07-20');
});

test('toMinutes', () => {
  assert.equal(P.toMinutes('00:00'), 0);
  assert.equal(P.toMinutes('09:30'), 570);
});

test('durationMinutes: 일반 / 미퇴근 / 야근', () => {
  assert.equal(P.durationMinutes({ in: '09:01', out: '18:24', overnight: false }), 563);
  assert.equal(P.durationMinutes({ in: '09:01', out: null, overnight: false }), null);
  assert.equal(P.durationMinutes({ in: '22:00', out: '01:30', overnight: true }), 210);
});

test('isOvernightCandidate', () => {
  assert.equal(P.isOvernightCandidate('09:00', '18:00'), false);
  assert.equal(P.isOvernightCandidate('22:00', '01:30'), true);
});

test('formatDuration', () => {
  assert.equal(P.formatDuration(503), '8h 23m');
  assert.equal(P.formatDuration(60), '1h 00m');
  assert.equal(P.formatDuration(null), '');
});
