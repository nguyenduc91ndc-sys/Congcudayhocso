import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Copy,
  Trash2,
  Download,
  Eye,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  Music2,
  Palette,
  Phone,
  QrCode,
  Save,
  Send,
  Sparkles,
  VolumeX,
  Users
} from 'lucide-react';
import {
  getOnlineInvitation,
  getOnlineInvitationRsvps,
  getUserOnlineInvitations,
  deleteOnlineInvitation,
  saveOnlineInvitation,
  saveOnlineInvitationRsvp,
  updateOnlineInvitation
} from '../utils/firebaseThiepMoiOnline';
import {
  InvitationEventType,
  InvitationFontStyle,
  InvitationRsvp,
  InvitationRsvpOption,
  InvitationThemeId,
  OnlineInvitation,
  RsvpStatus
} from '../types/invitationTypes';

interface ThiepMoiOnlineProps {
  onBack: () => void;
  user?: { email?: string; name?: string; id?: string } | null;
  onRequireLogin?: () => void;
  sharedId?: string | null;
}

interface InvitationTemplate {
  id: InvitationThemeId;
  eventType: InvitationEventType;
  label: string;
  caption: string;
  asset: string;
  accent: string;
  accent2: string;
  ink: string;
  glow: string;
  dark: boolean;
  sample: Partial<OnlineInvitation>;
}

const templates: InvitationTemplate[] = [
  {
    id: 'babyDream',
    eventType: 'baby',
    label: 'Thôi nôi pastel',
    caption: 'Dịu, vui, hợp sinh nhật bé',
    asset: '/thiep-moi-online/assets/baby-dream.svg',
    accent: '#ec4899',
    accent2: '#38bdf8',
    ink: '#5b3654',
    glow: 'rgba(236,72,153,.24)',
    dark: false,
    sample: {
      title: 'Mừng thôi nôi',
      subtitle: 'Một tuổi yêu thương',
      honoredName: 'Bé An Nhiên',
      hostNames: 'Gia đình bé An Nhiên',
      message: 'Trân trọng kính mời quý khách đến chung vui cùng gia đình trong ngày đặc biệt của bé.',
      dressCode: 'Pastel, trắng hoặc hồng nhạt'
    }
  },
  {
    id: 'roseWedding',
    eventType: 'wedding',
    label: 'Cưới hỏi hoa hồng',
    caption: 'Sang trọng, ấm và lãng mạn',
    asset: '/thiep-moi-online/assets/rose-wedding.svg',
    accent: '#be123c',
    accent2: '#d4a84f',
    ink: '#4a1d26',
    glow: 'rgba(190,18,60,.2)',
    dark: false,
    sample: {
      title: 'Lễ Thành Hôn',
      subtitle: 'Save the date',
      honoredName: 'Minh Anh & Hoàng Nam',
      hostNames: 'Hai bên gia đình',
      message: 'Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.',
      dressCode: 'Trang phục lịch sự, màu be hoặc hồng phấn'
    }
  },
  {
    id: 'goldGraduate',
    eventType: 'graduation',
    label: 'Tốt nghiệp ánh vàng',
    caption: 'Trang trọng, nổi bật, nhiều cảm xúc',
    asset: '/thiep-moi-online/assets/gold-graduate.svg',
    accent: '#facc15',
    accent2: '#38bdf8',
    ink: '#f8fafc',
    glow: 'rgba(250,204,21,.22)',
    dark: true,
    sample: {
      title: 'Lễ Tốt Nghiệp',
      subtitle: 'Một hành trình mới bắt đầu',
      honoredName: 'Tập thể lớp 12A1',
      hostNames: 'Nhà trường và Ban đại diện cha mẹ học sinh',
      message: 'Kính mời quý thầy cô, phụ huynh và các bạn đến dự buổi lễ tốt nghiệp đầy ý nghĩa.',
      dressCode: 'Áo sơ mi trắng hoặc trang phục trang trọng'
    }
  },
  {
    id: 'midnightAge',
    eventType: 'comingOfAge',
    label: 'Trưởng thành hiện đại',
    caption: 'Cá tính, phù hợp cuối cấp',
    asset: '/thiep-moi-online/assets/midnight-age.svg',
    accent: '#f472b6',
    accent2: '#38bdf8',
    ink: '#f8fafc',
    glow: 'rgba(56,189,248,.22)',
    dark: true,
    sample: {
      title: 'Lễ Trưởng Thành',
      subtitle: 'Tuổi 18 rực rỡ',
      honoredName: 'Khối 12',
      hostNames: 'Ban tổ chức chương trình',
      message: 'Mời bạn cùng lưu lại một tối thật đẹp cho hành trình thanh xuân.',
      dressCode: 'Đen, trắng hoặc xanh navy'
    }
  },
  {
    id: 'freshHome',
    eventType: 'housewarming',
    label: 'Tân gia tươi sáng',
    caption: 'Ấm cúng, sạch, dễ đọc',
    asset: '/thiep-moi-online/assets/fresh-home.svg',
    accent: '#0f766e',
    accent2: '#fb923c',
    ink: '#134e4a',
    glow: 'rgba(15,118,110,.2)',
    dark: false,
    sample: {
      title: 'Tiệc Tân Gia',
      subtitle: 'Mừng nhà mới',
      honoredName: 'Gia đình chúng tôi',
      hostNames: 'Gia đình chủ nhà',
      message: 'Trân trọng kính mời quý khách đến chung vui trong ngày về nhà mới.',
      dressCode: 'Trang phục thoải mái, lịch sự'
    }
  },
  {
    id: 'parentMeeting',
    eventType: 'parentMeeting',
    label: 'Họp phụ huynh',
    caption: 'Trang nhã, rõ thông tin lớp',
    asset: '/thiep-moi-online/assets/parent-meeting.svg',
    accent: '#2563eb',
    accent2: '#f59e0b',
    ink: '#1e3a8a',
    glow: 'rgba(37,99,235,.2)',
    dark: false,
    sample: {
      title: 'Thư Mời Họp Phụ Huynh',
      subtitle: 'Trao đổi tình hình học tập và rèn luyện',
      honoredName: 'Quý phụ huynh lớp 5A1',
      hostNames: 'Giáo viên chủ nhiệm và Ban đại diện cha mẹ học sinh',
      message: 'Trân trọng kính mời quý phụ huynh tham dự buổi họp để cùng trao đổi, phối hợp và đồng hành trong việc học tập, rèn luyện của các em học sinh.',
      dressCode: 'Trang phục lịch sự, gọn gàng',
      locationName: 'Phòng học lớp 5A1',
      address: 'Trường Tiểu học ...',
      schedule: [
        { time: '07:45', title: 'Đón phụ huynh', note: 'Ổn định chỗ ngồi và điểm danh' },
        { time: '08:00', title: 'Nội dung họp', note: 'Thông tin tình hình lớp, kế hoạch học tập và hoạt động' },
        { time: '09:15', title: 'Trao đổi riêng', note: 'Phụ huynh đặt câu hỏi và trao đổi với giáo viên' }
      ]
    }
  },
  {
    id: 'customGlow',
    eventType: 'custom',
    label: 'Tùy chỉnh mềm mại',
    caption: 'Dùng cho mọi loại tiệc',
    asset: '/thiep-moi-online/assets/custom-glow.svg',
    accent: '#7c3aed',
    accent2: '#06b6d4',
    ink: '#312e81',
    glow: 'rgba(124,58,237,.2)',
    dark: false,
    sample: {
      title: 'Thư Mời Tham Dự',
      subtitle: 'Một dịp đặc biệt',
      honoredName: 'Tên sự kiện',
      hostNames: 'Ban tổ chức',
      message: 'Trân trọng kính mời quý khách đến tham dự và chia sẻ khoảnh khắc đáng nhớ cùng chúng tôi.',
      dressCode: 'Trang phục phù hợp với sự kiện'
    }
  }
];

