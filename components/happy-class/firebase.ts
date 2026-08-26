import { getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Activity, Student, WeekPeriod } from './types';

const firebaseConfig = {
  apiKey: 'AIzaSyAj3V4o8msBNwZi531qpIDcFhnZ7WKY8wA',
  authDomain: 'lop-hanh-phuc-c57b3.firebaseapp.com',
  projectId: 'lop-hanh-phuc-c57b3',
  messagingSenderId: '64852368676',
  appId: '1:64852368676:web:93149f27480f82ea2667b1',
};

const HAPPY_CLASS_FIREBASE_APP_NAME = 'lop-hanh-phuc-parent';
export const HAPPY_CLASS_ADMIN_EMAILS = ['ducnguyen.giaovien@gmail.com', 'nguyenduc91ndc@gmail.com'] as const;
const HAPPY_CLASS_DEVICE_KEY = 'happy-class-installation-id-v1';
const HAPPY_CLASS_ACCESS_COLLECTION = 'happyClassAccess';
const firebaseApp = getApps().find((app) => app.name === HAPPY_CLASS_FIREBASE_APP_NAME)
  ?? initializeApp(firebaseConfig, HAPPY_CLASS_FIREBASE_APP_NAME);
const auth = getAuth(firebaseApp);
let db: Firestore;
try {
  db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
} catch {
  db = getFirestore(firebaseApp);
}

export type PublicPortalRecord = {
  schemaVersion: 1;
  publicId: string;
  enabled: boolean;
  requireAccessCode: boolean;
  className: string;
  classCode: string;
  teacherName: string;
  teacherEmail: string;
  feedbackEndpoint: string;
  week: WeekPeriod;
  scoring: {
    startingPoints: number;
    positiveTarget: number;
    honorTarget: number;
    highScoreWarning: number;
  };
  publishedAt: string;
};

export type PublicStudentRecord = {
  schemaVersion: 1;
  portalId: string;
  active: boolean;
  student: Pick<Student,
    'id' | 'name' | 'initials' | 'team' | 'role' | 'score' | 'weeklyScore' | 'streak' |
    'attendance' | 'gradient' | 'parentName' | 'parentPhone' | 'teacherComment' |
    'teacherCommentWeekId' | 'teacherCommentUpdatedAt'
  > & { photo?: string };
  activities: Pick<Activity, 'id' | 'title' | 'detail' | 'points' | 'time' | 'tone'>[];
};

type PublishInput = {
  portal: {
    publicId: string;
    enabled: boolean;
    requireAccessCode?: boolean;
    teacherEmail?: string;
    feedbackEndpoint?: string;
  };
  classProfile: { name: string; code: string };
  teacherName: string;
  students: Student[];
  activities: Activity[];
  week: WeekPeriod;
  scoring: PublicPortalRecord['scoring'];
};

type PrivateManifest = {
  studentSignatures?: Record<string, string>;
};

export function canUseFirebaseOnline() {
  return typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
}

export function watchFirebaseTeacher(callback: (user: User | null) => void) {
  if (!canUseFirebaseOnline()) return () => undefined;
  return onAuthStateChanged(auth, callback);
}

export async function signInFirebaseTeacher() {
  if (!canUseFirebaseOnline()) throw new Error('FIREBASE_REQUIRES_WEB');
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return (await signInWithPopup(auth, provider)).user;
}

export async function signInFirebaseTeacherWithGoogleCredential(idToken: string) {
  if (!canUseFirebaseOnline()) throw new Error('FIREBASE_REQUIRES_WEB');
  await setPersistence(auth, browserLocalPersistence);
  const credential = GoogleAuthProvider.credential(idToken);
  return (await signInWithCredential(auth, credential)).user;
}

export async function signOutFirebaseTeacher() {
  await signOut(auth);
}

export function getFirebaseTeacher() {
  return auth.currentUser;
}

