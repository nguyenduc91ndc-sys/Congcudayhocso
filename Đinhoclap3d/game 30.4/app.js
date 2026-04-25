import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ================================================================
// 1. KHỞI TẠO — Renderer, Scene, Camera, Controls
// ================================================================
const canvas = document.querySelector('#scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#b0d4f1', 0.01);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(20, 14, 20);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.target.set(0, 1, 0);

// ================================================================
// 2. ÁNH SÁNG CINEMATIC
// ================================================================
scene.add(new THREE.AmbientLight('#c8dff5', 0.6));
scene.add(new THREE.HemisphereLight('#87ceeb', '#3a5f0b', 0.8));

const sunLight = new THREE.DirectionalLight('#fff5e0', 2.0);
sunLight.position.set(12, 25, 15);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -20; sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20; sunLight.shadow.camera.bottom = -20;
sunLight.shadow.bias = -0.0002;
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight('#ffd4a3', 0.5);
rimLight.position.set(-10, 8, -15);
scene.add(rimLight);

const fountainPtLight = new THREE.PointLight('#88ddff', 1.5, 10);
fountainPtLight.position.set(0, 2, 1);
scene.add(fountainPtLight);

// ================================================================
// 3. UI REFERENCES
// ================================================================
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const infoPanel = document.getElementById('info-panel');
const btnSpeak = document.getElementById('btn-speak');
const panelTitle = document.getElementById('panel-title');
const panelDesc = document.getElementById('panel-description');
const panelIcon = document.getElementById('panel-icon');
const panelMeta = document.getElementById('panel-meta');
const panelDetails = document.getElementById('panel-details');
const panelFact = document.getElementById('panel-fact');
const hotspotLabelsContainer = document.getElementById('hotspot-labels');
const btnResetView = document.getElementById('btn-reset-view');
const btnInfo = document.getElementById('btn-info');
const btnToggleRotation = document.getElementById('btn-toggle-rotation');
const iconPause = document.getElementById('icon-pause');
const iconPlay = document.getElementById('icon-play');
const aboutModal = document.getElementById('about-modal');