const fontOptions: Array<{
  id: InvitationFontStyle;
  label: string;
  caption: string;
  titleFont: string;
  nameFont: string;
  bodyFont: string;
  titleWeight: React.CSSProperties['fontWeight'];
}> = [
  {
    id: 'softScript',
    label: 'Mềm mại',
    caption: 'Chữ bay nhẹ kiểu thiệp online',
    titleFont: "'Great Vibes', 'Dancing Script', cursive",
    nameFont: "'Dancing Script', 'Great Vibes', cursive",
    bodyFont: "'Quicksand', 'Poppins', sans-serif",
    titleWeight: 400
  },
  {
    id: 'classicSerif',
    label: 'Thanh lịch',
    caption: 'Có chân, trang trọng và dễ đọc',
    titleFont: "'Playfair Display', 'Cormorant Garamond', serif",
    nameFont: "'Cormorant Garamond', 'Playfair Display', serif",
    bodyFont: "'Quicksand', 'Poppins', sans-serif",
    titleWeight: 600
  },
  {
    id: 'modernRounded',
    label: 'Tròn nhẹ',
    caption: 'Hiện đại, thân thiện',
    titleFont: "'Quicksand', 'Poppins', sans-serif",
    nameFont: "'Dancing Script', 'Quicksand', cursive",
    bodyFont: "'Quicksand', 'Poppins', sans-serif",
    titleWeight: 700
  }
];

const getFontOption = (id?: InvitationFontStyle) =>
  fontOptions.find((font) => font.id === id) || fontOptions[0];

const defaultRsvpOptions: Record<RsvpStatus, InvitationRsvpOption> = {
  yes: { label: 'Tham dự', color: '#10b981' },
  maybe: { label: 'Có thể', color: '#f59e0b' },
  no: { label: 'Rất tiếc', color: '#f43f5e' }
};

const getRsvpOptions = (options?: Partial<Record<RsvpStatus, InvitationRsvpOption>>) => ({
  yes: { ...defaultRsvpOptions.yes, ...(options?.yes || {}) },
  maybe: { ...defaultRsvpOptions.maybe, ...(options?.maybe || {}) },
  no: { ...defaultRsvpOptions.no, ...(options?.no || {}) }
});

