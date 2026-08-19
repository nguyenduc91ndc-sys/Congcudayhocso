import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Laptop,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  deleteHappyClassAccess,
  editHappyClassAccess,
  grantHappyClassAccess,
  grantHappyClassAccessBulk,
  isHappyClassAdminEmail,
  normalizeHappyClassEmail,
  removeHappyClassDevice,
  resetHappyClassDevices,
  signInFirebaseTeacher,
  setHappyClassAccessActive,
  subscribeHappyClassAccess,
  watchFirebaseTeacher,
  type HappyClassAccessInput,
  type HappyClassAccessRecord,
} from './happy-class/firebase';

type Filter = 'all' | 'active' | 'revoked';

const EMPTY_FORM: HappyClassAccessInput = { name: '', email: '', school: '', note: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type AccessMailDraft = {
  recipients: string[];
  subject: string;
  body: string;
};

function createAccessMailDraft(entries: HappyClassAccessInput[]): AccessMailDraft {
  const recipients = Array.from(new Set(entries.map((entry) => normalizeHappyClassEmail(entry.email)).filter(Boolean)));
  const singleName = entries.length === 1 ? String(entries[0].name || '').trim() : '';
  const greeting = singleName ? `Kính gửi Thầy/Cô ${singleName},` : 'Kính gửi Quý Thầy/Cô,';
  return {
    recipients,
    subject: 'Thông báo cấp quyền truy cập Lớp Hạnh Phúc',
    body: `${greeting}\n\nThầy/Cô đã được cấp quyền truy cập ứng dụng Lớp Hạnh Phúc trên GIAOVIENCN.\n\nVui lòng đăng nhập bằng đúng tài khoản Gmail được cấp quyền để sử dụng ứng dụng. Mỗi tài khoản được sử dụng tối đa trên 2 thiết bị.\n\nMở ứng dụng tại: https://giaoviencn.io.vn/lop-hanh-phuc\n\nTrân trọng,\nGIAOVIENCN`,
  };
}

function createPreviewRecords(): HappyClassAccessRecord[] {
  const now = Date.now();
  const isoBefore = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString();
  return [
    {
      email: 'minhanh.gv@example.com',
      name: 'Nguyễn Minh Anh',
      school: 'Trường Tiểu học Hạnh Phúc',
      note: 'Đăng ký từ biểu mẫu',
      active: true,
      devices: {
        'preview-laptop': { id: 'preview-laptop', label: 'Google Chrome · Windows', browser: 'Google Chrome', platform: 'Windows', createdAt: isoBefore(2880), lastSeenAt: isoBefore(8) },
        'preview-phone': { id: 'preview-phone', label: 'Google Chrome · Android', browser: 'Google Chrome', platform: 'Android', createdAt: isoBefore(1440), lastSeenAt: isoBefore(42) },
      },
      createdAt: isoBefore(4320),
      updatedAt: isoBefore(8),
      grantedBy: 'ducnguyen.giaovien@gmail.com',
      lastAccessAt: isoBefore(8),
    },
    {
      email: 'thuyduong.gv@example.com',
      name: 'Trần Thùy Dương',
      school: 'Trường Tiểu học Ánh Dương',
      note: 'Đang tạm khóa để minh họa',
      active: false,
      devices: {
        'preview-edge': { id: 'preview-edge', label: 'Microsoft Edge · Windows', browser: 'Microsoft Edge', platform: 'Windows', createdAt: isoBefore(10080), lastSeenAt: isoBefore(1540) },
      },
      createdAt: isoBefore(12960),
      updatedAt: isoBefore(720),
      grantedBy: 'ducnguyen.giaovien@gmail.com',
      lastAccessAt: isoBefore(1540),
      revokedAt: isoBefore(720),
    },
    {
      email: 'hoangnam.gv@example.com',
      name: 'Lê Hoàng Nam',
      school: 'Trường Tiểu học Bình Minh',
      note: '',
      active: true,
      devices: {},
      createdAt: isoBefore(180),
      updatedAt: isoBefore(180),
      grantedBy: 'nguyenduc91ndc@gmail.com',
    },
  ];
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function parseBulkText(text: string) {
  const entries = new Map<string, HappyClassAccessInput>();
  const errors: { line: number; value: string }[] = [];
  let duplicates = 0;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (!emailMatch) {
      errors.push({ line: index + 1, value: line });
      return;
    }
    const email = normalizeHappyClassEmail(emailMatch[0]);
    if (!EMAIL_PATTERN.test(email)) {
      errors.push({ line: index + 1, value: line });
      return;
    }

    const parts = line
      .split(/\t|,|;|\|/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => normalizeHappyClassEmail(item) !== email);
    const cleaned = parts
      .map((item) => item.replace(emailMatch[0], '').trim())
      .filter(Boolean)
      .filter((item) => !/^email(?:\s+google|\s+gmail)?$/i.test(item))
      .filter((item) => !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/i.test(item))
      .filter((item) => !/^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/i.test(item));
    const name = cleaned[0] || '';
    const school = cleaned[1] || '';
    if (entries.has(email)) duplicates += 1;
    entries.set(email, { email, name, school });
  });

  return { entries: Array.from(entries.values()), errors, duplicates };
}