// ================================================================
// 4. DỮ LIỆU HOTSPOT — Chi tiết lịch sử
// ================================================================
const hotspotsData = [
    {
        id: 'tank390',
        position: new THREE.Vector3(0, 1.5, 5.5),
        title: 'Xe tăng T-54B số hiệu 390',
        icon: '🪖',
        meta: '⏰ 10:45 sáng — 30/4/1975',
        description: 'Chiếc xe tăng T-54B mang số hiệu 390 thuộc Đại đội 4, Tiểu đoàn 1, Lữ đoàn Tăng Thiết giáp 203 đã húc đổ cổng chính Dinh Độc Lập vào lúc 10h45 ngày 30/4/1975.',
        details: 'Kíp xe gồm 4 người: Trưởng xe — Đại úy Bùi Quang Thận, Lái xe — Nguyễn Văn Tập, Pháo thủ — Thái Bá Minh, Nạp đạn viên — Lê Văn Phượng. Sau khi húc đổ cổng, Bùi Quang Thận đã ôm lá cờ Mặt trận DTGPMN chạy lên nóc Dinh cắm cờ.',
        fact: '💡 Xe tăng 390 hiện được trưng bày tại Bảo tàng Lực lượng Tăng Thiết giáp, Hà Nội.',
    },
    {
        id: 'tank843',
        position: new THREE.Vector3(4.5, 1.5, 6.5),
        title: 'Xe tăng T-54B số hiệu 843',
        icon: '🎖️',
        meta: '⏰ 10:45 sáng — 30/4/1975',
        description: 'Chiếc xe tăng T-54B số hiệu 843 thuộc Tiểu đoàn 2, Lữ đoàn 203 — là chiếc tăng đầu tiên tiến vào khuôn viên Dinh Độc Lập qua cổng phụ bên trái.',
        details: 'Trưởng xe: Đại úy Bùi Văn Tiến. Xe 843 đi vào cổng phụ khi xe 390 húc cổng chính. Cả hai cùng thuộc đội hình thọc sâu của Quân đoàn 2.',
        fact: '💡 Xe tăng 843 hiện được trưng bày ngay tại sân Dinh Thống Nhất (Dinh Độc Lập), TP.HCM.',
    },
    {
        id: 'palace',
        position: new THREE.Vector3(0, 4, -2.5),
        title: 'Dinh Độc Lập (nay là Dinh Thống Nhất)',
        icon: '🏛️',
        meta: '🏗️ Xây dựng: 1962–1966 | KTS: Ngô Viết Thụ',
        description: 'Trụ sở làm việc của Tổng thống Việt Nam Cộng hòa. Tòa nhà do KTS Ngô Viết Thụ — người Việt Nam đầu tiên đoạt giải Khôi Nguyên La Mã — thiết kế.',
        details: 'Dinh có 100 phòng, 3 tầng chính, tầng hầm và sân thượng có bãi đáp trực thăng. Kiến trúc kết hợp Đông–Tây, mành sáo bê tông lấy cảm hứng từ chữ Hán "吉" (Cát) và "興" (Hưng).',
        fact: '💡 Nay là Di tích Quốc gia Đặc biệt, tham quan tại 135 Nam Kỳ Khởi Nghĩa, Q.1, TP.HCM.',
    },
    {
        id: 'flag',
        position: new THREE.Vector3(0, 7.8, -3.5),
        title: 'Lá cờ Giải phóng trên nóc Dinh',
        icon: '🇻🇳',
        meta: '⏰ 11:30 trưa — 30/4/1975',
        description: 'Lá cờ Mặt trận Dân tộc Giải phóng miền Nam Việt Nam (nửa đỏ nửa xanh, sao vàng) được cắm trên nóc Dinh, đánh dấu thời khắc thống nhất đất nước.',
        details: 'Đại úy Bùi Quang Thận — Trưởng xe tăng 390, sau khi húc đổ cổng đã ôm cờ chạy lên nóc Dinh cắm vào lúc 11h30 trưa. Lá cờ do anh luôn mang theo bên mình.',
        fact: '💡 Lá cờ gốc hiện lưu giữ tại Bảo tàng Lịch sử Quân sự Việt Nam.',
    },
    {
        id: 'gate',
        position: new THREE.Vector3(0, 1.5, 4.5),
        title: 'Cổng chính Dinh Độc Lập bị húc đổ',
        icon: '🚪',
        meta: '⏰ 10:45 sáng — 30/4/1975',
        description: 'Cánh cổng sắt chính bị xe tăng 390 húc đổ — khoảnh khắc biểu tượng đánh dấu sự sụp đổ hoàn toàn của chính quyền Sài Gòn.',
        details: 'Theo lệnh chỉ huy, xe tăng 390 tăng tốc húc thẳng cổng chính. Cánh cổng sắt nặng bị bật tung. Xe tiến vào sân cỏ, dừng trước Dinh. Đại tá Bùi Tín đại diện quân giải phóng vào tiếp nhận sự đầu hàng.',
        fact: '💡 Cánh cổng sau đó được phục dựng nguyên trạng để phục vụ khách tham quan.',
    }
];

const hotspotElements = [];

// ================================================================
// 5. HÀM PHỤ TRỢ
// ================================================================
function createNumberTexture(number) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0)';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(number, 64, 48);
    return new THREE.CanvasTexture(c);
}

// Vật liệu dùng chung
const MAT = {
    wall: new THREE.MeshStandardMaterial({ color: '#f5f0e1', roughness: 0.3 }),
    wallDark: new THREE.MeshStandardMaterial({ color: '#d4cbb8', roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#6ba3c7', roughness: 0.1, metalness: 0.3 }),
    fin: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15 }),
    iron: new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.7, roughness: 0.4 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.8 }),
    grass: new THREE.MeshStandardMaterial({ color: '#4caf50', roughness: 0.85 }),
    darkGrass: new THREE.MeshStandardMaterial({ color: '#357a38', roughness: 0.9 }),
    path: new THREE.MeshStandardMaterial({ color: '#666', roughness: 0.8 }),
    tank: new THREE.MeshStandardMaterial({ color: '#4a5632', roughness: 0.5, metalness: 0.2 }),
    tankDark: new THREE.MeshStandardMaterial({ color: '#3d4a2b', roughness: 0.6, metalness: 0.2 }),
    soldier: new THREE.MeshStandardMaterial({ color: '#3d522b' }),
    skin: new THREE.MeshStandardMaterial({ color: '#ffdbac' }),
    trunk: new THREE.MeshStandardMaterial({ color: '#5a3a1a', roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#2d6a4f' }),
    palmLeaf: new THREE.MeshStandardMaterial({ color: '#2d8a3d', side: THREE.DoubleSide }),
    flameLeaf: new THREE.MeshStandardMaterial({ color: '#d4380d', roughness: 0.7 }),
    water: new THREE.MeshStandardMaterial({ color: '#00e5ff', transparent: true, opacity: 0.7, emissive: '#006064', emissiveIntensity: 0.4 }),
};

// ================================================================
// 6. ANIMATION COLLECTIONS
// ================================================================
let flagMesh = null;
const fountainJets = [];
const confettiPieces = [];
let smokeSystem = null;

// ================================================================
// 7. TẠO BẦU TRỜI GRADIENT
// ================================================================
function createSkyDome() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#1a6fd4');
    g.addColorStop(0.3, '#4da6ff');
    g.addColorStop(0.55, '#87ceeb');
    g.addColorStop(0.8, '#c8e6ff');
    g.addColorStop(1.0, '#fff8ef');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
    const skyMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 20), skyMat);
    scene.add(sky);
}