const dressCodePresets: Record<InvitationThemeId, Array<{ label: string; value: string; colors: string[] }>> = {
  babyDream: [
    { label: 'Pastel nhẹ', value: 'Pastel, trắng hoặc hồng nhạt', colors: ['#f9a8d4', '#bfdbfe', '#ffffff'] },
    { label: 'Kem - xanh mint', value: 'Màu kem, xanh mint hoặc trắng', colors: ['#fef3c7', '#a7f3d0', '#ffffff'] },
    { label: 'Tự do lịch sự', value: 'Trang phục thoải mái, lịch sự, màu sáng', colors: ['#e5e7eb', '#ffffff', '#fde68a'] }
  ],
  roseWedding: [
    { label: 'Be - hồng phấn', value: 'Trang phục lịch sự, màu be hoặc hồng phấn', colors: ['#f5e7d8', '#fbcfe8', '#ffffff'] },
    { label: 'Trắng - kem - nâu', value: 'Trắng, kem, nâu nhạt hoặc champagne', colors: ['#ffffff', '#fdecc8', '#b08968'] },
    { label: 'Đỏ rượu điểm nhấn', value: 'Trang phục lịch sự, ưu tiên be/trắng; có thể điểm đỏ rượu', colors: ['#fff7ed', '#ffffff', '#9f1239'] }
  ],
  goldGraduate: [
    { label: 'Trắng trang trọng', value: 'Áo sơ mi trắng hoặc trang phục trang trọng', colors: ['#ffffff', '#111827', '#facc15'] },
    { label: 'Navy - vàng', value: 'Xanh navy, trắng hoặc điểm vàng đồng', colors: ['#0f172a', '#ffffff', '#d97706'] },
    { label: 'Đồng phục', value: 'Đồng phục trường/lớp hoặc trang phục lịch sự', colors: ['#1f2937', '#e5e7eb', '#f8fafc'] }
  ],
  midnightAge: [
    { label: 'Đen - trắng - navy', value: 'Đen, trắng hoặc xanh navy', colors: ['#020617', '#ffffff', '#1e3a8a'] },
    { label: 'Neon nhẹ', value: 'Đen/trắng làm nền, điểm hồng hoặc xanh neon nhẹ', colors: ['#020617', '#f472b6', '#38bdf8'] },
    { label: 'Smart casual', value: 'Smart casual, màu tối hoặc trung tính', colors: ['#111827', '#64748b', '#f8fafc'] }
  ],
  freshHome: [
    { label: 'Thoải mái lịch sự', value: 'Trang phục thoải mái, lịch sự', colors: ['#ffffff', '#d1fae5', '#fed7aa'] },
    { label: 'Xanh - trắng', value: 'Trắng, xanh lá nhạt hoặc màu kem', colors: ['#ffffff', '#bbf7d0', '#fef3c7'] },
    { label: 'Gia đình ấm cúng', value: 'Trang phục gia đình ấm cúng, màu sáng', colors: ['#fef3c7', '#fed7aa', '#ffffff'] }
  ],
  parentMeeting: [
    { label: 'Lịch sự gọn gàng', value: 'Trang phục lịch sự, gọn gàng', colors: ['#ffffff', '#2563eb', '#f59e0b'] },
    { label: 'Sơ mi - công sở', value: 'Áo sơ mi, trang phục công sở hoặc trang phục lịch sự', colors: ['#eff6ff', '#1e3a8a', '#f8fafc'] },
    { label: 'Tự do lịch sự', value: 'Trang phục tự do nhưng lịch sự, phù hợp môi trường trường học', colors: ['#e5e7eb', '#ffffff', '#93c5fd'] }
  ],
  customGlow: [
    { label: 'Tùy sự kiện', value: 'Trang phục phù hợp với sự kiện', colors: ['#a78bfa', '#67e8f9', '#ffffff'] },
    { label: 'Trắng - pastel', value: 'Trắng, pastel hoặc màu trung tính', colors: ['#ffffff', '#fbcfe8', '#bfdbfe'] },
    { label: 'Lịch sự', value: 'Trang phục lịch sự, dễ chụp hình', colors: ['#111827', '#e5e7eb', '#ffffff'] }
  ]
};

const today = new Date();
const defaultDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14).toISOString().slice(0, 10);

const createDefaultInvitation = (template = templates[0]): OnlineInvitation => ({
  eventType: template.eventType,
  themeId: template.id,
  title: template.sample.title || 'Thư Mời Tham Dự',
  subtitle: template.sample.subtitle || 'Một dịp đặc biệt',
  hostNames: template.sample.hostNames || 'Ban tổ chức',
  honoredName: template.sample.honoredName || 'Tên sự kiện',
  date: defaultDate,
  time: '18:00',
  locationName: template.sample.locationName || 'Trung tâm sự kiện',
  address: template.sample.address || 'Nhập địa chỉ tổ chức tại đây',
  mapUrl: '',
  message: template.sample.message || '',
  dressCode: template.sample.dressCode || '',
  phone: '',
  zalo: '',
  coverImage: '',
  musicUrl: '',
  fontStyle: 'softScript',
  rsvpOptions: defaultRsvpOptions,
  gallery: [],
  schedule: template.sample.schedule || [
    { time: '17:30', title: 'Đón khách', note: 'Check-in và chụp hình' },
    { time: '18:00', title: 'Khai tiệc', note: 'Bắt đầu chương trình chính' },
    { time: '19:30', title: 'Giao lưu', note: 'Lưu lại lời chúc và khoảnh khắc đẹp' }
  ],
  rsvpEnabled: true
});

const getTemplate = (id: InvitationThemeId) => templates.find((template) => template.id === id) || templates[0];

