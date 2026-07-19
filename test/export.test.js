import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../punch.js';

const recs = [
  { date: '2026-07-19', in: '09:00', out: null, overnight: false },
  { date: '2026-07-18', in: '09:01', out: '18:24', overnight: false },
];

test('toCSV: 헤더 + 오름차순 + 미퇴근 빈칸', () => {
  assert.equal(
    P.toCSV(recs),
    'date,in,out,minutes\n2026-07-18,09:01,18:24,563\n2026-07-19,09:00,,\n'
  );
});

test('백업 왕복: toBackup → fromBackup', () => {
  const restored = P.fromBackup(P.toBackup(recs));
  assert.deepEqual(restored, recs);
});

test('fromBackup: 형식 오류는 throw', () => {
  assert.throws(() => P.fromBackup('{{{'), /JSON/);
  assert.throws(() => P.fromBackup('{"app":"other","records":[]}'), /punch/);
  assert.throws(() =>
    P.fromBackup(JSON.stringify({ app: 'punch', version: 1, records: [{ date: 'bad', in: '09:00' }] }))
  );
  assert.throws(() =>
    P.fromBackup(JSON.stringify({ app: 'punch', version: 1, records: [{ date: '2026-07-19', in: '9시' }] }))
  );
});

test('fromBackup: 정렬 안 된 입력도 내림차순으로', () => {
  const messy = JSON.stringify({
    app: 'punch', version: 1,
    records: [
      { date: '2026-07-17', in: '09:00', out: '18:00' },
      { date: '2026-07-19', in: '09:00' },
    ],
  });
  assert.deepEqual(P.fromBackup(messy).map(r => r.date), ['2026-07-19', '2026-07-17']);
});