// ================================================================
// 8. DINH ĐỘC LẬP — Chi tiết kiến trúc
// ================================================================
function createPalace() {
    const p = new THREE.Group();

    // Bệ / Podium
    const podium = new THREE.Mesh(new THREE.BoxGeometry(13, 0.6, 7), MAT.wallDark);
    podium.position.y = 0.3; podium.receiveShadow = true;
    p.add(podium);

    // Bậc thang trước (4 bậc)
    for (let i = 0; i < 4; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(3.5 - i * 0.05, 0.15, 0.35), MAT.wall);
        step.position.set(0, 0.08 + i * 0.15, 3.7 - i * 0.35);
        step.receiveShadow = true;
        p.add(step);
    }

    // Tầng 1 — Tòa nhà chính
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.8, 5.5), MAT.wall);
    f1.position.y = 1.5; f1.castShadow = true; f1.receiveShadow = true;
    p.add(f1);

    // Portico (hiên trước) nhô ra
    const portico = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 1), MAT.wall);
    portico.position.set(0, 1.5, 3.2); portico.castShadow = true;
    p.add(portico);

    // Cột trụ (4 cột)
    const colMat = new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.15, metalness: 0.1 });
    [-1.2, -0.4, 0.4, 1.2].forEach(x => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.8, 8), colMat);
        col.position.set(x, 1.5, 3.75); col.castShadow = true;
        p.add(col);
    });

    // Tầng 2
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 5.5), MAT.wall);
    f2.position.y = 3.15; f2.castShadow = true;
    p.add(f2);

    // Ban công tầng 2
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.12, 0.9), MAT.wall);
    balcony.position.set(0, 2.48, 3.2);
    p.add(balcony);
    // Lan can
    const rMat = new THREE.MeshStandardMaterial({ color: '#ddd' });
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.04, 0.04), rMat);
    railTop.position.set(0, 2.85, 3.6);
    p.add(railTop);
    for (let x = -2.6; x <= 2.6; x += 0.35) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.03), rMat);
        post.position.set(x, 2.67, 3.6);
        p.add(post);
    }

    // Tầng 3 — Mành sáo đặc trưng
    const f3 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 5.5), MAT.wall);
    f3.position.y = 4.65; f3.castShadow = true;
    p.add(f3);

    // Mành sáo (Iconic Vertical Fins)
    for (let i = -18; i <= 18; i++) {
        if (Math.abs(i) < 2) continue;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.22), MAT.fin);
        fin.position.set(i * 0.32, 4.65, 2.86);
        p.add(fin);
    }

    // Cửa sổ kính (recesses) tầng 1 và 2
    [1.5, 3.15].forEach(yBase => {
        for (let x = -5; x <= 5; x += 1.4) {
            if (Math.abs(x) < 1.3) continue;
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.08), MAT.glass);
            win.position.set(x, yBase, 2.78);
            p.add(win);
        }
    });

    // Tầng thượng (Penthouse)
    const pent = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.9, 3), MAT.wall);
    pent.position.y = 5.85; pent.castShadow = true;
    p.add(pent);

    // Cột cờ
    const poleMat = new THREE.MeshStandardMaterial({ color: '#ccc', metalness: 0.8, roughness: 0.2 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8), poleMat);
    pole.position.y = 7.2;
    p.add(pole);

    // LÁ CỜ TUNG BAY
    const flagGeo = new THREE.PlaneGeometry(1.3, 0.8, 12, 12);
    const flagMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const fc = document.createElement('canvas');
    fc.width = 256; fc.height = 128;
    const fctx = fc.getContext('2d');
    fctx.fillStyle = '#da251d'; fctx.fillRect(0, 0, 256, 64);
    fctx.fillStyle = '#0072b0'; fctx.fillRect(0, 64, 256, 128);
    const drawStar = (cx, cy, sp, out, inn) => {
        let rot = Math.PI / 2 * 3, x, y, step = Math.PI / sp;
        fctx.beginPath(); fctx.moveTo(cx, cy - out);
        for (let i = 0; i < sp; i++) {
            x = cx + Math.cos(rot) * out; y = cy + Math.sin(rot) * out; fctx.lineTo(x, y); rot += step;
            x = cx + Math.cos(rot) * inn; y = cy + Math.sin(rot) * inn; fctx.lineTo(x, y); rot += step;
        }
        fctx.closePath(); fctx.fillStyle = '#ffff00'; fctx.fill();
    };
    drawStar(128, 64, 5, 25, 10);
    flagMat.map = new THREE.CanvasTexture(fc);
    flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0.65, 8.2, 0);
    p.add(flagMesh);

    p.position.set(0, 0.1, -3.5);
    return p;
}