const formatDate = (date: string) => {
  if (!date) return 'Chưa chọn ngày';
  return new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(236,72,153,${alpha})`;
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const ThiepMoiOnline: React.FC<ThiepMoiOnlineProps> = ({ onBack, user, onRequireLogin, sharedId }) => {
  const [invitation, setInvitation] = useState<OnlineInvitation>(() => createDefaultInvitation());
  const [activeShortId, setActiveShortId] = useState<string | null>(sharedId || null);
  const [shareUrl, setShareUrl] = useState('');
  const [creatorTab, setCreatorTab] = useState<'design' | 'content' | 'share' | 'rsvp'>('design');
  const [viewerMode, setViewerMode] = useState(Boolean(sharedId));
  const [isLoading, setIsLoading] = useState(Boolean(sharedId));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [savedInvitations, setSavedInvitations] = useState<Array<OnlineInvitation & { shortId: string; rsvpCount: number }>>([]);
  const [rsvps, setRsvps] = useState<InvitationRsvp[]>([]);
  const [rsvpForm, setRsvpForm] = useState({
    guestName: '',
    phone: '',
    status: 'yes' as RsvpStatus,
    guestCount: 1,
    wish: ''
  });
  const [isSendingRsvp, setIsSendingRsvp] = useState(false);

  const template = useMemo(() => getTemplate(invitation.themeId), [invitation.themeId]);

  useEffect(() => {
    if (!sharedId) return;
    setViewerMode(true);
    setActiveShortId(sharedId);
    setIsLoading(true);
    getOnlineInvitation(sharedId).then((data) => {
      if (data) setInvitation(data);
      setIsLoading(false);
    });
    getOnlineInvitationRsvps(sharedId).then(setRsvps);
  }, [sharedId]);

  useEffect(() => {
    if (!user?.email || viewerMode) return;
    getUserOnlineInvitations(user.email).then(setSavedInvitations);
  }, [user?.email, viewerMode]);

  useEffect(() => {
    if (activeShortId) {
      setShareUrl(`${window.location.origin}${window.location.pathname}?app=thiep_moi_online&id=${activeShortId}`);
    }
  }, [activeShortId]);

  const updateField = <K extends keyof OnlineInvitation>(key: K, value: OnlineInvitation[K]) => {
    setInvitation((current) => ({ ...current, [key]: value }));
  };

  const selectTemplate = (selected: InvitationTemplate) => {
    setInvitation((current) => ({
      ...current,
      ...selected.sample,
      eventType: selected.eventType,
      themeId: selected.id
    }));
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => updateField('coverImage', String(reader.result || ''));
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveInvitation = async () => {
    if (!user?.email) {
      onRequireLogin?.();
      return;
    }

    setIsSaving(true);
    setNotice('');
    const payload = {
      ...invitation,
      userEmail: user.email,
      userId: user.id || user.email
    };
    const ok = activeShortId
      ? await updateOnlineInvitation(activeShortId, payload)
      : false;
    const shortId = ok ? activeShortId : await saveOnlineInvitation(payload, user.id || user.email, user.email);

    setIsSaving(false);
    if (!shortId) {
      setNotice('Chưa lưu được thiệp. Vui lòng thử lại.');
      return;
    }

    setActiveShortId(shortId);
    setCreatorTab('share');
    setNotice('Đã lưu thiệp và tạo link chia sẻ.');
    getUserOnlineInvitations(user.email).then(setSavedInvitations);
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Đã copy link thiệp.');
    } catch {
      setNotice('Không copy tự động được. Hãy bôi đen link để sao chép.');
    }
  };

  const downloadQrCode = async () => {
    if (!shareUrl) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&format=png&data=${encodeURIComponent(shareUrl)}`;
    const safeTitle = (invitation.title || 'thiep-moi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const fileName = `QR_${safeTitle || 'thiep-moi'}.png`;

    try {
      setNotice('Đang tải QR về máy...');
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('Cannot fetch QR image');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice(`Đã tải file ${fileName} về máy.`);
    } catch (error) {
      console.error('QR download failed:', error);
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotice('Trình duyệt không cho tải trực tiếp. Ảnh QR đã được mở, hãy bấm lưu ảnh.');
    }
  };

  const openSaved = async (shortId: string) => {
    setIsLoading(true);
    const data = await getOnlineInvitation(shortId);
    if (data) {
      setInvitation(data);
      setActiveShortId(shortId);
      setCreatorTab('content');
      setViewerMode(false);
      getOnlineInvitationRsvps(shortId).then(setRsvps);
    }
    setIsLoading(false);
  };

  const deleteSavedInvitation = async (shortId: string, title: string) => {
    if (!user?.email) return;
    const ok = confirm(`Xóa thiệp "${title || 'đã lưu'}"? Toàn bộ phản hồi của thiệp này cũng sẽ bị xóa.`);
    if (!ok) return;

    setNotice('Đang xóa thiệp...');
    const deleted = await deleteOnlineInvitation(shortId);
    if (!deleted) {
      setNotice('Chưa xóa được thiệp. Vui lòng thử lại.');
      return;
    }

    setSavedInvitations((items) => items.filter((item) => item.shortId !== shortId));
    if (activeShortId === shortId) {
      setActiveShortId(null);
      setShareUrl('');
      setRsvps([]);
    }
    setNotice('Đã xóa thiệp đã lưu.');
  };

  const submitRsvp = async () => {
    if (!activeShortId || !rsvpForm.guestName.trim()) {
      setNotice('Vui lòng nhập tên khách mời.');
      return;
    }
    setIsSendingRsvp(true);
    const ok = await saveOnlineInvitationRsvp(activeShortId, {
      guestName: rsvpForm.guestName,
      phone: rsvpForm.phone,
      status: rsvpForm.status,
      guestCount: rsvpForm.guestCount,
      wish: rsvpForm.wish
    });
    setIsSendingRsvp(false);
    if (ok) {
      setNotice('Đã gửi xác nhận. Cảm ơn bạn!');
      setRsvpForm({ guestName: '', phone: '', status: 'yes', guestCount: 1, wish: '' });
      getOnlineInvitationRsvps(activeShortId).then(setRsvps);
    } else {
      setNotice('Chưa gửi được xác nhận. Vui lòng thử lại.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-pink-200" />
          <span className="text-sm font-bold">Đang mở thiệp...</span>
        </div>
      </div>
    );
  }

  if (viewerMode) {
    return (
      <InvitationViewer
        invitation={invitation}
        template={template}
        rsvpForm={rsvpForm}
        setRsvpForm={setRsvpForm}
        isSendingRsvp={isSendingRsvp}
        onSubmitRsvp={submitRsvp}
        onBack={onBack}
        notice={notice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-900">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 px-4 py-3 text-white shadow-xl backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-pink-200">Invitation Studio</div>
            <h1 className="truncate text-lg font-black">Thiệp Mời Online</h1>
          </div>
          <button
            onClick={saveInvitation}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-pink-900/25 transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thiệp
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)_390px]">
        <aside className="space-y-4">
          <Panel title="Mẫu thiệp" icon={<Palette className="h-4 w-4" />}>
            <div className="space-y-3">
              {templates.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectTemplate(item)}
                  className={`group flex w-full gap-3 rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 ${
                    invitation.themeId === item.id
                      ? 'border-pink-300 bg-pink-50 shadow-lg shadow-pink-900/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <img src={item.asset} alt={item.label} className="h-20 w-16 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1 py-1">
                    <span className="block text-sm font-black text-slate-900">{item.label}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.caption}</span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          {savedInvitations.length > 0 && (
            <Panel title="Thiệp đã lưu" icon={<Clipboard className="h-4 w-4" />}>
              <div className="space-y-2">
                {savedInvitations.slice(0, 5).map((item) => (
                  <div
                    key={item.shortId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 transition hover:border-pink-200 hover:bg-pink-50"
                  >
                    <button
                      onClick={() => openSaved(item.shortId)}
                      className="min-w-0 rounded-xl px-2 py-1.5 text-left"
                    >
                      <div className="line-clamp-1 text-sm font-black text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{item.rsvpCount} phản hồi</div>
                    </button>
                    <button
                      onClick={() => deleteSavedInvitation(item.shortId, item.title)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Xóa thiệp"
                      aria-label="Xóa thiệp"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['design', 'Mẫu & ảnh', Sparkles],
              ['content', 'Nội dung', CalendarDays],
              ['share', 'Chia sẻ', QrCode],
              ['rsvp', 'Phản hồi', Users]
            ].map(([key, label, Icon]) => (
              <button
                key={key as string}
                onClick={() => setCreatorTab(key as typeof creatorTab)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition ${
                  creatorTab === key
                    ? 'bg-white text-slate-950 shadow-lg'
                    : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label as string}
              </button>
            ))}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white p-4 shadow-2xl shadow-black/20 sm:p-6">
            {creatorTab === 'design' && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Ảnh nhân vật / ảnh bìa riêng</label>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={invitation.coverImage}
                      onChange={(event) => updateField('coverImage', event.target.value)}
                      className={inputClass}
                      placeholder="Dán link ảnh hoặc tải ảnh lên"
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                      <ImagePlus className="h-4 w-4" />
                      Tải ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    </label>
                  </div>
                  <p className="mt-2 rounded-2xl bg-sky-50 px-4 py-2 text-xs font-medium leading-5 text-sky-700">
                    Nên dùng ảnh ngang tỷ lệ 16:9, ví dụ 1920x1080 hoặc 1280x720, để ảnh bìa lên thiệp không bị cắt mất chữ.
                  </p>
                </div>
                <Field label="Tiêu đề thiệp" value={invitation.title} onChange={(value) => updateField('title', value)} />
                <Field label="Dòng phụ" value={invitation.subtitle} onChange={(value) => updateField('subtitle', value)} />
                <Field label="Tên nhân vật chính / sự kiện" value={invitation.honoredName} onChange={(value) => updateField('honoredName', value)} />
                <Field label="Nhạc nền tùy chọn" value={invitation.musicUrl} onChange={(value) => updateField('musicUrl', value)} placeholder="Dán link mp3 nếu có" />
                <MusicLinkGuide />
                <FontStylePicker
                  value={invitation.fontStyle || 'softScript'}
                  onChange={(value) => updateField('fontStyle', value)}
                />
                <RsvpStyleCustomizer
                  value={invitation.rsvpOptions}
                  onChange={(value) => updateField('rsvpOptions', value)}
                />
              </div>
            )}

            {creatorTab === 'content' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Đơn vị / gia đình mời" value={invitation.hostNames} onChange={(value) => updateField('hostNames', value)} />
                <Field label="Số điện thoại" value={invitation.phone} onChange={(value) => updateField('phone', value)} />
                <Field label="Ngày" type="date" value={invitation.date} onChange={(value) => updateField('date', value)} />
                <Field label="Giờ" type="time" value={invitation.time} onChange={(value) => updateField('time', value)} />
                <Field label="Địa điểm" value={invitation.locationName} onChange={(value) => updateField('locationName', value)} />
                <Field label="Link Zalo / liên hệ" value={invitation.zalo} onChange={(value) => updateField('zalo', value)} />
                <div className="sm:col-span-2">
                  <Field label="Địa chỉ" value={invitation.address} onChange={(value) => updateField('address', value)} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Link Google Maps" value={invitation.mapUrl} onChange={(value) => updateField('mapUrl', value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Lời mời</label>
                  <textarea
                    value={invitation.message}
                    onChange={(event) => updateField('message', event.target.value)}
                    className={`${inputClass} min-h-[130px] resize-y leading-6`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Dress code / ghi chú" value={invitation.dressCode} onChange={(value) => updateField('dressCode', value)} />
                  <DressCodeQuickPicks
                    themeId={invitation.themeId}
                    value={invitation.dressCode}
                    onPick={(value) => updateField('dressCode', value)}
                  />
                </div>
              </div>
            )}

            {creatorTab === 'share' && (
              <div className="space-y-5">
                {!activeShortId ? (
                  <div className="rounded-3xl border border-dashed border-pink-200 bg-pink-50 p-6 text-center">
                    <QrCode className="mx-auto h-10 w-10 text-pink-500" />
                    <h2 className="mt-3 text-xl font-black text-slate-900">Lưu thiệp để tạo link</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Sau khi lưu, app sẽ tạo link chia sẻ và QR riêng cho thiệp này.</p>
                    <button onClick={saveInvitation} className="mt-5 rounded-2xl bg-pink-500 px-5 py-3 text-sm font-black text-white">
                      Lưu và tạo link
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <label className={labelClass}>Link chia sẻ</label>
                      <div className="flex gap-2">
                        <input readOnly value={shareUrl} className={inputClass} />
                        <button onClick={copyShareUrl} className="rounded-2xl bg-slate-950 px-4 text-white">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a target="_blank" rel="noreferrer" href={shareUrl} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-900 shadow">
                          <Eye className="h-4 w-4" />
                          Mở xem
                        </a>
                        <button onClick={saveInvitation} className="inline-flex items-center gap-2 rounded-2xl bg-pink-500 px-4 py-2 text-sm font-black text-white shadow">
                          <Save className="h-4 w-4" />
                          Cập nhật
                        </button>
                      </div>
                    </div>
                    <div className="rounded-3xl bg-white p-4 text-center shadow-inner ring-1 ring-slate-100">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=${encodeURIComponent(shareUrl)}`}
                        alt="QR thiệp mời"
                        className="mx-auto h-48 w-48 rounded-2xl bg-white p-2"
                      />
                      <div className="mt-2 text-xs font-bold text-slate-500">Quét QR để mở thiệp</div>
                      <button
                        onClick={downloadQrCode}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        <Download className="h-4 w-4" />
                        Tải QR
                      </button>
                    </div>
                  </div>
                )}
                {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>}
              </div>
            )}

            {creatorTab === 'rsvp' && (
              <RsvpList
                rsvps={rsvps}
                activeShortId={activeShortId}
                rsvpOptions={invitation.rsvpOptions}
                reload={() => activeShortId && getOnlineInvitationRsvps(activeShortId).then(setRsvps)}
              />
            )}
          </div>
        </main>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 flex items-center justify-between text-white">
            <span className="text-sm font-black uppercase tracking-wide text-white/60">Preview trực tiếp</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Mobile</span>
          </div>
          <InvitationPreview invitation={invitation} template={template} />
        </aside>
      </div>
    </div>
  );
};

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white p-4 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className={inputClass} />
    </div>
  );
}

