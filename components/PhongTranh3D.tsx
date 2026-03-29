import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Image, Plus, Save, Play, Trash2, Home, HelpCircle, BookOpen,
    CheckCircle2, Share2, Edit3, X, Copy, ArrowLeft
} from 'lucide-react';
import { VirtualGallery, getVirtualGalleriesByUser, saveVirtualGallery, deleteVirtualGallery, updateVirtualGallery, getVirtualGallery } from '../utils/firebaseVirtualGallery';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../utils/firebaseConfig';

interface Props {
    user: { email: string; name: string } | null;
    onRequireLogin?: () => void;
    onBack?: () => void;
}

export default function PhongTranh3D({ user, onRequireLogin, onBack }: Props) {
    const [mode, setMode] = useState<'DASHBOARD' | 'IFRAME'>('DASHBOARD');
    const [galleries, setGalleries] = useState<VirtualGallery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentGallery, setCurrentGallery] = useState<VirtualGallery | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState<number>(0);
    const [isCopyingLink, setIsCopyingLink] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState(false);

    // Deep link logic
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedId = urlParams.get('id');
        const appParam = urlParams.get('app');

        if (appParam === 'phong_tranh_3d' && sharedId) {
            // Load shared gallery directly
            import('../utils/firebaseVirtualGallery').then(({ getVirtualGallery }) => {
                getVirtualGallery(sharedId).then(gallery => {
                    if (gallery) {
                        setCurrentGallery(gallery);
                        setIframeReady(false);
                        setMode('IFRAME');
                    }
                });
            });
        }
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let sharedId = urlParams.get('id');
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        if (pathSegments.length >= 3 && pathSegments[0] === 'share' && pathSegments[1] === 'phong-tranh-3d') {
            sharedId = pathSegments[2];
        }

        if (!user) {
            // Nếu người dùng không đăng nhập VÀ không có ID chia sẻ mới đòi login
            if (onRequireLogin && mode === 'DASHBOARD' && !sharedId) {
                onRequireLogin();
            }
            return;
        }
        setIsLoading(true);
        getVirtualGalleriesByUser(user.email).then(data => {
            setGalleries(data);
            setIsLoading(false);
        });
    }, [user, onRequireLogin, mode]);

    // Handle postMessage from iframe
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (!user) return;
            if (event.data?.type === 'SAVE_VIRTUAL_GALLERY') {
                const buffer = event.data.data; // Now an ArrayBuffer
                const fileName = event.data.fileName || 'room.zip';
                
                const galleryName = prompt("Nhập tên cho Phòng Tranh này:", currentGallery?.title || "Phòng tranh 3D của tôi");
                if (!galleryName) return;

                setIsSaving(true);
                
                try {
                    // 1. Upload Blob to Firebase Storage
                    const blob = new Blob([buffer]);
                    const fileRef = storageRef(storage, `virtual_galleries/${user.email}/${Date.now()}_${fileName}`);
                    
                    const uploadTask = uploadBytesResumable(fileRef, blob);

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setSaveProgress(Math.round(progress));
                        },
                        (error) => {
                            console.error("Lỗi khi tải file lên Storage:", error);
                            alert("Có lỗi xảy ra khi lưu phòng tranh. Vui lòng thử lại!");
                            setIsSaving(false);
                            setSaveProgress(0);
                        },
                        async () => {
                            try {
                                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                                // 2. Save Meta to Realtime Database
                                if (currentGallery && currentGallery.ownerEmail === user.email) {
                                    // Update existing
                                    const success = await updateVirtualGallery(currentGallery.id, { title: galleryName, galleryFileUrl: downloadUrl });
                                    if (success) {
                                        alert("Đã cập nhật phòng tranh thành công lên Máy chủ Đám mây!");
                                        getVirtualGalleriesByUser(user.email).then(setGalleries);
                                    }
                                } else {
                                    // Create new
                                    const newId = await saveVirtualGallery({
                                        ownerEmail: user.email,
                                        ownerName: user.name,
                                        title: galleryName,
                                        galleryFileUrl: downloadUrl
                                    });
                                    if (newId) {
                                        alert("Đã lưu phòng mới thành công lên Máy chủ Đám mây!");
                                        getVirtualGalleriesByUser(user.email).then(data => {
                                            setGalleries(data);
                                            const savedGallery = data.find(g => g.id === newId);
                                            if (savedGallery) setCurrentGallery(savedGallery);
                                        });
                                    }
                                }
                            } catch (metaError) {
                                console.error("Lỗi lưu metadata", metaError);
                                alert("Có lỗi xảy ra khi lưu thông tin. Vui lòng thử");
                            } finally {
                                setIsSaving(false);
                                setSaveProgress(0);
                            }
                        }
                    );
                } catch (error) {
                    console.error("Lỗi khởi tạo Storage:", error);
                    alert("Có lỗi xảy ra khi khởi tạo phiên lưu trữ!");
                    setIsSaving(false);
                }
            } else if (event.data?.type === 'IFRAME_APP_READY') {
                setIframeReady(true);
                if (currentGallery && currentGallery.galleryFileUrl) {
                    // Tải file ZIP từ đám mây xuống trước khi nhét vào Iframe
                    try {
                        setIsSaving(true); // Hiển thị loading khi tải file
                        const response = await fetch(currentGallery.galleryFileUrl);
                        const buffer = await response.arrayBuffer();
                        iframeRef.current?.contentWindow?.postMessage({
                            type: 'LOAD_VIRTUAL_GALLERY',
                            data: buffer,
                            fileName: currentGallery.galleryFileUrl.includes('.zip') ? 'cloud.zip' : 'cloud.json'
                        }, '*');
                    } catch (err) {
                        console.error("Lỗi khi tải file tĩnh từ Mây:", err);
                    } finally {
                        setIsSaving(false);
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, currentGallery]);

    const handleCreateNew = () => {
        if (!user) {
            if (onRequireLogin) onRequireLogin();
            return;
        }

        // Kiểm tra giới hạn bản miễn phí (tối đa 3 phòng)
        if (galleries.length >= 3) {
            // Giả lập check Pro tạm thời (có thể liên kết licenseUtils sau này)
            const isPro = localStorage.getItem(`ntd_pro_phongtranh3d_${user.email}`) === 'true';
            if (!isPro) {
                alert("Tài khoản của bạn đã đạt giới hạn tối đa để thiết kế (3 phòng tranh). Xin vui lòng liên hệ Admin (Zalo: 0975.509.490) để nâng cấp tài khoản CÓ TRẢ PHÍ hoặc vui lòng xoá bớt tác phẩm cũ để tạo mới!");
                return;
            }
        }

        setCurrentGallery(null);
        setIframeReady(false);
        setMode('IFRAME');
    };

    const handleOpenGallery = (gallery: VirtualGallery) => {
        setCurrentGallery(gallery);
        setIframeReady(false);
        setMode('IFRAME');
    };

    const handleDeleteGallery = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Bạn có chắc chắn muốn xóa phòng tranh này khỏi tài khoản của bạn?")) {
            deleteVirtualGallery(id).then(success => {
                if (success && user) {
                    getVirtualGalleriesByUser(user.email).then(setGalleries);
                }
            });
        }
    };

    const handleShare = async (e: React.MouseEvent, gallery: VirtualGallery) => {
        e.stopPropagation();
        if (isCopyingLink) return;
        // Cấu trúc Link đẹp: /share/phong-tranh-3d/ID
        const shareUrl = `${window.location.origin}/share/phong-tranh-3d/${gallery.id}`;
        
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedId(gallery.id);
            setTimeout(() => setCopiedId(null), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsCopyingLink(null);
        }
    };

    // Kiểm tra login trừ khi là khách đang xem qua link chia sẻ
    if (!user && mode === 'DASHBOARD') {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('id')) return null;
    }

    if (mode === 'IFRAME') {
        const handleIframeLoad = () => {
            try {
                const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
                if (!doc) {
                    setIframeReady(true);
                    return;
                }

                const script = doc.createElement('script');
                script.innerHTML = `
                    // BẮT SỰ KIỆN TẢI FILE ZIP HOẶC JSON
                    const originalCreateElement = document.createElement.bind(document);
                    document.createElement = function(tagName) {
                        if (tagName.toLowerCase() === 'a') {
                            const el = originalCreateElement(tagName);
                            const originalClick = el.click.bind(el);
                            el.click = function() {
                                if (el.download && (el.download.endsWith('.json') || el.download.endsWith('.zip')) && el.href && el.href.startsWith('blob:')) {
                                    // Chuyển blob thành array buffer rồi ship về cho mẹ
                                    fetch(el.href).then(res => res.arrayBuffer()).then(buffer => {
                                        window.parent.postMessage({ 
                                            type: 'SAVE_VIRTUAL_GALLERY', 
                                            data: buffer, 
                                            fileName: el.download 
                                        }, '*');
                                    });
                                    return; // Chặn hành vi tải file xuống máy tính cục bộ
                                }
                                originalClick();
                            };
                            return el;
                        }
                        return originalCreateElement(tagName);
                    };

                    // NHẬN FILE MỚI TỪ REACT
                    window.addEventListener('message', (e) => {
                        if(e.data && e.data.type === 'LOAD_VIRTUAL_GALLERY') {
                            try {
                                const buffer = e.data.data;
                                const fn = e.data.fileName || 'room.zip';
                                const mime = fn.endsWith('.zip') ? 'application/zip' : 'application/json';
                                
                                const blob = new Blob([buffer], { type: mime });
                                const file = new File([blob], fn, { type: mime });
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                
                                document.querySelectorAll('input[type="file"]').forEach(input => {
                                    input.files = dataTransfer.files;
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                });
                            } catch (err) {
                                console.error('Lỗi khi nạp file vào iframe:', err);
                            }
                        }
                    });

                    window.parent.postMessage({ type: 'IFRAME_APP_READY' }, '*');

                    // THAY ĐỔI GIAO DIỆN THEO PHONG CÁCH BLACK & GOLD
                    const redesignUI = () => {
                        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                        let node;
                        while ((node = walker.nextNode())) {
                            if (node.nodeValue) {
                                const val = node.nodeValue.trim().toUpperCase();
                                if (val.includes('BẢN QUYỀN') || val.includes('NESTORA') || 
                                    val.includes('USER:') || val.includes('KUTOM') || 
                                    val.includes('@GMAIL.COM') || val.includes('1.0.34')) {
                                    let parent = node.parentElement;
                                    if (parent) {
                                        parent.style.setProperty('display', 'none', 'important');
                                        const container = parent.closest('div[style*="fixed"], div[style*="absolute"], footer, div[class*="footer"]');
                                        if (container && container.clientHeight < 100) container.style.setProperty('display', 'none', 'important');
                                    }
                                }
                            }
                        }

                        document.body.style.setProperty('background', '#121212', 'important');
                        document.body.style.setProperty('color', '#e0e0e0', 'important');
                        
                        document.querySelectorAll('button, div[role="button"]').forEach(btn => {
                            const txt = (btn.innerText || '').toUpperCase();
                            
                            if (txt.includes('TẠO LINK CHIA SẺ') || txt.includes('LOAD FILE')) {
                                btn.style.setProperty('display', 'none', 'important');
                                return;
                            }

                            if (txt.includes('LƯU FILE')) {
                                btn.innerHTML = '☁️ LƯU LÊN ĐÁM MÂY';
                                btn.style.setProperty('background', 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', 'important');
                                btn.style.setProperty('color', '#1a1a1a', 'important');
                                btn.style.setProperty('border', 'none', 'important');
                                btn.style.setProperty('border-radius', '8px', 'important');
                                btn.style.setProperty('box-shadow', '0 4px 15px rgba(218, 165, 32, 0.4)', 'important');
                                btn.style.setProperty('font-weight', '900', 'important');
                            } else if (txt.includes('TẠO PHÒNG') || txt.includes('PHÒNG TRƯNG BÀY') || txt.includes('BẮT ĐẦU')) {
                                btn.style.setProperty('background', '#1a1a1a', 'important');
                                btn.style.setProperty('color', '#FFD700', 'important');
                                btn.style.setProperty('border', '1px solid #FFD700', 'important');
                                btn.style.setProperty('border-radius', '8px', 'important');
                                btn.style.setProperty('box-shadow', '0 2px 10px rgba(0,0,0,0.5)', 'important');
                            }
                        });
                    };

                    redesignUI();
                    setInterval(redesignUI, 300);

                    const style = document.createElement('style');
                    style.innerHTML = "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&display=swap'); * { font-family: 'Montserrat', sans-serif !important; }";
                    document.head.appendChild(style);
                `;
                doc.head.insertBefore(script, doc.head.firstChild);

                setTimeout(() => setIframeReady(true), 200);
            } catch (e) {
                console.error("Lỗi Iframe:", e);
                setIframeReady(true);
            }
        };

        return (
            <div className="w-full h-screen bg-[#121212] overflow-hidden relative">
                {(!iframeReady || isSaving) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-t-[#FFD700] border-r-transparent border-b-[#FFD700] border-l-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="mt-4 text-[#FFD700] font-bold tracking-widest uppercase mb-1">
                                {saveProgress > 0 && saveProgress < 100 ? `Đang tải lên Đám Mây: ${saveProgress}%` : "Đang kết nối thư viện..."}
                            </p>
                            {saveProgress > 0 && saveProgress < 100 && (
                                <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
                                     <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300" style={{width: `${saveProgress}%`}}></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {onBack && (
                    <button 
                        onClick={() => { 
                            // Nếu mở từ share link (không có user context hoặc mở thẳng) thì Back ra ngoài
                            const urlParams = new URLSearchParams(window.location.search);
                            if (urlParams.get('id')) {
                                // Xóa url params 
                                window.history.replaceState({}, document.title, window.location.pathname);
                            }
                            setMode('DASHBOARD'); 
                            setCurrentGallery(null); 
                            if (!user && onBack) onBack(); 
                        }}
                        className="absolute bottom-5 left-5 z-[9999] px-6 py-3 bg-black/80 text-[#FFD700] border border-[#FFD700]/50 rounded-xl font-bold hover:bg-[#FFD700] hover:text-black transition duration-300 shadow-2xl backdrop-blur-sm"
                    >
                        ⟵ Trở về Menu Quản Lý
                    </button>
                )}

                <iframe 
                    ref={iframeRef}
                    onLoad={handleIframeLoad}
                    src="/phongtranh3dmoi/Phòng tranh 3dmoi.html" 
                    className="w-full h-full border-none absolute top-0 left-0"
                    style={{ opacity: iframeReady ? 1 : 0, transition: 'opacity 0.4s' }}
                    title="Phòng Tranh 3D"
                    allowFullScreen
                />
            </div>
        );
    }

    // DASHBOARD MODE
    return (
        <div className="min-h-screen flex bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600">
            {/* Sidebar Trái */}
            <div className="w-64 bg-gradient-to-b from-purple-700 to-purple-800 p-6 flex flex-col gap-4 shadow-2xl z-10">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🖼️</span> Phòng Tranh 3D
                    </h2>
                </div>

                <button
                    onClick={onBack}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    <Home size={20} />
                    Về trang chủ
                </button>

                <button
                    onClick={() => window.open('https://zalo.me/0975509490', '_blank')}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    <HelpCircle size={20} />
                    Hướng dẫn sử dụng
                </button>

                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-3 w-full px-4 py-3 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-white/20 text-white hover:bg-white/30"
                >
                    <Plus size={20} />
                    Tạo phòng mới
                </button>

                <button
                    className="flex items-center gap-3 w-full px-4 py-3 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-green-400 to-emerald-500 text-white"
                >
                    <BookOpen size={20} />
                    Phòng của tôi
                </button>
            </div>

            {/* Màn hình phải (Thư viện) */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 bg-white rounded-l-[40px] p-8 overflow-y-auto relative z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="my-galleries"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h1 className="text-3xl font-bold text-purple-800">Cơ sở dữ liệu Đám Mây</h1>
                                <button
                                    onClick={handleCreateNew}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                >
                                    <Plus size={20} />
                                    Tạo phòng mới
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center p-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                                </div>
                            ) : galleries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-24 h-24 mb-6 opacity-80 text-6xl text-center">🖼️</div>
                                    <h3 className="text-2xl font-bold text-gray-700 mb-2">Bạn chưa có phòng triển lãm nào</h3>
                                    <p className="text-gray-500 mb-6 text-center max-w-sm">
                                        Mọi phòng tranh bạn thiết kế sẽ được lưu trữ an toàn trên Cơ Sở Dữ Liệu mây Firebase.
                                    </p>
                                    <button
                                        onClick={handleCreateNew}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    >
                                        + Bắt đầu thiết kế ngay
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-4 pb-10">
                                    {galleries.map(gallery => (
                                        <motion.div
                                            key={gallery.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all flex flex-col"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="text-lg font-bold text-gray-800 truncate flex-1 pr-4">{gallery.title}</h4>
                                                <span className="px-3 py-1 rounded-full bg-yellow-500 text-black text-xs font-black shadow-sm flex-shrink-0">
                                                    ĐÃ LƯU MÂY
                                                </span>
                                            </div>

                                            <p className="text-gray-500 text-sm mb-4">
                                                Cập nhật: {new Date(gallery.updatedAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}
                                            </p>

                                            <div className="mt-auto grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); window.open(`/share/phong-tranh-3d/${gallery.id}`, '_blank'); }}
                                                    className="py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1"
                                                >
                                                    <Play size={14} /> Xem (View)
                                                </button>

                                                <button
                                                    onClick={() => handleOpenGallery(gallery)}
                                                    className="py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1"
                                                >
                                                    <Edit3 size={14} /> Chỉnh sửa
                                                </button>
                                                
                                                <button
                                                    onClick={(e) => handleShare(e, gallery)}
                                                    disabled={isCopyingLink === gallery.id}
                                                    className="col-span-2 py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1 disabled:opacity-70"
                                                >
                                                    {copiedId === gallery.id ? (
                                                        <><CheckCircle2 size={14} /> Đã sao chép Link!</>
                                                    ) : (
                                                        <><Share2 size={14} /> Copy link chia sẻ</>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={(e) => handleDeleteGallery(e, gallery.id)}
                                                    className="col-span-2 py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1 opacity-80 hover:opacity-100"
                                                >
                                                    <Trash2 size={14} /> Xóa vĩnh viễn
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Copied Toast */}
            <AnimatePresence>
                {copiedId && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold shadow-2xl z-50 flex items-center gap-2"
                    >
                        <CheckCircle2 size={20} /> Đã sao chép link chia sẻ vào khay nhớ tạm!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