// ================================================================
// 9. XE TĂNG T-54 — Chi tiết hơn
// ================================================================
function createTank(num, pos, rot) {
    const t = new THREE.Group();
    const mat = MAT.tank;

    // Thân xe
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.8), mat);
    hull.position.y = 0.42; hull.castShadow = true;
    t.add(hull);

    // Mũi xe (xiên)
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.6), mat);
    nose.position.set(0, 0.55, 1.6); nose.rotation.x = -0.3;
    t.add(nose);

    // Đuôi xe
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.3), MAT.tankDark);
    tail.position.set(0, 0.5, -1.5);
    t.add(tail);

    // Pháo tháp
    const turret = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    turret.position.y = 0.75; turret.castShadow = true;
    t.add(turret);

    // Nòng pháo
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4), mat);
    gun.rotation.x = Math.PI / 2; gun.position.set(0, 0.85, 1.5);
    t.add(gun);

    // Bánh xích (6 bánh mỗi bên)
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 });
    for (let side = -1; side <= 1; side += 2) {
        // Tấm che xích
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 2.6), MAT.tankDark);
        skirt.position.set(side * 0.84, 0.28, 0);
        t.add(skirt);
        for (let i = 0; i < 6; i++) {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(side * 0.88, 0.17, -1.1 + i * 0.45);
            t.add(wheel);
        }
    }

    // Ăng-ten
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5), new THREE.MeshBasicMaterial({ color: '#555' }));
    antenna.position.set(-0.3, 1.5, -0.3);
    t.add(antenna);

    // Số hiệu xe
    const tex = createNumberTexture(num);
    const numPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    numPlane.position.set(0.81, 0.5, 0); numPlane.rotation.y = Math.PI / 2;
    t.add(numPlane);
    const numL = numPlane.clone(); numL.position.x = -0.81; numL.rotation.y = -Math.PI / 2;
    t.add(numL);

    t.position.copy(pos);
    if (rot) t.rotation.y = rot;
    return t;
}

// ================================================================
// 10. CỔNG SẮT BỊ HÚC ĐỔ
// ================================================================
function createBrokenGate() {
    const gate = new THREE.Group();

    // Trụ cổng (2 trụ đá)
    [-2.2, 2.2].forEach(x => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.5), MAT.wallDark);
        pillar.position.set(x, 1.1, 0);
        pillar.castShadow = true;
        // Nắp trụ
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.15, 0.65), MAT.wall);
        cap.position.set(x, 2.25, 0);
        gate.add(pillar, cap);
    });

    // Xà ngang (bị lệch)
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(4, 0.07, 0.07), MAT.iron);
    topBar.position.set(0.3, 2, 0.2);
    topBar.rotation.z = 0.12; topBar.rotation.x = 0.08;
    gate.add(topBar);

    // Song sắt — chia 3 khu vực: trái (đứng), giữa (đổ), phải (đứng)
    for (let i = -5; i <= 5; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.9, 4), MAT.iron);
        const x = i * 0.36;
        if (Math.abs(i) <= 2) {
            // Giữa: bị xe tăng húc đổ
            bar.geometry = new THREE.CylinderGeometry(0.022, 0.022, 1.9, 4);
            bar.position.set(x + Math.random() * 0.2, 0.25, 0.6);
            bar.rotation.x = -Math.PI / 2.2 + (Math.random() - 0.5) * 0.3;
            bar.rotation.z = (Math.random() - 0.5) * 0.4;
        } else if (Math.abs(i) === 3) {
            // Gần giữa: bị cong
            bar.position.set(x, 0.95, 0.15);
            bar.rotation.z = i > 0 ? 0.15 : -0.15;
        } else {
            // Hai bên: còn đứng
            bar.position.set(x, 1, 0);
        }
        gate.add(bar);
    }

    gate.position.set(0, 0, 4.5);
    return gate;
}