function MusicLinkGuide() {
  return (
    <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 p-4 text-sm text-slate-700">
      <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
        <Music2 className="h-4 w-4 text-rose-500" />
        Cách lấy link nhạc nhanh
      </div>
      <div className="grid gap-2 leading-6 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/75 p-3 shadow-sm ring-1 ring-white">
          <span className="font-semibold text-rose-600">1.</span> Tải file nhạc `.mp3` lên Google Drive.
        </div>
        <div className="rounded-2xl bg-white/75 p-3 shadow-sm ring-1 ring-white">
          <span className="font-semibold text-rose-600">2.</span> Bấm chia sẻ, chọn “Bất kỳ ai có đường liên kết”.
        </div>
        <div className="rounded-2xl bg-white/75 p-3 shadow-sm ring-1 ring-white">
          <span className="font-semibold text-rose-600">3.</span> Sao chép liên kết rồi dán vào ô nhạc.
        </div>
      </div>
      <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
        Link YouTube thường không phát trực tiếp trong thiệp. Link mp3 công khai hoặc link Google Drive công khai là dễ dùng nhất.
      </p>
    </div>
  );
}

function FontStylePicker({ value, onChange }: { value: InvitationFontStyle; onChange: (value: InvitationFontStyle) => void }) {
  return (
    <div>
      <label className={labelClass}>Kiểu chữ</label>
      <div className="grid gap-2 sm:grid-cols-3">
        {fontOptions.map((font) => {
          const active = value === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => onChange(font.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${
                active
                  ? 'border-pink-300 bg-gradient-to-br from-pink-50 to-sky-50 shadow-md shadow-pink-900/10'
                  : 'border-slate-200 bg-white hover:border-pink-200 hover:bg-pink-50/50'
              }`}
            >
              <span className="block text-2xl leading-none text-slate-900" style={{ fontFamily: font.titleFont, fontWeight: font.titleWeight, letterSpacing: 0 }}>
                Aa
              </span>
              <span className="mt-2 block text-xs font-semibold text-slate-800">{font.label}</span>
              <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500">{font.caption}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RsvpStyleCustomizer({
  value,
  onChange
}: {
  value?: Partial<Record<RsvpStatus, InvitationRsvpOption>>;
  onChange: (value: Partial<Record<RsvpStatus, InvitationRsvpOption>>) => void;
}) {
  const options = getRsvpOptions(value);
  const statusOrder: RsvpStatus[] = ['yes', 'maybe', 'no'];

  const updateOption = (status: RsvpStatus, patch: Partial<InvitationRsvpOption>) => {
    onChange({
      ...options,
      [status]: {
        ...options[status],
        ...patch
      }
    });
  };

  return (
    <div>
      <label className={labelClass}>Tùy chỉnh nút phản hồi</label>
      <div className="grid gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-3">
        {statusOrder.map((status) => {
          const option = options[status];
          return (
            <div key={status} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-white">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: hexToRgba(option.color, 0.12), color: option.color }}
                >
                  {option.label}
                </span>
                <input
                  type="color"
                  value={option.color}
                  onChange={(event) => updateOption(status, { color: event.target.value })}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  aria-label={`Chọn màu ${option.label}`}
                />
              </div>
              <input
                value={option.label}
                onChange={(event) => updateOption(status, { label: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                placeholder="Tên nút"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DressCodeQuickPicks({
  themeId,
  value,
  onPick
}: {
  themeId: InvitationThemeId;
  value: string;
  onPick: (value: string) => void;
}) {
  const presets = dressCodePresets[themeId] || dressCodePresets.customGlow;

  return (
    <div className="mt-3 rounded-3xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Tone gợi ý</span>
        <span className="text-[11px] font-bold text-slate-400">Bấm để điền nhanh</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {presets.map((preset) => {
          const active = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onPick(preset.value)}
              className={`rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 ${
                active
                  ? 'border-pink-300 bg-white shadow-md shadow-pink-900/10'
                  : 'border-white bg-white/70 hover:border-slate-200'
              }`}
            >
              <span className="mb-2 flex gap-1">
                {preset.colors.map((color) => (
                  <span
                    key={color}
                    className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="block text-xs font-black text-slate-800">{preset.label}</span>
              <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">{preset.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InvitationPreview({ invitation, template }: { invitation: OnlineInvitation; template: InvitationTemplate }) {
  const foreground = template.dark ? 'text-white' : 'text-slate-950';
  const font = getFontOption(invitation.fontStyle);
  const rsvpOptions = getRsvpOptions(invitation.rsvpOptions);
  const titleStyle = { fontFamily: font.titleFont, fontWeight: font.titleWeight, letterSpacing: 0 };
  const nameStyle = { fontFamily: font.nameFont, fontWeight: 600, letterSpacing: 0 };
  return (
    <div
      className="overflow-hidden rounded-[34px] border border-white/20 bg-white shadow-2xl shadow-black/40"
      style={{ boxShadow: `0 30px 80px ${template.glow}`, fontFamily: font.bodyFont }}
    >
      <div className="relative min-h-[720px] bg-cover bg-center p-5" style={{ backgroundImage: `url(${template.asset})` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
        <div className={`relative flex min-h-[680px] flex-col ${foreground}`}>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-800 backdrop-blur">
              Online Invitation
            </span>
            <Heart className="h-6 w-6" style={{ color: template.accent }} />
          </div>

          <div className="mt-12 rounded-[30px] bg-white/70 p-5 text-slate-950 shadow-2xl backdrop-blur-xl ring-1 ring-white/70">
            {invitation.coverImage ? (
              <img
                src={invitation.coverImage}
                alt={invitation.honoredName}
                className="mb-5 w-full rounded-[24px] object-cover shadow-lg"
                style={{ aspectRatio: '16 / 9' }}
              />
            ) : (
              <div className="mb-5 flex h-48 items-center justify-center rounded-[24px] bg-white/45 shadow-inner">
                <Sparkles className="h-14 w-14" style={{ color: template.accent }} />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: template.accent }}>{invitation.subtitle}</p>
              <h2 className="mt-3 break-words text-5xl leading-tight" style={{ color: template.ink, ...titleStyle }}>{invitation.title}</h2>
              <p className="mt-3 text-3xl" style={{ color: template.accent, ...nameStyle }}>{invitation.honoredName}</p>
            </div>
          </div>

          <div className="mt-auto space-y-3 rounded-[28px] bg-white/78 p-4 text-slate-900 shadow-xl backdrop-blur-xl ring-1 ring-white/70">
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label={`${formatDate(invitation.date)} • ${invitation.time}`} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label={invitation.locationName || invitation.address} />
            <p className="line-clamp-3 text-sm font-medium leading-6 text-slate-600">{invitation.message}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button className="rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${rsvpOptions.yes.color}, ${template.accent2})` }}>{rsvpOptions.yes.label}</button>
              <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-100">Bản đồ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-black">
      <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
}

function normalizeMusicUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com')) {
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/) || trimmed.match(/[?&]id=([^&]+)/);
    if (driveMatch?.[1]) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
  }

  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=0\b/, '?raw=1');
  }

  return trimmed;
}

