import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

// Exercise the real publisher with an in-memory Firestore transport.
const documents = new Map();
const batchSizes = [];
let failBatch = false;
let failManifest = false;
const firestore = {
  initializeFirestore: () => ({}),
  doc: (_, ...parts) => parts.join('/'),
  serverTimestamp: () => 'server-time',
  getDoc: async (key) => ({ exists: () => documents.has(key), data: () => documents.get(key) }),
  setDoc: async (key, value) => {
    if (failManifest && key.startsWith('teachers/')) throw Object.assign(new Error('offline'), { code: 'unavailable' });
    documents.set(key, structuredClone(value));
  },
  writeBatch: () => {
    const operations = [];
    const checks = [];
    return {
      set: (key, value) => {
        checks.push(() => {
          if (documents.has(key) && documents.get(key).ownerUid !== 'test-teacher') {
            throw Object.assign(new Error('foreign owner'), { code: 'permission-denied' });
          }
        });
        operations.push(() => documents.set(key, structuredClone(value)));
      },
      delete: (key) => {
        // ownsResource() denies deleting an absent document as well as a foreign one.
        checks.push(() => {
          if (documents.get(key)?.ownerUid !== 'test-teacher') {
            throw Object.assign(new Error('missing or foreign owner'), { code: 'permission-denied' });
          }
        });
        operations.push(() => documents.delete(key));
      },
      commit: async () => {
        assert.ok(operations.length <= 5);
        if (failBatch) throw Object.assign(new Error('offline'), { code: 'unavailable' });
        checks.forEach((check) => check());
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
assert.equal([...documents.entries()].filter(([key, value]) => key.startsWith('parentPortals/test-class/students/') && value.active).length, 40);
const revoked = [...documents.entries()].filter(([key, value]) => key.startsWith('parentPortals/test-class/students/') && !value.active);
assert.equal(revoked.length, 1);
assert.equal(revoked[0][1].student, undefined, 'Revoking a code must remove personal data');
assert.equal(revoked[0][1].activities, undefined);
console.log('PASS: 40 profiles, unchanged republish, code revocation, failed publish and retry.');
// Legacy merged manifests retained keys after the public documents were deleted.
documents.get(manifestKey).studentSignatures['already-deleted-code'] = 'old-signature';
const repaired = await exports.publishParentPortal(input);
assert.equal(repaired.removed, 1);
assert.equal(documents.get('parentPortals/test-class/students/already-deleted-code').active, false);
assert.equal(documents.get(manifestKey).studentSignatures['already-deleted-code'], undefined);
assert.equal((await exports.publishParentPortal(input)).removed, 0);
console.log('PASS: legacy manifest with an already deleted code can be published again.');
// All remote writes can finish before the final manifest save loses connection.
input.students[1].parentCode = 'SECOND-REPLACEMENT';
const beforeInterruptedSave = JSON.stringify(documents.get(manifestKey));
failManifest = true;
await assert.rejects(exports.publishParentPortal(input), (error) => error.code === 'unavailable');
assert.equal(JSON.stringify(documents.get(manifestKey)), beforeInterruptedSave);
failManifest = false;
assert.equal((await exports.publishParentPortal(input)).removed, 1);
assert.equal((await exports.publishParentPortal(input)).removed, 0);
console.log('PASS: retry after revocation succeeds but manifest save fails.');
// Do not hide actual authorization failures or report a successful full publish.
const foreignKey = 'parentPortals/test-class/students/foreign-code';
documents.set(foreignKey, { ownerUid: 'another-teacher', active: true, student: { name: 'Private' } });
documents.get(manifestKey).studentSignatures['foreign-code'] = 'legacy';
const beforeForeignFailure = JSON.stringify(documents.get(manifestKey));
await assert.rejects(exports.publishParentPortal(input), (error) => error.code === 'permission-denied');
assert.equal(documents.get(foreignKey).active, true);
assert.equal(documents.get(foreignKey).ownerUid, 'another-teacher');
assert.equal(JSON.stringify(documents.get(manifestKey)), beforeForeignFailure);
console.log('PASS: foreign-owned records stay protected and denied writes do not finalize the manifest.');
documents.set('parentPortals/test-class', { ownerUid: 'another-teacher' });
const batchesBeforeOwnerCheck = batchSizes.length;
await assert.rejects(exports.publishParentPortal(input), (error) => error.code === 'portal-owner-mismatch');
assert.equal(batchSizes.length, batchesBeforeOwnerCheck);
console.log('PASS: different owner is identified before any student writes.');