// ================================================================
// 11. BỘ ĐỘI GIẢI PHÓNG
// ================================================================
function createSoldier(x, y, z, rotY, raiseArm) {
    const s = new THREE.Group();
    // Thân
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), MAT.soldier);
    s.add(body);
    // Đầu
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), MAT.skin);
    head.position.y = 0.28;
    s.add(head);
    // Mũ cối
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2e3d1f' }));
    helmet.position.y = 0.32;
    s.add(helmet);
    // Chân
    [-0.06, 0.06].forEach(xOff => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), MAT.soldier);
        leg.position.set(xOff, -0.3, 0);
        s.add(leg);
    });
    // Tay trái
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.05), MAT.soldier);
    armL.position.set(-0.15, 0.05, 0);
    s.add(armL);
    // Tay phải (có thể giơ cao)
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.05), MAT.soldier);
    if (raiseArm) {
        armR.position.set(0.15, 0.25, 0);
        armR.rotation.z = -Math.PI / 2.5;
    } else {
        armR.position.set(0.15, 0.05, 0);
    }
    s.add(armR);

    s.position.set(x, y, z);
    s.rotation.y = rotY || 0;
    return s;
}

// ================================================================
// 12. CÂY CỐI ĐA DẠNG
// ================================================================
function createRegularTree(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.9), MAT.trunk);
    trunk.position.y = 0.45;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), MAT.leaf);
    crown.position.y = 1.2; crown.castShadow = true;
    t.add(trunk, crown);
    t.position.set(x, 0, z);
    return t;
}

function createPalmTree(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 3.8, 6), MAT.trunk);
    trunk.position.y = 1.9;
    t.add(trunk);
    // Lá
    for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.3;
        const leafGeo = new THREE.ConeGeometry(0.15, 2.2, 3);
        leafGeo.translate(0, -1.1, 0);
        const leaf = new THREE.Mesh(leafGeo, MAT.palmLeaf);
        leaf.position.set(0, 3.8, 0);
        leaf.rotation.y = angle;
        leaf.rotation.x = Math.PI / 3.2;
        t.add(leaf);
    }
    t.position.set(x, 0, z);
    return t;
}

function createFlameTree(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 1.4, 6), MAT.trunk);
    trunk.position.y = 0.7;
    t.add(trunk);
    // Tán lá phượng đỏ (rộng, bẹt)
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), MAT.flameLeaf);
    canopy.scale.set(1, 0.35, 1);
    canopy.position.y = 1.8; canopy.castShadow = true;
    t.add(canopy);
    for (let i = 0; i < 4; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 6, 5), MAT.flameLeaf);
        blob.position.set((Math.random() - 0.5) * 1.8, 1.5 + Math.random() * 0.4, (Math.random() - 0.5) * 1.8);
        blob.scale.y = 0.45;
        t.add(blob);
    }
    t.position.set(x, 0, z);
    return t;
}