export function normalizeHappyClassEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isHappyClassAdminEmail(value?: string | null) {
  const email = normalizeHappyClassEmail(value || '');
  return HAPPY_CLASS_ADMIN_EMAILS.includes(email as (typeof HAPPY_CLASS_ADMIN_EMAILS)[number]);
}

export type HappyClassDevice = {
  id: string;
  label: string;
  browser: string;
  platform: string;
  createdAt: string;
  lastSeenAt: string;
};

export type HappyClassAccessRecord = {
  email: string;
  name: string;
  school: string;
  note: string;
  active: boolean;
  devices: Record<string, HappyClassDevice>;
  createdAt: string;
  updatedAt: string;
  grantedBy: string;
  lastAccessAt?: string;
  revokedAt?: string;
};

export type HappyClassAccessDecision =
  | { status: 'allowed'; record?: HappyClassAccessRecord; deviceId?: string; admin?: boolean }
  | { status: 'denied' | 'revoked' | 'device-limit'; record?: HappyClassAccessRecord }
  | { status: 'account-mismatch'; firebaseEmail: string };

function accessRef(email: string) {
  return doc(db, HAPPY_CLASS_ACCESS_COLLECTION, normalizeHappyClassEmail(email));
}

function detectBrowser() {
  const agent = navigator.userAgent;
  if (/Edg\//i.test(agent)) return 'Microsoft Edge';
  if (/OPR\//i.test(agent)) return 'Opera';
  if (/Chrome\//i.test(agent)) return 'Google Chrome';
  if (/Firefox\//i.test(agent)) return 'Mozilla Firefox';
  if (/Safari\//i.test(agent)) return 'Safari';
  return 'Trình duyệt web';
}

function detectPlatform() {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(agent)) return 'iPhone/iPad';
  if (/Windows/i.test(agent)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(agent)) return 'macOS';
  if (/Linux/i.test(agent)) return 'Linux';
  return 'Thiết bị khác';
}

function getInstallationId() {
  let id = localStorage.getItem(HAPPY_CLASS_DEVICE_KEY);
  if (id) return id;
  id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(HAPPY_CLASS_DEVICE_KEY, id);
  return id;
}

function normalizeAccessRecord(value: Partial<HappyClassAccessRecord>, email: string): HappyClassAccessRecord {
  return {
    email: normalizeHappyClassEmail(value.email || email),
    name: value.name || '',
    school: value.school || '',
    note: value.note || '',
    active: value.active !== false,
    devices: value.devices && typeof value.devices === 'object' ? value.devices : {},
    createdAt: value.createdAt || '',
    updatedAt: value.updatedAt || '',
    grantedBy: value.grantedBy || '',
    ...(value.lastAccessAt ? { lastAccessAt: value.lastAccessAt } : {}),
    ...(value.revokedAt ? { revokedAt: value.revokedAt } : {}),
  };
}

export async function checkHappyClassAccess(expectedEmail: string): Promise<HappyClassAccessDecision> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('FIREBASE_SIGN_IN_REQUIRED');
  const email = normalizeHappyClassEmail(expectedEmail);
  const firebaseEmail = normalizeHappyClassEmail(user.email);
  if (firebaseEmail !== email) return { status: 'account-mismatch', firebaseEmail };
  if (isHappyClassAdminEmail(email)) return { status: 'allowed', admin: true };

  const reference = accessRef(email);
  const deviceId = getInstallationId();
  let decision: HappyClassAccessDecision = { status: 'denied' };

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      decision = { status: 'denied' };
      return;
    }

    const record = normalizeAccessRecord(snapshot.data() as Partial<HappyClassAccessRecord>, email);
    if (!record.active) {
      decision = { status: 'revoked', record };
      return;
    }

    const now = new Date().toISOString();
    const devices = { ...record.devices };
    const existingDevice = devices[deviceId];
    if (!existingDevice && Object.keys(devices).length >= 2) {
      decision = { status: 'device-limit', record };
      return;
    }

    devices[deviceId] = existingDevice
      ? { ...existingDevice, lastSeenAt: now }
      : {
          id: deviceId,
          label: `${detectBrowser()} · ${detectPlatform()}`,
          browser: detectBrowser(),
          platform: detectPlatform(),
          createdAt: now,
          lastSeenAt: now,
        };
    transaction.update(reference, { devices, lastAccessAt: now });
    decision = { status: 'allowed', record: { ...record, devices, lastAccessAt: now }, deviceId };
  });

  return decision;
}

