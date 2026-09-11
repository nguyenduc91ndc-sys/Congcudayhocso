import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

// Exercise the real publisher with an in-memory Firestore transport.
const documents = new Map();
const batchSizes = [];
let failBatch = false;
const firestore = {
  initializeFirestore: () => ({}),
  doc: (_, ...parts) => parts.join('/'),
  serverTimestamp: () => 'server-time',
  getDoc: async (key) => ({ exists: () => documents.has(key), data: () => documents.get(key) }),
  setDoc: async (key, value) => documents.set(key, structuredClone(value)),
  writeBatch: () => {
    const operations = [];
    return {
      set: (key, value) => operations.push(() => documents.set(key, structuredClone(value))),
      delete: (key) => operations.push(() => documents.delete(key)),
      commit: async () => {
        assert.ok(operations.length <= 5);
        if (failBatch) throw Object.assign(new Error('offline'), { code: 'unavailable' });
        batchSizes.push(operations.length);
        operations.forEach((operation) => operation());
      },
    };
  },
};
const exports = {};
const source = fs.readFileSync(new URL('../components/happy-class/firebase.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports, crypto: webcrypto, TextEncoder,
  require: (name) => {
    if (name === 'firebase/app') return { getApps: () => [], initializeApp: () => ({}) };
    if (name === 'firebase/auth') return { getAuth: () => ({ currentUser: { uid: 'test-teacher' } }) };
    if (name === 'firebase/firestore') return firestore;
    throw new Error(name);
  },
});
const input = {
  portal: { publicId: 'test-class', enabled: true },
  classProfile: { name: 'Test', code: 'TEST' }, teacherName: 'Test',
  week: { id: 'week-1' }, scoring: {}, activities: [],
  students: Array.from({ length: 40 }, (_, id) => ({ id, name: `Test ${id}`, parentCode: `CODE-${id}`, score: 0 })),
};
const first = await exports.publishParentPortal(input);
assert.equal(first.changed, 40);
assert.equal(first.total, 40);
assert.deepEqual(batchSizes, Array(8).fill(5));
assert.equal((await exports.publishParentPortal(input)).changed, 0);
input.students[0].parentCode = 'REPLACEMENT';
const rotated = await exports.publishParentPortal(input);
assert.equal(rotated.changed, 1);
assert.equal(rotated.removed, 1);
assert.equal((await exports.publishParentPortal(input)).removed, 0);
const manifestKey = 'teachers/test-teacher/parentPortals/test-class';
const before = JSON.stringify(documents.get(manifestKey));
input.students.forEach((student) => { student.score = 10; });
failBatch = true;
await assert.rejects(exports.publishParentPortal(input), /ghi hồ sơ/);
assert.equal(JSON.stringify(documents.get(manifestKey)), before);
failBatch = false;
assert.equal((await exports.publishParentPortal(input)).changed, 40);
assert.equal([...documents.keys()].filter((key) => key.startsWith('parentPortals/test-class/students/')).length, 40);
console.log('PASS: 40 profiles, unchanged republish, code revocation, failed publish and retry.');
documents.set('parentPortals/test-class', { ownerUid: 'another-teacher' });
const batchesBeforeOwnerCheck = batchSizes.length;
await assert.rejects(exports.publishParentPortal(input), (error) => error.code === 'portal-owner-mismatch');
assert.equal(batchSizes.length, batchesBeforeOwnerCheck);
console.log('PASS: different owner is identified before any student writes.');