// ================================================================
// 13. HỆ THỐNG KHÓI TẠI CỔNG
// ================================================================
function createSmokeSystem() {
    const count = 50;
    const pos = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 3;
        pos[i * 3 + 1] = Math.random() * 1.5;
        pos[i * 3 + 2] = 4 + Math.random() * 2;
        vels.push({ x: (Math.random() - 0.5) * 0.015, y: 0.008 + Math.random() * 0.02, z: (Math.random() - 0.5) * 0.01 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // Tạo texture khói tròn
    const sc = document.createElement('canvas');
    sc.width = 32; sc.height = 32;
    const sctx = sc.getContext('2d');
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(180,180,180,0.5)');
    grad.addColorStop(1, 'rgba(180,180,180,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);

    const mat = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(sc),
        transparent: true, opacity: 0.35,
        size: 1.2, depthWrite: false,
        blending: THREE.NormalBlending,
    });
    const smoke = new THREE.Points(geo, mat);
    smoke.userData.velocities = vels;
    return smoke;
}

// ================================================================
// 14. LẮP RÁP SA BÀN
// ================================================================
function createDiorama() {
    createSkyDome();

    // ĐẾ SA BÀN
    const base = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 24), new THREE.MeshStandardMaterial({ color: '#1a1d15', roughness: 1 }));
    base.position.y = -0.5; base.receiveShadow = true;
    scene.add(base);

    // CỎ (hình tròn, nhiều tầng)
    const grassMain = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.15, 48), MAT.grass);
    grassMain.position.y = 0.08; grassMain.receiveShadow = true;
    scene.add(grassMain);
    // Viền cỏ đậm
    const grassRing = new THREE.Mesh(new THREE.TorusGeometry(11, 0.15, 4, 48), MAT.darkGrass);
    grassRing.rotation.x = Math.PI / 2; grassRing.position.y = 0.05;
    scene.add(grassRing);

    // ĐƯỜNG ĐI
    const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 18), MAT.path);
    mainPath.rotation.x = -Math.PI / 2; mainPath.position.set(0, 0.09, 2);
    mainPath.receiveShadow = true;
    scene.add(mainPath);
    // Viền đường
    [-1.8, 1.8].forEach(x => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 18), MAT.concrete);
        curb.position.set(x, 0.1, 2);
        scene.add(curb);
    });
    // Đường ngang trước cổng
    const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.5), MAT.path);
    crossPath.rotation.x = -Math.PI / 2; crossPath.position.set(0, 0.085, 8);
    scene.add(crossPath);

    // BỒN HOA
    const flowerColors = ['#ff6b6b', '#ffd93d', '#ff78ae', '#c084fc'];
    [[-3, 3], [3, 3], [-3, -1], [3, -1]].forEach(([fx, fz], idx) => {
        const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8), MAT.darkGrass);
        bed.position.set(fx, 0.08, fz);
        scene.add(bed);
        for (let i = 0; i < 8; i++) {
            const flower = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4),
                new THREE.MeshStandardMaterial({ color: flowerColors[(idx + i) % flowerColors.length] }));
            flower.position.set(fx + (Math.random() - 0.5) * 0.6, 0.2, fz + (Math.random() - 0.5) * 0.6);
            scene.add(flower);
        }
    });

    // ĐÀI PHUN NƯỚC
    const fountain = new THREE.Group();
    fountain.position.set(0, 0.1, 1);
    const basin = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 8, 32), MAT.concrete);
    basin.rotation.x = Math.PI / 2;
    fountain.add(basin);
    const waterSurface = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), MAT.water);
    waterSurface.rotation.x = -Math.PI / 2;
    fountain.add(waterSurface);
    // Bệ phun giữa
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8), MAT.concrete);
    pedestal.position.y = 0.4;
    fountain.add(pedestal);
    // Tia nước
    const jetMat = new THREE.MeshStandardMaterial({ color: '#fff', transparent: true, opacity: 0.7 });
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.035, 1), jetMat);
        jet.position.set(Math.cos(angle) * 1.1, 0.5, Math.sin(angle) * 1.1);
        jet.lookAt(0, 1.8, 1);
        jet.userData.initialY = 0.5;
        jet.userData.phase = i * (Math.PI / 6);
        jet.userData.type = 'jet';
        fountainJets.push(jet);
        fountain.add(jet);
    }
    // Hàng rào bồn hoa quanh đài
    const hedge = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 6, 48), MAT.darkGrass);
    hedge.rotation.x = Math.PI / 2;
    fountain.add(hedge);
    scene.add(fountain);

    // DINH ĐỘC LẬP
    scene.add(createPalace());

    // TƯỜNG & CỔNG
    const wallMat = new THREE.MeshStandardMaterial({ color: '#f0ece0', roughness: 0.5 });
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(7, 1.5, 0.25), wallMat);
    wallL.position.set(-5.7, 0.8, 5); wallL.castShadow = true;
    scene.add(wallL);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(7, 1.5, 0.25), wallMat);
    wallR.position.set(5.7, 0.8, 5); wallR.castShadow = true;
    scene.add(wallR);
    // Hàng rào sắt trên tường
    [-5.7, 5.7].forEach(baseX => {
        for (let i = -3; i <= 3; i++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), MAT.iron);
            bar.position.set(baseX + i * 0.5, 1.75, 5);
            scene.add(bar);
        }
    });
    scene.add(createBrokenGate());

    // XE TĂNG
    scene.add(createTank('390', new THREE.Vector3(0, 0.1, 5.5)));
    scene.add(createTank('843', new THREE.Vector3(4.5, 0.1, 6.5), -Math.PI / 5));

    // BỘ ĐỘI
    scene.add(createSoldier(0.5, 1.1, 5.5, 0, true));
    scene.add(createSoldier(4, 1.1, 6.5, -Math.PI / 4, true));
    scene.add(createSoldier(-2.5, 0.3, 4.2, Math.PI / 5, false));
    scene.add(createSoldier(2.5, 0.3, 4.2, -Math.PI / 5, true));
    scene.add(createSoldier(-1.5, 0.3, 5, Math.PI / 3, false));
    scene.add(createSoldier(1.8, 0.3, 5.5, -Math.PI / 6, true));

    // CÂY CỐI — Đa dạng
    // Cây dừa (palm) dọc đường
    [-3.5, 3.5].forEach(x => {
        for (let z = -2; z <= 6; z += 3) {
            scene.add(createPalmTree(x + (Math.random() - 0.5), z + (Math.random() - 0.5)));
        }
    });
    // Cây phượng đỏ (flame)
    scene.add(createFlameTree(-7, -2));
    scene.add(createFlameTree(7, -1));
    scene.add(createFlameTree(-6, 7));
    // Cây thường
    for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 9.5 + Math.random() * 2.5;
        scene.add(createRegularTree(Math.cos(a) * r, Math.sin(a) * r));
    }

    // CONFETTI
    const confettiColors = ['#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff00ff', '#fff'];
    for (let i = 0; i < 120; i++) {
        const c = new THREE.Mesh(
            new THREE.PlaneGeometry(0.05, 0.05),
            new THREE.MeshBasicMaterial({ color: confettiColors[Math.floor(Math.random() * confettiColors.length)], side: THREE.DoubleSide })
        );
        c.position.set((Math.random() - 0.5) * 25, 4 + Math.random() * 12, (Math.random() - 0.5) * 25);
        c.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        c.userData.speed = 0.015 + Math.random() * 0.04;
        c.userData.rotX = Math.random() * 0.08;
        c.userData.rotY = Math.random() * 0.08;
        c.userData.type = 'confetti';
        confettiPieces.push(c);
        scene.add(c);
    }

    // KHÓI tại cổng
    smokeSystem = createSmokeSystem();
    scene.add(smokeSystem);
}