export function subscribeHappyClassAccess(
  callback: (records: HappyClassAccessRecord[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(collection(db, HAPPY_CLASS_ACCESS_COLLECTION), (snapshot) => {
    const records = snapshot.docs
      .map((item) => normalizeAccessRecord(item.data() as Partial<HappyClassAccessRecord>, item.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    callback(records);
  }, (error) => onError?.(error));
}

export type HappyClassAccessInput = {
  email: string;
  name?: string;
  school?: string;
  note?: string;
};

function accessValue(input: HappyClassAccessInput, grantedBy: string, previous?: HappyClassAccessRecord) {
  const now = new Date().toISOString();
  return {
    email: normalizeHappyClassEmail(input.email),
    name: input.name?.trim() || previous?.name || '',
    school: input.school?.trim() || previous?.school || '',
    note: input.note?.trim() || previous?.note || '',
    active: true,
    devices: previous?.devices || {},
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    grantedBy: normalizeHappyClassEmail(grantedBy),
    revokedAt: '',
  } satisfies HappyClassAccessRecord;
}

function requireHappyClassAdmin() {
  const email = auth.currentUser?.email;
  if (!email || !isHappyClassAdminEmail(email)) throw new Error('HAPPY_CLASS_ADMIN_REQUIRED');
  return normalizeHappyClassEmail(email);
}

export async function grantHappyClassAccess(input: HappyClassAccessInput) {
  const adminEmail = requireHappyClassAdmin();
  const email = normalizeHappyClassEmail(input.email);
  const reference = accessRef(email);
  const current = await getDoc(reference);
  const previous = current.exists()
    ? normalizeAccessRecord(current.data() as Partial<HappyClassAccessRecord>, email)
    : undefined;
  await setDoc(reference, accessValue({ ...input, email }, adminEmail, previous));
}

export async function grantHappyClassAccessBulk(inputs: HappyClassAccessInput[]) {
  const normalized = Array.from(new Map(inputs.map((input) => [normalizeHappyClassEmail(input.email), input])).values());
  requireHappyClassAdmin();
  for (let index = 0; index < normalized.length; index += 20) {
    await Promise.all(normalized.slice(index, index + 20).map((input) => grantHappyClassAccess(input)));
  }
}

export async function editHappyClassAccess(originalEmail: string, input: HappyClassAccessInput) {
  const adminEmail = requireHappyClassAdmin();
  const oldEmail = normalizeHappyClassEmail(originalEmail);
  const nextEmail = normalizeHappyClassEmail(input.email);
  const current = await getDoc(accessRef(oldEmail));
  if (!current.exists()) throw new Error('ACCESS_RECORD_NOT_FOUND');
  const previous = normalizeAccessRecord(current.data() as Partial<HappyClassAccessRecord>, oldEmail);
  const value = accessValue({ ...input, email: nextEmail }, adminEmail, previous);
  if (oldEmail === nextEmail) {
    await setDoc(accessRef(oldEmail), value);
    return;
  }
  const target = await getDoc(accessRef(nextEmail));
  if (target.exists()) throw new Error('ACCESS_EMAIL_EXISTS');
  const batch = writeBatch(db);
  batch.set(accessRef(nextEmail), value);
  batch.delete(accessRef(oldEmail));
  await batch.commit();
}

export async function setHappyClassAccessActive(email: string, active: boolean) {
  requireHappyClassAdmin();
  const now = new Date().toISOString();
  await updateDoc(accessRef(email), {
    active,
    updatedAt: now,
    revokedAt: active ? '' : now,
  });
}

export async function deleteHappyClassAccess(email: string) {
  requireHappyClassAdmin();
  await deleteDoc(accessRef(email));
}

export async function resetHappyClassDevices(email: string) {
  requireHappyClassAdmin();
  await updateDoc(accessRef(email), { devices: {}, updatedAt: new Date().toISOString() });
}

export async function removeHappyClassDevice(email: string, deviceId: string) {
  requireHappyClassAdmin();
  const reference = accessRef(email);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('ACCESS_RECORD_NOT_FOUND');
    const record = normalizeAccessRecord(snapshot.data() as Partial<HappyClassAccessRecord>, email);
    const devices = { ...record.devices };
    delete devices[deviceId];
    transaction.update(reference, { devices, updatedAt: new Date().toISOString() });
  });
}

function normalizeParentCode(code: string) {
  return code.trim().toLocaleUpperCase('vi-VN').replace(/\s+/g, '');
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function studentDocumentKey(portalId: string, code: string) {
  return sha256(`${portalId}:${normalizeParentCode(code)}`);
}

function dataUrlBytes(value: string) {
  const base64 = value.slice(value.indexOf(',') + 1);
  return Math.ceil(base64.length * 0.75);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể chuẩn bị ảnh chia sẻ.'));
    image.src = source;
  });
}

export async function prepareParentThumbnail(source?: string) {
  if (!source) return undefined;
  const image = await loadImage(source);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  let targetSize = 160;
  let quality = 0.72;
  let result = '';

  while (targetSize >= 112) {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ nén ảnh.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetSize, targetSize);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize);
    result = canvas.toDataURL('image/webp', quality);
    if (dataUrlBytes(result) <= 20 * 1024) return result;
    if (quality > 0.42) quality -= 0.1;
    else {
      targetSize -= 24;
      quality = 0.58;
    }
  }

  return result;
}