function BackgroundMusic({ url, accent }: { url: string; accent: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const src = useMemo(() => normalizeMusicUrl(url), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    setIsPlaying(false);
    setHasError(false);
    audio.volume = 0.72;
    audio.load();

    const playAudio = () => {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch(() => setIsPlaying(false));
    };

    playAudio();
    window.addEventListener('pointerdown', playAudio, { once: true });
    window.addEventListener('keydown', playAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', playAudio);
      window.removeEventListener('keydown', playAudio);
      audio.pause();
    };
  }, [src]);

  if (!src) return null;

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch(() => setHasError(true));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed right-4 top-4 z-40 flex flex-col items-end gap-2">
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setHasError(true);
        }}
      />
      <button
        type="button"
        onClick={toggleMusic}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur transition hover:-translate-y-0.5"
        style={{ background: `linear-gradient(135deg, ${accent}, #f59e0b)` }}
      >
        {isPlaying ? <VolumeX className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
        {isPlaying ? 'Tắt nhạc' : 'Bật nhạc'}
      </button>
      {hasError && (
        <span className="max-w-[210px] rounded-2xl bg-white/90 px-3 py-2 text-right text-xs font-medium leading-4 text-rose-700 shadow-lg backdrop-blur">
          Link nhạc chưa phát được. Nên dùng link mp3 công khai.
        </span>
      )}
    </div>
  );
}