function messageFromError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('resource-exhausted') || message.includes('quota-exceeded')) return 'Firebase Lớp Hạnh Phúc đã chạm hạn mức miễn phí. Hãy mở trang Usage để kiểm tra; GIAOVIENCN chính không bị ảnh hưởng.';
  if (message.includes('permission-denied')) return 'Firebase đang từ chối quyền quản trị. Hãy đăng nhập đúng email Admin và kiểm tra Firestore Rules.';
  if (message === 'ACCESS_EMAIL_EXISTS') return 'Email mới đã có trong danh sách.';
  if (message === 'HAPPY_CLASS_ADMIN_REQUIRED') return 'Chỉ email Admin GIAOVIENCN mới được quản lý danh sách này.';
  return 'Thao tác chưa hoàn tất. Hãy kiểm tra Internet rồi thử lại.';
}

export default function HappyClassAccessAdmin({ adminEmail }: { adminEmail?: string }) {
  const [firebaseEmail, setFirebaseEmail] = useState('');
  const [records, setRecords] = useState<HappyClassAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accessMailDraft, setAccessMailDraft] = useState<AccessMailDraft | null>(null);
  const [singleForm, setSingleForm] = useState<HappyClassAccessInput>(EMPTY_FORM);
  const [bulkText, setBulkText] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<HappyClassAccessRecord | null>(null);
  const [editForm, setEditForm] = useState<HappyClassAccessInput>(EMPTY_FORM);
  const [expandedEmail, setExpandedEmail] = useState('');
  const [singleOpen, setSingleOpen] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(true);
  const accessMailDraftRef = useRef<HTMLElement | null>(null);

  const normalizedAdminEmail = normalizeHappyClassEmail(adminEmail || '');
  const isLocalPreviewHost = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isDevPreview = isLocalPreviewHost && !isHappyClassAdminEmail(normalizedAdminEmail);
  const firebaseConnected = Boolean(firebaseEmail && firebaseEmail === normalizedAdminEmail && isHappyClassAdminEmail(firebaseEmail));
  const connected = firebaseConnected || isDevPreview;
  const bulkPreview = useMemo(() => parseBulkText(bulkText), [bulkText]);
  const existingBulkCount = useMemo(() => {
    const existing = new Set(records.map((record) => record.email));
    return bulkPreview.entries.filter((entry) => existing.has(entry.email)).length;
  }, [bulkPreview.entries, records]);

  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi-VN');
    return records.filter((record) => {
      if (filter === 'active' && !record.active) return false;
      if (filter === 'revoked' && record.active) return false;
      if (!needle) return true;
      return `${record.name} ${record.email} ${record.school} ${record.note}`.toLocaleLowerCase('vi-VN').includes(needle);
    });
  }, [filter, query, records]);

  useEffect(() => {
    return watchFirebaseTeacher((user) => setFirebaseEmail(normalizeHappyClassEmail(user?.email || '')));
  }, []);

  useEffect(() => {
    if (isDevPreview) {
      setRecords(createPreviewRecords());
      setLoading(false);
      return;
    }
    if (!connected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    return subscribeHappyClassAccess((nextRecords) => {
      setRecords(nextRecords);
      setLoading(false);
    }, (nextError) => {
      setError(messageFromError(nextError));
      setLoading(false);
    });
  }, [connected, isDevPreview]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!accessMailDraft) return;
    const frame = window.requestAnimationFrame(() => accessMailDraftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => window.cancelAnimationFrame(frame);
  }, [accessMailDraft]);

  const submitSingle = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = normalizeHappyClassEmail(singleForm.email);
    if (!EMAIL_PATTERN.test(email)) {
      setError('Email Google chưa đúng định dạng.');
      return;
    }
    if (isDevPreview) {
      const timestamp = new Date().toISOString();
      setRecords((current) => {
        const previous = current.find((record) => record.email === email);
        const next: HappyClassAccessRecord = {
          email,
          name: singleForm.name?.trim() || previous?.name || '',
          school: singleForm.school?.trim() || previous?.school || '',
          note: singleForm.note?.trim() || previous?.note || '',
          active: true,
          devices: previous?.devices || {},
          createdAt: previous?.createdAt || timestamp,
          updatedAt: timestamp,
          grantedBy: 'admin-preview@giaoviencn.local',
          ...(previous?.lastAccessAt ? { lastAccessAt: previous.lastAccessAt } : {}),
        };
        return [next, ...current.filter((record) => record.email !== email)];
      });
      setAccessMailDraft(createAccessMailDraft([{ ...singleForm, email }]));
      setSingleForm(EMPTY_FORM);
      setError('');
      setNotice(`Đã mô phỏng cấp quyền cho ${email} và tạo sẵn nội dung thông báo.`);
      return;
    }
    setWorking('single');
    setError('');
    try {
      await grantHappyClassAccess({ ...singleForm, email });
      setAccessMailDraft(createAccessMailDraft([{ ...singleForm, email }]));
      setSingleForm(EMPTY_FORM);
      setNotice(`Đã cấp quyền cho ${email}. Nội dung Gmail đã được soạn sẵn bên dưới.`);
    } catch (nextError) {
      setError(messageFromError(nextError));
    } finally {
      setWorking('');
    }
  };

  const submitBulk = async () => {
    if (!bulkPreview.entries.length) {
      setError('Chưa tìm thấy email hợp lệ trong danh sách dán.');
      return;
    }
    if (isDevPreview) {
      const timestamp = new Date().toISOString();
      setRecords((current) => {
        const next = [...current];
        bulkPreview.entries.forEach((entry) => {
          const email = normalizeHappyClassEmail(entry.email);
          const index = next.findIndex((record) => record.email === email);
          const previous = index >= 0 ? next[index] : undefined;
          const value: HappyClassAccessRecord = {
            email,
            name: entry.name?.trim() || previous?.name || '',
            school: entry.school?.trim() || previous?.school || '',
            note: entry.note?.trim() || previous?.note || '',
            active: true,
            devices: previous?.devices || {},
            createdAt: previous?.createdAt || timestamp,
            updatedAt: timestamp,
            grantedBy: 'admin-preview@giaoviencn.local',
            ...(previous?.lastAccessAt ? { lastAccessAt: previous.lastAccessAt } : {}),
          };
          if (index >= 0) next[index] = value;
          else next.unshift(value);
        });
        return next;
      });
      setAccessMailDraft(createAccessMailDraft(bulkPreview.entries));
      setBulkText('');
      setError('');
      setNotice(`Đã mô phỏng cấp quyền ${bulkPreview.entries.length} email và tạo sẵn nội dung thông báo.`);
      return;
    }
    setWorking('bulk');
    setError('');
    try {
      await grantHappyClassAccessBulk(bulkPreview.entries);
      const grantedEntries = [...bulkPreview.entries];
      setAccessMailDraft(createAccessMailDraft(grantedEntries));
      setBulkText('');
      setNotice(`Đã cấp quyền ${grantedEntries.length} email. Nội dung Gmail đã được soạn sẵn bên dưới.`);
    } catch (nextError) {
      setError(messageFromError(nextError));
    } finally {
      setWorking('');
    }
  };

  const pasteBulkFromClipboard = async () => {
    setError('');
    try {
      const value = await navigator.clipboard.readText();
      if (!value.trim()) {
        setError('Bộ nhớ tạm chưa có nội dung để dán.');
        return;
      }
      setBulkText(value);
    } catch {
      setError('Trình duyệt chưa cho phép đọc bộ nhớ tạm. Hãy bấm vào ô rồi nhấn Ctrl+V.');
    }
  };

  const copyMailDraft = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setError('');
      setNotice(`Đã copy ${label}.`);
    } catch {
      setError(`Trình duyệt chưa cho phép copy ${label}. Hãy chọn nội dung và nhấn Ctrl+C.`);
    }
  };

  const openGmailDraft = () => {
    if (!accessMailDraft) return;
    const url = new URL('https://mail.google.com/mail/');
    url.searchParams.set('view', 'cm');
    url.searchParams.set('fs', '1');
    if (accessMailDraft.recipients.length === 1) url.searchParams.set('to', accessMailDraft.recipients[0]);
    else url.searchParams.set('bcc', accessMailDraft.recipients.join(','));
    url.searchParams.set('su', accessMailDraft.subject);
    url.searchParams.set('body', accessMailDraft.body);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const runRecordAction = async (key: string, action: () => Promise<void>, success: string, previewAction?: () => void) => {
    if (isDevPreview) {
      previewAction?.();
      setError('');
      setNotice(`${success} (mô phỏng)`);
      return;
    }
    setWorking(key);
    setError('');
    try {
      await action();
      setNotice(success);
    } catch (nextError) {
      setError(messageFromError(nextError));
    } finally {
      setWorking('');
    }
  };

  const toggleRecordAccess = async (record: HappyClassAccessRecord) => {
    const nextActive = !record.active;
    if (isDevPreview) {
      setRecords((current) => current.map((item) => item.email === record.email
        ? { ...item, active: nextActive, updatedAt: new Date().toISOString(), ...(nextActive ? { revokedAt: undefined } : { revokedAt: new Date().toISOString() }) }
        : item));
      if (nextActive) setAccessMailDraft(createAccessMailDraft([{ email: record.email, name: record.name, school: record.school }]));
      setError('');
      setNotice(nextActive ? 'Đã mô phỏng cấp lại quyền và tạo sẵn nội dung thông báo.' : 'Đã thu hồi quyền. (mô phỏng)');
      return;
    }

    setWorking(`active:${record.email}`);
    setError('');
    try {
      await setHappyClassAccessActive(record.email, nextActive);
      if (!nextActive) {
        setNotice('Đã thu hồi quyền.');
      } else {
        setAccessMailDraft(createAccessMailDraft([{ email: record.email, name: record.name, school: record.school }]));
        setNotice(`Đã cấp lại quyền cho ${record.email}. Nội dung Gmail đã được soạn sẵn bên dưới.`);
      }
    } catch (nextError) {
      setError(messageFromError(nextError));
    } finally {
      setWorking('');
    }
  };

  const startEdit = (record: HappyClassAccessRecord) => {
    setEditing(record);
    setEditForm({ email: record.email, name: record.name, school: record.school, note: record.note });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !EMAIL_PATTERN.test(normalizeHappyClassEmail(editForm.email))) {
      setError('Email Google chưa đúng định dạng.');
      return;
    }
    await runRecordAction(`edit:${editing.email}`, async () => {
      await editHappyClassAccess(editing.email, editForm);
      setEditing(null);
    }, 'Đã cập nhật thông tin giáo viên.', () => {
      const originalEmail = editing.email;
      const nextEmail = normalizeHappyClassEmail(editForm.email);
      setRecords((current) => current.map((record) => record.email === originalEmail
        ? { ...record, ...editForm, email: nextEmail, updatedAt: new Date().toISOString() }
        : record));
      setEditing(null);
    });
  };

  const connectAdminFirebase = async () => {
    if (!isHappyClassAdminEmail(normalizedAdminEmail)) {
      setError('Tài khoản GIAOVIENCN hiện tại không thuộc danh sách Admin Lớp Hạnh Phúc.');
      return;
    }
    setWorking('connect-admin');
    setError('');
    try {
      const user = await signInFirebaseTeacher();
      const connectedEmail = normalizeHappyClassEmail(user.email || '');
      if (connectedEmail !== normalizedAdminEmail) {
        setError(`Bạn vừa chọn ${connectedEmail || 'một tài khoản khác'}. Hãy kết nối lại bằng ${normalizedAdminEmail}.`);
        return;
      }
      setFirebaseEmail(connectedEmail);
      setNotice('Đã kết nối Firebase Lớp Hạnh Phúc.');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : '';
      if (message.includes('popup-closed-by-user')) setError('Bạn đã đóng cửa sổ Google trước khi hoàn tất. Hãy nhấn kết nối và thử lại.');
      else if (message.includes('popup-blocked')) setError('Trình duyệt đang chặn cửa sổ Google. Hãy cho phép cửa sổ bật lên rồi thử lại.');
      else if (message.includes('unauthorized-domain')) setError('Tên miền giaoviencn.io.vn chưa được Firebase cho phép đăng nhập.');
      else setError('Chưa thể kết nối Firebase. Hãy kiểm tra Internet rồi thử lại.');
    } finally {
      setWorking('');
    }
  };

  if (!connected) {
    return (
      <div className="h-full overflow-y-auto rounded-2xl bg-gradient-to-br from-violet-50 via-white to-rose-50 p-4 sm:p-8">
        <div className="mx-auto max-w-xl rounded-[28px] border border-purple-100 bg-white p-6 text-center shadow-xl sm:p-9">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-lg"><ShieldCheck size={38} /></span>
          <h2 className="mt-5 text-2xl font-black text-purple-950">Phiên Admin chưa được đồng bộ</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">GIAOVIENCN và Firebase Lớp Hạnh Phúc dùng hai kho xác thực riêng. Admin chỉ cần kết nối Gmail một lần trên trình duyệt này; những lần sau hệ thống sẽ tự ghi nhớ.</p>
          <div className="mt-5 rounded-2xl bg-purple-50 p-4 text-sm"><span className="block text-xs font-bold uppercase tracking-wider text-purple-500">Email GIAOVIENCN hiện tại</span><strong className="mt-1 block break-all text-purple-900">{normalizedAdminEmail || 'Chưa đăng nhập GIAOVIENCN'}</strong>{firebaseEmail && <small className="mt-2 block text-rose-600">Phiên Firebase cũ đang dùng: {firebaseEmail}</small>}</div>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button type="button" disabled={working === 'connect-admin'} onClick={() => void connectAdminFirebase()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-3 text-sm font-black text-white shadow-[0_5px_0_#701b86,0_10px_24px_rgba(111,29,134,.22)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
            {working === 'connect-admin' ? <Loader2 className="animate-spin" size={19} /> : <ShieldCheck size={19} />}
            {working === 'connect-admin' ? 'Đang kết nối…' : 'Kết nối một lần bằng Gmail Admin'}
          </button>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">Chọn đúng Gmail <strong>{normalizedAdminEmail}</strong> trong cửa sổ Google. Không cần đăng xuất khỏi GIAOVIENCN.</p>
        </div>
      </div>
    );
  }

  const activeCount = records.filter((record) => record.active).length;
  const fullDeviceCount = records.filter((record) => Object.keys(record.devices || {}).length >= 2).length;
  const accessedRecords = records.filter((record) => Boolean(record.lastAccessAt));
  const now = Date.now();
  const todayKey = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const accessedTodayCount = accessedRecords.filter((record) => {
    const value = new Date(record.lastAccessAt || '');
    return !Number.isNaN(value.getTime())
      && value.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }) === todayKey;
  }).length;
  const accessedLast7DaysCount = accessedRecords.filter((record) => {
    const time = new Date(record.lastAccessAt || '').getTime();
    return Number.isFinite(time) && time >= now - 7 * 24 * 60 * 60 * 1000;
  }).length;
  const rememberedDeviceCount = records.reduce((total, record) => total + Object.keys(record.devices || {}).length, 0);
  const recentAccessRecords = [...accessedRecords]
    .sort((a, b) => new Date(b.lastAccessAt || '').getTime() - new Date(a.lastAccessAt || '').getTime())
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto rounded-2xl bg-gradient-to-br from-violet-50 via-white to-rose-50 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl space-y-4 pb-8">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-400 p-5 text-white shadow-lg sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><span className="text-xs font-black uppercase tracking-[.18em] text-yellow-200">Quản trị ứng dụng</span><h2 className="mt-1 text-2xl font-black sm:text-3xl">Quyền truy cập Lớp Hạnh Phúc</h2><p className="mt-2 text-sm font-semibold text-white/85">Cấp theo email Google, tối đa hai thiết bị cho mỗi giáo viên.</p></div>
            <div className="rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm backdrop-blur"><span className="block text-[10px] font-black uppercase tracking-wider text-white/60">Firebase riêng</span><strong>lop-hanh-phuc-c57b3</strong></div>
          </div>
        </header>

        {isDevPreview && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
            Chế độ xem thử giao diện · Không đọc hoặc thay đổi dữ liệu Firebase thật. Đăng nhập bằng Gmail Admin để quản lý danh sách cấp quyền.
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border-[3px] border-yellow-300 bg-white shadow-[0_6px_0_#7b2697]">
          <div className="flex flex-col gap-2 bg-gradient-to-r from-[#9f35d1] via-[#df43a3] to-[#ff8052] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-200">Thống kê từ Firebase Lớp Hạnh Phúc</span>
              <h3 className="mt-1 text-xl font-black">Giáo viên truy cập gần đây</h3>
            </div>
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold">Không phát sinh lượt ghi thống kê riêng</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-3"><strong className="block text-2xl font-black text-fuchsia-700">{accessedRecords.length}</strong><span className="text-xs font-bold text-slate-600">Đã từng truy cập</span></div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3"><strong className="block text-2xl font-black text-orange-600">{accessedTodayCount}</strong><span className="text-xs font-bold text-slate-600">Truy cập hôm nay</span></div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3"><strong className="block text-2xl font-black text-purple-700">{accessedLast7DaysCount}</strong><span className="text-xs font-bold text-slate-600">Trong 7 ngày</span></div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3"><strong className="block text-2xl font-black text-emerald-700">{rememberedDeviceCount}</strong><span className="text-xs font-bold text-slate-600">Thiết bị đã nhớ</span></div>
          </div>
          <div className="border-t border-purple-100 px-4 pb-4 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm font-black text-purple-950">Tài khoản vào gần nhất</strong><small className="font-bold text-slate-400">Tối đa 5 giáo viên</small></div>
            {recentAccessRecords.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-purple-100 bg-purple-50/50 px-4 py-5 text-center text-sm font-bold text-purple-400">Chưa có giáo viên được cấp quyền truy cập.</div>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {recentAccessRecords.map((record) => (
                  <div key={`recent-${record.email}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-orange-400 text-xs font-black text-white">{(record.name || record.email).trim().charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-purple-950">{record.name || record.email}</strong><small className="block truncate font-semibold text-slate-500">{record.email}</small></span>
                    <span className="flex-none text-right"><strong className="block text-[11px] text-fuchsia-700">{formatDate(record.lastAccessAt)}</strong><small className="font-bold text-slate-400">{Object.keys(record.devices || {}).length}/2 thiết bị</small></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold text-emerald-800">Spark miễn phí · Dữ liệu quyền và thiết bị được lưu ở Firebase Lớp Hạnh Phúc riêng.</span>
          <a href="https://console.firebase.google.com/project/lop-hanh-phuc-c57b3/usage" target="_blank" rel="noopener noreferrer" className="shrink-0 font-black text-emerald-700 underline">Kiểm tra hạn mức Firebase</a>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-2xl border border-purple-100 bg-white p-3 shadow-sm sm:p-4"><Users className="text-purple-600" size={21} /><strong className="mt-2 block text-2xl text-purple-950">{records.length}</strong><span className="text-xs font-bold text-slate-500">Tổng email</span></div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-4"><CheckCircle2 className="text-emerald-600" size={21} /><strong className="mt-2 block text-2xl text-emerald-800">{activeCount}</strong><span className="text-xs font-bold text-slate-500">Đang có quyền</span></div>
          <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm sm:p-4"><Laptop className="text-orange-500" size={21} /><strong className="mt-2 block text-2xl text-orange-700">{fullDeviceCount}</strong><span className="text-xs font-bold text-slate-500">Đủ 2 thiết bị</span></div>
        </div>

        {(error || notice) && <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

        {accessMailDraft && (
          <section ref={accessMailDraftRef} className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm ring-4 ring-emerald-100 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-black text-purple-950">Thông báo quyền truy cập</h3><p className="mt-1 text-sm font-semibold text-slate-500">Đã soạn sẵn cho {accessMailDraft.recipients.length} người nhận. Admin có thể copy hoặc mở Gmail để tự gửi.</p></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Cấp quyền</span><button type="button" title="Đóng thông báo" onClick={() => setAccessMailDraft(null)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"><X size={16} /></button></div>
            </div>
            <label className="mt-4 block text-sm font-black text-slate-700">Người nhận</label>
            <textarea readOnly rows={Math.min(4, Math.max(2, accessMailDraft.recipients.length))} value={accessMailDraft.recipients.join('\n')} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none" />
            <label className="mt-3 block text-sm font-black text-slate-700">Nội dung</label>
            <textarea readOnly rows={9} value={`${accessMailDraft.subject}\n\n${accessMailDraft.body}`} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-6 text-slate-800 outline-none" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyMailDraft(accessMailDraft.recipients.join(', '), 'email')} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-50"><Copy size={16} /> Copy email</button>
              <button type="button" onClick={() => void copyMailDraft(`${accessMailDraft.subject}\n\n${accessMailDraft.body}`, 'nội dung')} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-50"><Copy size={16} /> Copy nội dung</button>
              <button type="button" onClick={openGmailDraft} className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-200"><Mail size={17} /> Mở Gmail</button>
            </div>
            {accessMailDraft.recipients.length > 1 && <p className="mt-3 text-xs font-semibold text-slate-500">Khi mở Gmail, danh sách nhiều người nhận được đặt ở BCC để các giáo viên không nhìn thấy email của nhau.</p>}
          </section>
        )}

        <section className="rounded-3xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
          <button onClick={() => setSingleOpen((value) => !value)} className="flex w-full items-center justify-between text-left"><span><strong className="block text-lg text-purple-950">Cấp quyền một giáo viên</strong><small className="font-semibold text-slate-500">Thêm mới hoặc mở lại quyền bằng email Google</small></span>{singleOpen ? <ChevronUp /> : <ChevronDown />}</button>
          {singleOpen && (
            <form onSubmit={submitSingle} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required value={singleForm.name || ''} onChange={(event) => setSingleForm((value) => ({ ...value, name: event.target.value }))} placeholder="Họ tên giáo viên" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" />
              <input required type="email" value={singleForm.email} onChange={(event) => setSingleForm((value) => ({ ...value, email: event.target.value }))} placeholder="Email Google đăng nhập" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" />
              <input value={singleForm.school || ''} onChange={(event) => setSingleForm((value) => ({ ...value, school: event.target.value }))} placeholder="Trường/đơn vị (không bắt buộc)" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" />
              <input value={singleForm.note || ''} onChange={(event) => setSingleForm((value) => ({ ...value, note: event.target.value }))} placeholder="Ghi chú (không bắt buộc)" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" />
              <p className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 sm:col-span-2"><Mail size={16} /> Sau khi cấp quyền, hệ thống sẽ soạn sẵn thông báo để Admin copy hoặc mở Gmail gửi thủ công.</p>
              <button disabled={working === 'single'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 font-black text-white shadow sm:col-span-2 disabled:opacity-50">{working === 'single' ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} Cấp quyền email</button>
            </form>
          )}
        </section>

        <section className="rounded-3xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
          <button onClick={() => setBulkOpen((value) => !value)} className="flex w-full items-center justify-between text-left"><span><strong className="block text-lg text-purple-950">Cấp quyền hàng loạt</strong><small className="font-semibold text-slate-500">Sao chép từ Google Form, Excel hoặc Google Sheets rồi dán vào đây</small></span>{bulkOpen ? <ChevronUp /> : <ChevronDown />}</button>
          {bulkOpen && (
            <div className="mt-4">
              <div className="mb-2 flex justify-end"><button type="button" onClick={() => void pasteBulkFromClipboard()} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100"><Copy size={15} /> Dán từ bộ nhớ tạm</button></div>
              <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} rows={7} placeholder={'Nguyễn Văn A, nguyenvana@gmail.com, Trường Tiểu học A\nTrần Thị B\ttranthib@gmail.com\nleminhc@gmail.com'} className="w-full resize-y rounded-2xl border-2 border-slate-100 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-400" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700">{bulkPreview.entries.length} email hợp lệ</span><span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">{existingBulkCount} đã có</span><span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">{bulkPreview.duplicates} trùng trong nội dung</span><span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700">{bulkPreview.errors.length} dòng lỗi</span></div>
              {bulkPreview.errors.length > 0 && <p className="mt-2 text-xs font-semibold text-red-600">Kiểm tra dòng: {bulkPreview.errors.slice(0, 6).map((item) => item.line).join(', ')}{bulkPreview.errors.length > 6 ? '…' : ''}</p>}
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><Mail size={16} /> Sau khi cấp quyền, hệ thống sẽ tạo một thư Gmail dùng BCC cho toàn bộ danh sách.</p>
              <button disabled={working === 'bulk' || !bulkPreview.entries.length} onClick={() => void submitBulk()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-5 py-3 font-black text-white shadow disabled:opacity-50">{working === 'bulk' ? <Loader2 className="animate-spin" size={18} /> : <Copy size={18} />} Xác nhận cấp quyền hàng loạt</button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><strong className="text-lg text-purple-950">Danh sách tài khoản</strong><small className="ml-2 font-bold text-slate-400">{visibleRecords.length}/{records.length}</small></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-slate-100 px-3 py-2 focus-within:border-purple-400 sm:min-w-72"><Search size={18} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, email, trường…" className="min-w-0 flex-1 border-0 text-sm outline-none" />{query && <button onClick={() => setQuery('')}><X size={16} /></button>}</label>
              <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-bold text-purple-800 outline-none"><option value="all">Tất cả</option><option value="active">Đang có quyền</option><option value="revoked">Đã thu hồi</option></select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading && <div className="grid min-h-40 place-items-center"><Loader2 className="animate-spin text-purple-600" size={30} /></div>}
            {!loading && visibleRecords.length === 0 && <div className="rounded-2xl border-2 border-dashed border-purple-100 p-8 text-center text-sm font-bold text-slate-400">Chưa có tài khoản phù hợp.</div>}
            {visibleRecords.map((record) => {
              const devices = Object.values(record.devices || {});
              const expanded = expandedEmail === record.email;
              return (
                <article key={record.email} className={`overflow-hidden rounded-2xl border ${record.active ? 'border-emerald-100 bg-white' : 'border-rose-100 bg-rose-50/40'}`}>
                  <div className="grid gap-3 p-4 lg:grid-cols-[minmax(230px,1.4fr)_minmax(150px,.8fr)_auto] lg:items-center">
                    <div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-sm text-purple-950 sm:text-base">{record.name || 'Chưa nhập họ tên'}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${record.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{record.active ? 'ĐANG CÓ QUYỀN' : 'ĐÃ THU HỒI'}</span></div><span className="mt-1 block break-all text-xs font-bold text-purple-600">{record.email}</span>{record.school && <span className="mt-1 block truncate text-xs text-slate-500">{record.school}</span>}</div>
                    <button onClick={() => setExpandedEmail(expanded ? '' : record.email)} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left"><span><small className="block font-bold text-slate-400">THIẾT BỊ</small><strong className={devices.length >= 2 ? 'text-orange-600' : 'text-slate-700'}>{devices.length}/2 thiết bị</strong></span>{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {record.active && <button title="Soạn thông báo Gmail" onClick={() => { setAccessMailDraft(createAccessMailDraft([{ email: record.email, name: record.name, school: record.school }])); setError(''); setNotice(`Đã soạn thông báo Gmail cho ${record.email}.`); }} className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 hover:bg-emerald-100"><Mail size={17} /></button>}
                      <button title="Chỉnh sửa" onClick={() => startEdit(record)} className="rounded-xl bg-purple-50 p-2.5 text-purple-700 hover:bg-purple-100"><Edit3 size={17} /></button>
                      <button title={record.active ? 'Thu hồi quyền' : 'Cấp lại quyền'} disabled={working === `active:${record.email}`} onClick={() => { if (window.confirm(record.active ? `Thu hồi quyền của ${record.email}?` : `Cấp lại quyền cho ${record.email} và soạn thông báo Gmail?`)) void toggleRecordAccess(record); }} className={`rounded-xl p-2.5 ${record.active ? 'bg-amber-50 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{record.active ? <ShieldOff size={17} /> : <ShieldCheck size={17} />}</button>
                      <button title="Đặt lại thiết bị" disabled={!devices.length || working === `reset:${record.email}`} onClick={() => { if (window.confirm(`Xóa toàn bộ ${devices.length} thiết bị của ${record.email}?`)) void runRecordAction(`reset:${record.email}`, () => resetHappyClassDevices(record.email), 'Đã đặt lại danh sách thiết bị.', () => setRecords((current) => current.map((item) => item.email === record.email ? { ...item, devices: {}, updatedAt: new Date().toISOString() } : item))); }} className="rounded-xl bg-blue-50 p-2.5 text-blue-700 disabled:opacity-35"><RotateCcw size={17} /></button>
                      <button title="Xóa hoàn toàn" disabled={working === `delete:${record.email}`} onClick={() => { if (window.confirm(`Xóa hoàn toàn ${record.email}? Thao tác này không thể hoàn tác.`)) void runRecordAction(`delete:${record.email}`, () => deleteHappyClassAccess(record.email), 'Đã xóa tài khoản.', () => setRecords((current) => current.filter((item) => item.email !== record.email))); }} className="rounded-xl bg-red-50 p-2.5 text-red-600 hover:bg-red-100"><Trash2 size={17} /></button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                      <div className="mb-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><span>Cấp: <strong>{formatDate(record.createdAt)}</strong></span><span>Truy cập: <strong>{formatDate(record.lastAccessAt)}</strong></span><span>Ghi chú: <strong>{record.note || 'Không có'}</strong></span></div>
                      {devices.length === 0 ? <p className="text-xs font-bold text-slate-400">Giáo viên chưa đăng ký thiết bị nào.</p> : <div className="grid gap-2 sm:grid-cols-2">{devices.map((device, index) => <div key={device.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Laptop size={18} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-xs">Thiết bị {index + 1} · {device.label}</strong><small className="block text-[10px] text-slate-400">Lần cuối: {formatDate(device.lastSeenAt)}</small></div><button title="Xóa thiết bị này" onClick={() => { if (window.confirm(`Xóa ${device.label} khỏi ${record.email}?`)) void runRecordAction(`device:${device.id}`, () => removeHappyClassDevice(record.email, device.id), 'Đã xóa thiết bị.', () => setRecords((current) => current.map((item) => { if (item.email !== record.email) return item; const nextDevices = { ...item.devices }; delete nextDevices[device.id]; return { ...item, devices: nextDevices, updatedAt: new Date().toISOString() }; }))); }} className="rounded-lg bg-red-50 p-2 text-red-500"><Trash2 size={15} /></button></div>)}</div>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={() => setEditing(null)}>
          <form onSubmit={saveEdit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between"><div><span className="text-xs font-black uppercase tracking-wider text-purple-500">Chỉnh sửa tài khoản</span><h3 className="text-xl font-black text-purple-950">Thông tin cấp quyền</h3></div><button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 p-2"><X size={18} /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><input required value={editForm.name || ''} onChange={(event) => setEditForm((value) => ({ ...value, name: event.target.value }))} placeholder="Họ tên" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" /><input required type="email" value={editForm.email} onChange={(event) => setEditForm((value) => ({ ...value, email: event.target.value }))} placeholder="Email Google" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" /><input value={editForm.school || ''} onChange={(event) => setEditForm((value) => ({ ...value, school: event.target.value }))} placeholder="Trường/đơn vị" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" /><input value={editForm.note || ''} onChange={(event) => setEditForm((value) => ({ ...value, note: event.target.value }))} placeholder="Ghi chú" className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-purple-400" /></div>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Nếu đổi email, giáo viên phải đăng nhập bằng đúng email mới. Hai thiết bị đã ghi nhớ vẫn được giữ lại.</p>
            <button disabled={working.startsWith('edit:')} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{working.startsWith('edit:') ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Lưu thay đổi</button>
          </form>
        </div>
      )}
    </div>
  );
}