// ================================================================
// 15. HOTSPOT — Khởi tạo & Cập nhật
// ================================================================
function setupHotspots() {
    hotspotsData.forEach(hotspot => {
        const el = document.createElement('div');
        el.className = 'hotspot-label';
        el.innerHTML = `
            <div class="hotspot-text">${hotspot.title}</div>
            <div class="hotspot-point"><div class="inner-dot"></div></div>
        `;
        el.addEventListener('click', () => showInfo(hotspot));
        hotspotLabelsContainer.appendChild(el);
        hotspotElements.push({ el, position: hotspot.position, id: hotspot.id });
    });
}

function updateHotspotsPosition() {
    hotspotElements.forEach(hp => {
        const v = hp.position.clone().project(camera);
        if (v.z > 1) { hp.el.classList.add('hidden'); return; }
        const x = (v.x * .5 + .5) * window.innerWidth;
        const y = (v.y * -.5 + .5) * window.innerHeight;
        hp.el.classList.remove('hidden');
        hp.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
}

// ================================================================
// 16. UI LOGIC & CAMERA & TTS
// ================================================================
let targetOrbitPos = new THREE.Vector3(0, 1, 0);

// TTS (Ngữ âm)
let currentSpeech = null;
let currentTextToSpeak = "";

function stopSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    btnSpeak.classList.remove('speaking');
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    stopSpeech(); // Dừng nếu đang đọc
    
    currentSpeech = new SpeechSynthesisUtterance(text);
    currentSpeech.lang = 'vi-VN';
    currentSpeech.rate = 1.0;
    
    currentSpeech.onend = () => btnSpeak.classList.remove('speaking');
    currentSpeech.onerror = () => btnSpeak.classList.remove('speaking');
    
    window.speechSynthesis.speak(currentSpeech);
    btnSpeak.classList.add('speaking');
}

btnSpeak.addEventListener('click', () => {
    if (window.speechSynthesis.speaking) {
        stopSpeech();
    } else {
        speakText(currentTextToSpeak);
    }
});

function showInfo(data) {
    panelTitle.textContent = data.title;
    panelDesc.textContent = data.description;
    panelIcon.textContent = data.icon;
    panelMeta.textContent = data.meta || '';
    panelDetails.textContent = data.details || '';
    panelFact.textContent = data.fact || '';
    infoPanel.classList.add('show');
    targetOrbitPos.copy(data.position);
    
    // Tạo nội dung đọc
    currentTextToSpeak = data.title + ". " + data.description;
    if (data.details) currentTextToSpeak += " " + data.details;
    if (data.fact) currentTextToSpeak += " Thông tin thêm: " + data.fact.replace('💡', '');
    stopSpeech(); // Reset trạng thái, chờ user tự click nút loa nếu muốn
}

document.getElementById('close-panel').addEventListener('click', () => {
    infoPanel.classList.remove('show');
    targetOrbitPos.set(0, 1, 0);
    stopSpeech();
});

btnResetView.addEventListener('click', () => {
    infoPanel.classList.remove('show');
    targetOrbitPos.set(0, 1, 0);
    stopSpeech();
});

btnInfo.addEventListener('click', () => aboutModal.classList.remove('hidden'));

document.querySelectorAll('.close-btn.modal-close').forEach(btn => {
    btn.addEventListener('click', () => aboutModal.classList.add('hidden'));
});

let isAutoRotate = true;
btnToggleRotation.addEventListener('click', () => {
    isAutoRotate = !isAutoRotate;
    iconPause.classList.toggle('hidden', !isAutoRotate);
    iconPlay.classList.toggle('hidden', isAutoRotate);
});

// ================================================================
// 17. NHẠC NỀN — Tự phát + Nút bật/tắt
// ================================================================
const bgAudio = document.getElementById('bg-audio');
const btnToggleMusic = document.getElementById('btn-toggle-music');
const iconMusicOn = document.getElementById('icon-music-on');
const iconMusicOff = document.getElementById('icon-music-off');
bgAudio.volume = 0.5;
let isMusicPlaying = false;

function tryAutoPlay() {
    bgAudio.play().then(() => {
        isMusicPlaying = true;
        iconMusicOn.classList.remove('hidden');
        iconMusicOff.classList.add('hidden');
    }).catch(() => {
        // Trình duyệt chặn autoplay → phát khi user click lần đầu
        const start = () => {
            bgAudio.play();
            isMusicPlaying = true;
            iconMusicOn.classList.remove('hidden');
            iconMusicOff.classList.add('hidden');
            document.removeEventListener('click', start);
            document.removeEventListener('touchstart', start);
        };
        document.addEventListener('click', start);
        document.addEventListener('touchstart', start);
    });
}

btnToggleMusic.addEventListener('click', (e) => {
    e.stopPropagation(); // Ngăn trigger autoplay listener
    if (isMusicPlaying) {
        bgAudio.pause();
        isMusicPlaying = false;
        iconMusicOn.classList.add('hidden');
        iconMusicOff.classList.remove('hidden');
    } else {
        bgAudio.play();
        isMusicPlaying = true;
        iconMusicOn.classList.remove('hidden');
        iconMusicOff.classList.add('hidden');
    }
});

// ================================================================
// 18. EVENTS
// ================================================================
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { aboutModal.classList.add('hidden'); infoPanel.classList.remove('show'); }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================================================================
// 19. LOADING
// ================================================================
function simulateLoading() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                tryAutoPlay();
                setTimeout(() => { loadingScreen.style.display = 'none'; }, 800);
            }, 1000);
        }
        loadingBar.style.width = progress + '%';
        loadingText.textContent = `Đang khởi tạo sa bàn lịch sử... ${Math.floor(progress)}%`;
    }, 100);
}