function InvitationViewer({
  invitation,
  template,
  rsvpForm,
  setRsvpForm,
  isSendingRsvp,
  onSubmitRsvp,
  onBack,
  notice
}: {
  invitation: OnlineInvitation;
  template: InvitationTemplate;
  rsvpForm: { guestName: string; phone: string; status: RsvpStatus; guestCount: number; wish: string };
  setRsvpForm: React.Dispatch<React.SetStateAction<{ guestName: string; phone: string; status: RsvpStatus; guestCount: number; wish: string }>>;
  isSendingRsvp: boolean;
  onSubmitRsvp: () => void;
  onBack: () => void;
  notice: string;
}) {
  const font = getFontOption(invitation.fontStyle);
  const rsvpOptions = getRsvpOptions(invitation.rsvpOptions);
  const titleStyle = { fontFamily: font.titleFont, fontWeight: font.titleWeight, letterSpacing: 0 };
  const nameStyle = { fontFamily: font.nameFont, fontWeight: 600, letterSpacing: 0 };

  return (
    <div className="min-h-screen bg-slate-950" style={{ fontFamily: font.bodyFont }}>
      <BackgroundMusic url={invitation.musicUrl} accent={template.accent} />
      <button onClick={onBack} className="fixed left-4 top-4 z-30 rounded-2xl bg-white/85 px-4 py-2 text-sm font-black text-slate-900 shadow-xl backdrop-blur">
        ← Trang chủ
      </button>
      <section className="relative min-h-screen bg-cover bg-center px-4 py-16" style={{ backgroundImage: `url(${template.asset})` }}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1fr_420px]">
          <div className={`rounded-[40px] bg-white/75 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/70 ${template.dark ? 'lg:bg-slate-950/70 lg:text-white' : ''}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.32em]" style={{ color: template.accent }}>{invitation.subtitle}</p>
            <h1 className="mt-4 break-words text-6xl leading-none sm:text-8xl" style={{ color: template.dark ? '#fff' : template.ink, ...titleStyle }}>{invitation.title}</h1>
            <p className="mt-4 text-4xl" style={{ color: template.accent, ...nameStyle }}>{invitation.honoredName}</p>
            <p className={`mt-5 max-w-2xl text-base font-medium leading-8 ${template.dark ? 'text-white/75' : 'text-slate-700'}`}>{invitation.message}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoPill icon={<CalendarDays className="h-5 w-5" />} title={formatDate(invitation.date)} note={invitation.time} />
              <InfoPill icon={<MapPin className="h-5 w-5" />} title={invitation.locationName} note={invitation.address} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {invitation.mapUrl && (
                <a href={invitation.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
                  <MapPin className="h-4 w-4" />
                  Mở bản đồ
                </a>
              )}
              {invitation.phone && (
                <a href={`tel:${invitation.phone}`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow">
                  <Phone className="h-4 w-4" />
                  Gọi liên hệ
                </a>
              )}
              {invitation.zalo && (
                <a href={invitation.zalo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-[#0068ff] px-5 py-3 text-sm font-black text-white">
                  <MessageCircle className="h-4 w-4" />
                  Nhắn Zalo
                </a>
              )}
            </div>
          </div>

          <div className="rounded-[34px] bg-white p-5 shadow-2xl">
            {invitation.coverImage ? (
              <img
                src={invitation.coverImage}
                alt={invitation.honoredName}
                className="mb-4 w-full rounded-[26px] object-cover"
                style={{ aspectRatio: '16 / 9' }}
              />
            ) : (
              <InvitationPreview invitation={invitation} template={template} />
            )}
            {invitation.rsvpEnabled && (
              <div className="mt-4">
                <h2 className="text-xl font-black text-slate-950">Xác nhận tham dự</h2>
                <div className="mt-4 space-y-3">
                  <input className={inputClass} value={rsvpForm.guestName} onChange={(event) => setRsvpForm((f) => ({ ...f, guestName: event.target.value }))} placeholder="Tên khách mời" />
                  <input className={inputClass} value={rsvpForm.phone} onChange={(event) => setRsvpForm((f) => ({ ...f, phone: event.target.value }))} placeholder="Số điện thoại" />
                  <div className="grid grid-cols-3 gap-2">
                    {(['yes', 'maybe', 'no'] as RsvpStatus[]).map((statusKey) => {
                      const option = rsvpOptions[statusKey];
                      const isActive = rsvpForm.status === statusKey;
                      return (
                        <button
                          key={statusKey}
                          onClick={() => setRsvpForm((f) => ({ ...f, status: statusKey }))}
                          className="rounded-full px-3 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                          style={{
                            background: isActive
                              ? `linear-gradient(135deg, ${option.color}, ${hexToRgba(option.color, 0.68)})`
                              : hexToRgba(option.color, 0.1),
                            color: isActive ? '#ffffff' : option.color,
                            boxShadow: isActive ? `0 14px 26px ${hexToRgba(option.color, 0.22)}` : 'none'
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <input className={inputClass} type="number" min={1} value={rsvpForm.guestCount} onChange={(event) => setRsvpForm((f) => ({ ...f, guestCount: Number(event.target.value) || 1 }))} placeholder="Số người" />
                  <textarea className={`${inputClass} min-h-[90px] resize-y`} value={rsvpForm.wish} onChange={(event) => setRsvpForm((f) => ({ ...f, wish: event.target.value }))} placeholder="Lời chúc" />
                  <button onClick={onSubmitRsvp} disabled={isSendingRsvp} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-100 transition hover:-translate-y-0.5 disabled:opacity-60">
                    {isSendingRsvp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Gửi xác nhận
                  </button>
                  {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoPill({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <div className="rounded-3xl bg-white/75 p-4 text-slate-900 shadow ring-1 ring-white/80">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{title || 'Chưa nhập'}</div>
          <div className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">{note}</div>
        </div>
      </div>
    </div>
  );
}

function RsvpList({
  rsvps,
  activeShortId,
  rsvpOptions,
  reload
}: {
  rsvps: InvitationRsvp[];
  activeShortId: string | null;
  rsvpOptions?: Partial<Record<RsvpStatus, InvitationRsvpOption>>;
  reload: () => void;
}) {
  const options = getRsvpOptions(rsvpOptions);
  const totals = rsvps.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      acc.guests += Number(item.guestCount) || 0;
      return acc;
    },
    { yes: 0, maybe: 0, no: 0, guests: 0 }
  );

  if (!activeShortId) {
    return <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">Lưu thiệp trước để nhận phản hồi.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={options.yes.label} value={totals.yes} />
        <Stat label={options.maybe.label} value={totals.maybe} />
        <Stat label={options.no.label} value={totals.no} />
        <Stat label="Tổng khách" value={totals.guests} />
      </div>
      <button onClick={reload} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
        <Download className="h-4 w-4" />
        Tải lại phản hồi
      </button>
      <div className="space-y-3">
        {rsvps.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">Chưa có khách phản hồi.</div>
        ) : (
          rsvps.map((item) => (
            <div key={item.id || item.createdAt} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black text-slate-950">{item.guestName}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{item.phone || 'Chưa nhập SĐT'} • {item.guestCount} người</div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: hexToRgba(options[item.status].color, 0.12), color: options[item.status].color }}
                >
                  {options[item.status].label}
                </span>
              </div>
              {item.wish && <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">{item.wish}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 text-center">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default ThiepMoiOnline;
