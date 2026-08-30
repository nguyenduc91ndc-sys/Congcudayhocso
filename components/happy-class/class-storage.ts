const DATABASE_NAME = 'giaoviencn-happy-class-local';
const DATABASE_VERSION = 1;
const CLASS_STORE = 'classes';
const SETTINGS_STORE = 'settings';

export const MAX_ACTIVE_CLASSES = 30;

export type LocalClassProfile = {
  name: string;
  code: string;
  schoolYear: string;
  subject?: string;
  teamCount: number;
  teamScoringMode?: 'total' | 'average';
};

export type LocalClassRecord<TData> = {
  key: string;
  id: string;
  teacherKey: string;
  profile: LocalClassProfile;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  data: TData;
};

export type LocalClassSummary = Omit<LocalClassRecord<never>, 'data'>;

export type LocalWorkspaceSettings = {
  teacherKey: string;
  activeClassId?: string;
  lastBackupAt?: string;
  lastBackupReminderAt?: string;
};

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể truy cập kho dữ liệu trên máy.'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Không thể lưu dữ liệu trên máy.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Thao tác lưu dữ liệu đã bị hủy.'));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Trình duyệt này không hỗ trợ kho dữ liệu IndexedDB.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CLASS_STORE)) {
        const store = database.createObjectStore(CLASS_STORE, { keyPath: 'key' });
        store.createIndex('teacherKey', 'teacherKey', { unique: false });
        store.createIndex('teacherUpdatedAt', ['teacherKey', 'updatedAt'], { unique: false });
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'teacherKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể mở kho dữ liệu trên máy.'));
    request.onblocked = () => reject(new Error('Kho dữ liệu đang được mở ở một thẻ khác. Hãy đóng thẻ cũ rồi thử lại.'));
  });
}

export function createLocalClassId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `class-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLocalClassKey(teacherKey: string, classId: string) {
  return `${teacherKey}::${classId}`;
}

export function toLocalClassSummary<TData>(record: LocalClassRecord<TData>): LocalClassSummary {
  const { data: _data, ...summary } = record;
  return summary;
}

export async function listLocalClasses<TData>(teacherKey: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(CLASS_STORE, 'readonly');
    const index = transaction.objectStore(CLASS_STORE).index('teacherKey');
    const records = await requestResult(index.getAll(IDBKeyRange.only(teacherKey)) as IDBRequest<LocalClassRecord<TData>[]>);
    await transactionDone(transaction);
    return records.sort((left, right) => {
      if (left.archived !== right.archived) return left.archived ? 1 : -1;
      return left.profile.code.localeCompare(right.profile.code, 'vi', { numeric: true, sensitivity: 'base' });
    });
  } finally {
    database.close();
  }
}

export async function loadLocalClass<TData>(teacherKey: string, classId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(CLASS_STORE, 'readonly');
    const record = await requestResult(transaction.objectStore(CLASS_STORE).get(createLocalClassKey(teacherKey, classId)) as IDBRequest<LocalClassRecord<TData> | undefined>);
    await transactionDone(transaction);
    return record;
  } finally {
    database.close();
  }
}

export async function saveLocalClass<TData>(record: LocalClassRecord<TData>) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(CLASS_STORE, 'readwrite');
    transaction.objectStore(CLASS_STORE).put(record);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function deleteLocalClass(teacherKey: string, classId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(CLASS_STORE, 'readwrite');
    transaction.objectStore(CLASS_STORE).delete(createLocalClassKey(teacherKey, classId));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function saveLocalClasses<TData>(records: LocalClassRecord<TData>[]) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(CLASS_STORE, 'readwrite');
    const store = transaction.objectStore(CLASS_STORE);
    records.forEach((record) => store.put(record));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function replaceTeacherClasses<TData>(teacherKey: string, records: LocalClassRecord<TData>[]) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction([CLASS_STORE, SETTINGS_STORE], 'readwrite');
    const classStore = transaction.objectStore(CLASS_STORE);
    const index = classStore.index('teacherKey');
    const keys = await requestResult(index.getAllKeys(IDBKeyRange.only(teacherKey)));
    keys.forEach((key) => classStore.delete(key));
    records.forEach((record) => classStore.put(record));
    transaction.objectStore(SETTINGS_STORE).put({ teacherKey, activeClassId: records.find((item) => !item.archived)?.id ?? records[0]?.id });
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function loadWorkspaceSettings(teacherKey: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(SETTINGS_STORE, 'readonly');
    const settings = await requestResult(transaction.objectStore(SETTINGS_STORE).get(teacherKey) as IDBRequest<LocalWorkspaceSettings | undefined>);
    await transactionDone(transaction);
    return settings ?? { teacherKey };
  } finally {
    database.close();
  }
}

export async function saveWorkspaceSettings(settings: LocalWorkspaceSettings) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
    transaction.objectStore(SETTINGS_STORE).put(settings);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