function publicPortalRef(publicId: string) {
  return doc(db, 'parentPortals', publicId);
}

function publicStudentRef(publicId: string, key: string) {
  return doc(db, 'parentPortals', publicId, 'students', key);
}

function manifestRef(uid: string, publicId: string) {
  return doc(db, 'teachers', uid, 'parentPortals', publicId);
}

export async function publishParentPortal(input: PublishInput) {
  const user = auth.currentUser;
  if (!user) throw new Error('FIREBASE_SIGN_IN_REQUIRED');
  const publishedAt = new Date().toISOString();
  const portalRecord: PublicPortalRecord & { ownerUid: string; updatedAt: ReturnType<typeof serverTimestamp> } = {
    schemaVersion: 1,
    publicId: input.portal.publicId,
    ownerUid: user.uid,
    enabled: input.portal.enabled,
    requireAccessCode: input.portal.requireAccessCode !== false,
    className: input.classProfile.name,
    classCode: input.classProfile.code,
    teacherName: input.teacherName,
    teacherEmail: input.portal.teacherEmail?.trim() || user.email || '',
    feedbackEndpoint: input.portal.feedbackEndpoint?.trim() || '',
    week: input.week,
    scoring: input.scoring,
    publishedAt,
    updatedAt: serverTimestamp(),
  };

  const privateRef = manifestRef(user.uid, input.portal.publicId);
  const previousManifest = await getDoc(privateRef);
  const previousSignatures = previousManifest.exists()
    ? ((previousManifest.data() as PrivateManifest).studentSignatures || {})
    : {};
  const nextSignatures: Record<string, string> = {};
  const changedDocuments: { key: string; value: PublicStudentRecord & { ownerUid: string; updatedAt: ReturnType<typeof serverTimestamp> } }[] = [];

  for (const student of input.students) {
    if (!student.parentCode.trim()) continue;
    const key = await studentDocumentKey(input.portal.publicId, student.parentCode);
    const active = student.parentAccessEnabled !== false;
    const baseValue: PublicStudentRecord & { ownerUid: string } = active
      ? {
          schemaVersion: 1,
          ownerUid: user.uid,
          portalId: input.portal.publicId,
          active: true,
          student: {
            id: student.id,
            name: student.name,
            initials: student.initials,
            team: student.team,
            role: student.role,
            score: student.score,
            weeklyScore: student.weeklyScore,
            streak: student.streak,
            attendance: student.attendance,
            gradient: student.gradient,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            ...(student.teacherComment?.trim() && student.teacherCommentWeekId === input.week.id
              ? {
                  teacherComment: student.teacherComment.trim(),
                  teacherCommentWeekId: student.teacherCommentWeekId,
                  teacherCommentUpdatedAt: student.teacherCommentUpdatedAt || publishedAt,
                }
              : {}),
            ...(student.photo ? { photo: await prepareParentThumbnail(student.photo) } : {}),
          },
          activities: input.activities
            .filter((activity) => activity.studentId === student.id && activity.weekId === input.week.id)
            .slice(0, 4)
            .map(({ id, title, detail, points, time, tone }) => ({ id, title, detail, points, time, tone })),
        }
      : {
          schemaVersion: 1,
          ownerUid: user.uid,
          portalId: input.portal.publicId,
          active: false,
          student: {
            id: student.id,
            name: '',
            initials: '',
            team: 0,
            role: '',
            score: 0,
            weeklyScore: 0,
            streak: 0,
            attendance: 'present',
            gradient: '',
            parentName: '',
            parentPhone: '',
          },
          activities: [],
        };
    const signature = await sha256(JSON.stringify(baseValue));
    nextSignatures[key] = signature;
    if (previousSignatures[key] !== signature) {
      changedDocuments.push({ key, value: { ...baseValue, updatedAt: serverTimestamp() } });
    }
  }

  await setDoc(publicPortalRef(input.portal.publicId), portalRecord);

  const staleKeys = Object.keys(previousSignatures).filter((key) => !nextSignatures[key]);
  const operations: ({ type: 'set'; key: string; value: (typeof changedDocuments)[number]['value'] } | { type: 'delete'; key: string })[] = [
    ...changedDocuments.map(({ key, value }) => ({ type: 'set' as const, key, value })),
    ...staleKeys.map((key) => ({ type: 'delete' as const, key })),
  ];

  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(db);
    operations.slice(index, index + 400).forEach((operation) => {
      const reference = publicStudentRef(input.portal.publicId, operation.key);
      if (operation.type === 'set') batch.set(reference, operation.value);
      else batch.delete(reference);
    });
    await batch.commit();
  }

  await setDoc(privateRef, {
    ownerUid: user.uid,
    publicId: input.portal.publicId,
    studentSignatures: nextSignatures,
    studentCount: Object.keys(nextSignatures).length,
    lastPublishedAt: publishedAt,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return {
    publishedAt,
    changed: changedDocuments.length,
    removed: staleKeys.length,
    total: Object.keys(nextSignatures).length,
  };
}

export async function setPublicPortalEnabled(publicId: string, enabled: boolean) {
  const user = auth.currentUser;
  if (!user) throw new Error('FIREBASE_SIGN_IN_REQUIRED');
  await setDoc(publicPortalRef(publicId), { enabled, ownerUid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fetchPublicPortal(publicId: string) {
  const snapshot = await getDoc(publicPortalRef(publicId));
  if (!snapshot.exists()) return null;
  const value = snapshot.data() as Partial<PublicPortalRecord>;
  if (value.schemaVersion !== 1 || value.publicId !== publicId || typeof value.enabled !== 'boolean' || !value.week || !value.scoring) return null;
  return value as PublicPortalRecord;
}

export async function fetchPublicStudent(publicId: string, code: string) {
  const key = await studentDocumentKey(publicId, code);
  const snapshot = await getDoc(publicStudentRef(publicId, key));
  if (!snapshot.exists()) return null;
  const value = snapshot.data() as Partial<PublicStudentRecord>;
  if (value.schemaVersion !== 1 || value.portalId !== publicId || value.active !== true || !value.student || !Array.isArray(value.activities)) return null;
  return value as PublicStudentRecord;
}