// ================================================================
// 20. VÒNG LẶP RENDER — Animation sống động
// ================================================================
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.05;

    // Cờ tung bay
    if (flagMesh) {
        const positions = flagMesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            positions.setZ(i, Math.sin(x * 2.5 + time * 2.5) * (x + 0.5) * 0.12);
        }
        positions.needsUpdate = true;
    }

    // Đài phun nước
    fountainJets.forEach(obj => {
        const wave = Math.sin(time * 3 + obj.userData.phase) * 0.3;
        obj.scale.y = 1 + wave;
        obj.position.y = obj.userData.initialY + wave * 0.4;
    });

    // Confetti rơi
    confettiPieces.forEach(c => {
        c.position.y -= c.userData.speed;
        c.rotation.x += c.userData.rotX;
        c.rotation.y += c.userData.rotY;
        if (c.position.y < 0.1) {
            c.position.y = 14;
            c.position.x = (Math.random() - 0.5) * 25;
            c.position.z = (Math.random() - 0.5) * 25;
        }
    });

    // Khói bay lên từ cổng
    if (smokeSystem) {
        const positions = smokeSystem.geometry.attributes.position;
        const vels = smokeSystem.userData.velocities;
        for (let i = 0; i < vels.length; i++) {
            positions.array[i * 3] += vels[i].x;
            positions.array[i * 3 + 1] += vels[i].y;
            positions.array[i * 3 + 2] += vels[i].z;
            if (positions.array[i * 3 + 1] > 3.5) {
                positions.array[i * 3] = (Math.random() - 0.5) * 3;
                positions.array[i * 3 + 1] = 0;
                positions.array[i * 3 + 2] = 4 + Math.random() * 2;
            }
        }
        positions.needsUpdate = true;
    }

    // Camera
    controls.target.lerp(targetOrbitPos, 0.05);
    if (!infoPanel.classList.contains('show') && isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.7;
    } else {
        controls.autoRotate = false;
    }

    controls.update();
    updateHotspotsPosition();
    renderer.render(scene, camera);
}

// ================================================================
// INIT
// ================================================================
createDiorama();
setupHotspots();
simulateLoading();
animate();
