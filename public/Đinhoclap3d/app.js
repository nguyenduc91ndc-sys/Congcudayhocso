import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// =============================================
// 1. KHỞI TẠO CAO CẤP
// =============================================
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.set(180, 70, 220);

const container = document.getElementById('canvas-container');
// Dọn dẹp canvas cũ nếu có (tránh rò rỉ bộ nhớ DOM)
while (container.firstChild) {
    container.removeChild(container.firstChild);
}

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        // Đã xóa powerPreference: "high-performance" vì nó có thể làm crash trên một số máy
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Tự động dọn dẹp và giải phóng hoàn toàn bộ nhớ WebGL khi Vite Hot Reload (lưu file)
    if (import.meta.hot) {
        import.meta.hot.dispose(() => {
            if (renderer) {
                renderer.dispose();
                renderer.forceContextLoss();
            }
        });
    }
} catch (e) {
    console.error("WebGL Init Error:", e);
    const errorLog = document.getElementById('error-log');
    if (errorLog) {
        errorLog.style.display = 'block';
        errorLog.style.fontSize = '16px';
        errorLog.style.lineHeight = '1.5';
        errorLog.innerHTML = '<strong>⚠️ Lỗi cạn bộ nhớ đồ họa (WebGL Context Limit)</strong><br>Trình duyệt của bạn đang mở quá nhiều bản vẽ 3D do lưu code nhiều lần hoặc mở nhiều tab.<br><br>👉 <strong>CÁCH SỬA: Hãy nhấn F5 để tải lại trang web là xong!</strong> (Hoặc đóng bớt các tab 3D đang mở).';
    }
    throw e; // Dừng code để không văng lỗi đỏ tùm lum nữa
}

// =============================================
// NỀN GRADIENT + ENVIRONMENT
// =============================================
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d');
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

// Load panorama cho environment map (phản chiếu ánh sáng)
const textureLoader = new THREE.TextureLoader();
textureLoader.load('sharp_panorama.png', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
});

// =============================================
// 2. ÂM THANH (HTML5 Audio — tránh lỗi linearRampToValueAtTime của Three.js AudioListener)
// =============================================
const sound = new Audio('music.mp3');
sound.loop = true;
sound.volume = 0.5;
// Thêm thuộc tính tương thích với code cũ dùng THREE.Audio API
sound.isPlaying = false;
sound.buffer = null;
sound.setVolume = function(v) { this.volume = v; };

// Đánh dấu buffer sẵn sàng khi file load xong
sound.addEventListener('canplaythrough', function() {
    sound.buffer = true; // Đánh dấu đã load xong (dùng cho logic ở startBtn)
}, { once: true });

// Cập nhật trạng thái isPlaying
sound.addEventListener('play', function() { sound.isPlaying = true; });
sound.addEventListener('pause', function() { sound.isPlaying = false; });
sound.addEventListener('ended', function() { sound.isPlaying = false; });

// =============================================
// 3. HẬU KỲ (BLOOM)
// =============================================
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    0.3, 0.4, 0.85
);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.renderToScreen = true;

// =============================================
// 4. ÁNH SÁNG (GOLDEN HOUR)
// =============================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffaa55, 2.0); 
mainLight.position.set(200, 300, 150);
mainLight.castShadow = true;
mainLight.shadow.camera.left = -500;
mainLight.shadow.camera.right = 500;
mainLight.shadow.camera.top = 500;
mainLight.shadow.camera.bottom = -500;
mainLight.shadow.mapSize.width = 4096;
mainLight.shadow.mapSize.height = 4096;
scene.add(mainLight);

const rimLight = new THREE.PointLight(0xffd700, 2.0, 1000);
rimLight.position.set(0, -50, 200);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x0033ff, 0.5, 2000);
fillLight.position.set(-300, 200, -300);
scene.add(fillLight);

// =============================================
// 4b. THEME SYSTEM (Đổi nền)
// =============================================
const themes = [
    { name: 'Hoàng hôn', colors: ['#1a0b1c', '#6d2345', '#d45d3c'], light: 0xffddaa },
    { name: 'Biển trời', colors: ['#0f172a', '#1e3a8a', '#38bdf8'], light: 0xeef8ff },
    { name: 'Đêm lễ hội', colors: ['#0f0514', '#3a0d3b', '#1c1b4d'], light: 0xffccff },
    { name: 'Thiên nhiên', colors: ['#0a140a', '#143618', '#2d5a27'], light: 0xe6ffe6 }
];
let currentThemeIdx = 0;

window.applyTheme = function(idx) {
    currentThemeIdx = idx % themes.length;
    const t = themes[currentThemeIdx];
    
    const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, t.colors[0]);
    bgGrad.addColorStop(0.5, t.colors[1]);
    bgGrad.addColorStop(1, t.colors[2]);
    bgCtx.fillStyle = bgGrad;
    bgCtx.fillRect(0, 0, 2, 512);
    bgTexture.needsUpdate = true;
    
    mainLight.color.setHex(t.light);
    rimLight.color.setHex(t.light);
};
window.applyTheme(0);

// =============================================
// 5. ĐIỀU KHIỂN
// =============================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.1;
controls.autoRotate = true; 
controls.autoRotateSpeed = 0.4;
controls.minDistance = 20;
controls.maxDistance = 800;

// Camera presets cho nút "Đổi góc nhìn"
const cameraPresets = [
    { pos: [180, 70, 220], label: 'Default' },
    { pos: [0, 150, 300], label: 'Front' },
    { pos: [-200, 100, 0], label: 'Side' },
    { pos: [0, 300, 50], label: 'Top' },
];
let currentPreset = 0;

// =============================================
// 6. TẠO TANK CHI TIẾT
// =============================================
function createTank(x, z, title, desc) {
    const tankGroup = new THREE.Group();
    
    const bodyGeo = new THREE.CylinderGeometry(15, 20, 50, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f3014, roughness: 0.9, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.rotation.z = Math.PI / 4;
    body.position.y = 10;
    body.castShadow = true;
    body.receiveShadow = true;
    tankGroup.add(body);
    
    const trackGeo = new THREE.BoxGeometry(10, 10, 55);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
    const leftTrack = new THREE.Mesh(trackGeo, trackMat);
    leftTrack.position.set(-18, 5, 0);
    leftTrack.castShadow = true;
    leftTrack.receiveShadow = true;
    tankGroup.add(leftTrack);
    
    const rightTrack = new THREE.Mesh(trackGeo, trackMat);
    rightTrack.position.set(18, 5, 0);
    rightTrack.castShadow = true;
    rightTrack.receiveShadow = true;
    tankGroup.add(rightTrack);

    const turretGeo = new THREE.SphereGeometry(12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const turret = new THREE.Mesh(turretGeo, bodyMat);
    turret.position.set(0, 15, -5);
    turret.scale.y = 0.5;
    turret.castShadow = true;
    turret.receiveShadow = true;
    tankGroup.add(turret);
    
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 2, 35),
        new THREE.MeshStandardMaterial({ color: 0x0a1a00, roughness: 0.7 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 17, 15);
    barrel.castShadow = true;
    tankGroup.add(barrel);

    // Thêm bánh xe chi tiết
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    for (let i = -2; i <= 2; i++) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2, 12), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(-19, 3, i * 10);
        wheel.castShadow = true;
        tankGroup.add(wheel);
        const wheel2 = wheel.clone();
        wheel2.position.set(19, 3, i * 10);
        tankGroup.add(wheel2);
    }

    // Số hiệu xe tăng (dùng box nhỏ làm biển số)
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.5), plateMat);
    plate.position.set(0, 8, 26);
    tankGroup.add(plate);

    tankGroup.position.set(x, 0, z);
    scene.add(tankGroup);

    // Hotspot is handled by HTML markers now

    return tankGroup;
}

// =============================================
// 6b. TẠO CỔNG DINH (BỊ HÚC ĐỔ)
// =============================================
function createGate(x, z, groundY) {
    const gateGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a0, roughness: 0.6, metalness: 0.1 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });

    // Trụ cổng trái
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(8, 50, 8), pillarMat);
    pillarL.position.set(-40, 25, 0);
    pillarL.castShadow = true; pillarL.receiveShadow = true;
    gateGroup.add(pillarL);

    // Đầu trụ trái (trang trí)
    const capL = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 12), pillarMat);
    capL.position.set(-40, 52, 0);
    capL.castShadow = true;
    gateGroup.add(capL);

    // Trụ cổng phải
    const pillarR = pillarL.clone();
    pillarR.position.set(40, 25, 0);
    gateGroup.add(pillarR);
    const capR = capL.clone();
    capR.position.set(40, 52, 0);
    gateGroup.add(capR);

    // Thanh ngang trên
    const beam = new THREE.Mesh(new THREE.BoxGeometry(88, 6, 4), pillarMat);
    beam.position.set(0, 48, 0);
    beam.castShadow = true;
    gateGroup.add(beam);

    // Cánh cổng trái — BỊ HÚC NGHIÊNG
    const gateL = new THREE.Mesh(new THREE.BoxGeometry(35, 40, 2), ironMat);
    gateL.position.set(-20, 20, 8);
    gateL.rotation.y = 0.6;  // Bị đẩy mở
    gateL.rotation.z = -0.15; // Hơi nghiêng
    gateL.castShadow = true;
    gateGroup.add(gateL);

    // Song sắt trên cánh trái
    for (let i = -3; i <= 3; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 38), ironMat);
        bar.position.set(i * 4.5 - 20, 20, 8);
        bar.rotation.y = 0.6; bar.rotation.z = -0.15;
        gateGroup.add(bar);
    }

    // Cánh cổng phải — BỊ HÚC ĐỔ MẠNH HƠN
    const gateR = new THREE.Mesh(new THREE.BoxGeometry(35, 40, 2), ironMat);
    gateR.position.set(18, 15, 15);
    gateR.rotation.y = -1.0;  // Bị húc mạnh
    gateR.rotation.z = 0.3;   // Nghiêng đổ
    gateR.rotation.x = 0.1;
    gateR.castShadow = true;
    gateGroup.add(gateR);

    // Song sắt trên cánh phải
    for (let i = -3; i <= 3; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 38), ironMat);
        bar.position.set(i * 4.5 + 18, 15, 15);
        bar.rotation.y = -1.0; bar.rotation.z = 0.3; bar.rotation.x = 0.1;
        gateGroup.add(bar);
    }

    // Mảnh vỡ dưới đất
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
        const size = 2 + Math.random() * 4;
        const debris = new THREE.Mesh(
            new THREE.BoxGeometry(size, size * 0.3, size),
            debrisMat
        );
        debris.position.set(
            -10 + Math.random() * 30,
            size * 0.15,
            5 + Math.random() * 20
        );
        debris.rotation.set(Math.random(), Math.random(), Math.random());
        debris.castShadow = true; debris.receiveShadow = true;
        gateGroup.add(debris);
    }

    gateGroup.position.set(x, groundY, z);
    scene.add(gateGroup);

    // Hotspot is handled by HTML markers now
    return gateGroup;
}

// =============================================
// 6c. CỘT CỜ VỚI LÁ CỜ VIỆT NAM
// =============================================
function createFlagPole(x, z, groundY) {
    const flagGroup = new THREE.Group();

    // Cột cờ
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 80), poleMat);
    pole.position.set(0, 40, 0);
    pole.castShadow = true;
    flagGroup.add(pole);

    // Đế cột cờ
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 5, 8), 
        new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.7 }));
    base.position.set(0, 2.5, 0);
    base.castShadow = true; base.receiveShadow = true;
    flagGroup.add(base);

    // Lá cờ đỏ sao vàng (dùng plane)
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 512; flagCanvas.height = 340;
    const ctx = flagCanvas.getContext('2d');
    // Nền đỏ
    ctx.fillStyle = '#DA251D';
    ctx.fillRect(0, 0, 512, 340);
    // Sao vàng 5 cánh
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    const cx = 256, cy = 170, r = 70;
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const innerAngle = angle + Math.PI / 5;
        const outerX = cx + r * Math.cos(angle);
        const outerY = cy + r * Math.sin(angle);
        const innerX = cx + r * 0.4 * Math.cos(innerAngle);
        const innerY = cy + r * 0.4 * Math.sin(innerAngle);
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();

    const flagTexture = new THREE.CanvasTexture(flagCanvas);
    const flagMat = new THREE.MeshStandardMaterial({
        map: flagTexture, side: THREE.DoubleSide,
        roughness: 0.8, metalness: 0.0
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(30, 20, 12, 8), flagMat);
    flag.position.set(16, 70, 0);
    flag.castShadow = true;
    flagGroup.add(flag);

    // Animate flag waving (stored for animate loop)
    flagGroup.userData = {
        flag: flag
    };

    flagGroup.position.set(x, groundY, z);
    scene.add(flagGroup);
    return flagGroup;
}

// =============================================
// 6d. SÂN TRƯỚC DINH (Dựa trên ảnh thật)
// =============================================
const fountainParticles = [];

function addYardDecorations(model) {
    // Lấy vị trí thảm cỏ đã có sẵn trong mô hình
    const lawnRef = window.__lawnRef;
    if (!lawnRef) {
        console.log('Không tìm thấy thảm cỏ trong mô hình, bỏ qua trang trí sân');
        return;
    }
    
    const lawnBox = lawnRef.box;
    const lawnCenter = lawnBox.getCenter(new THREE.Vector3());
    const lawnSize = lawnBox.getSize(new THREE.Vector3());
    const gy = lawnBox.min.y; // Mặt đất = đáy thảm cỏ
    
    console.log('Lawn center:', lawnCenter, 'size:', lawnSize, 'groundY:', gy);
    
    const decoGroup = new THREE.Group();

    // --- THẢM CỎ XANH MỚI ---
    const lawnCanvas = document.createElement('canvas');
    lawnCanvas.width = 512; lawnCanvas.height = 512;
    const lctx = lawnCanvas.getContext('2d');
    const lawnGrad = lctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    lawnGrad.addColorStop(0, '#3a8c2e');
    lawnGrad.addColorStop(0.5, '#2d7a1e');
    lawnGrad.addColorStop(1, '#1d5a10');
    lctx.fillStyle = lawnGrad;
    lctx.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 4000; k++) {
        lctx.fillStyle = `rgba(${30+Math.random()*40},${100+Math.random()*80},${10+Math.random()*30},0.25)`;
        lctx.fillRect(Math.random()*512, Math.random()*512, 1, 3);
    }
    const lawnMat = new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(lawnCanvas), roughness: 0.9, metalness: 0.0
    });
    // Oval: dùng radius = nửa chiều rộng thảm cỏ, scale z
    const lawnRadius = Math.max(lawnSize.x, lawnSize.z) * 0.5;
    const lawnMesh = new THREE.Mesh(new THREE.CircleGeometry(lawnRadius, 64), lawnMat);
    lawnMesh.rotation.x = -Math.PI / 2;
    lawnMesh.scale.set(1, 1, lawnSize.z / lawnSize.x); // Oval hóa
    lawnMesh.position.set(lawnCenter.x, gy + 0.3, lawnCenter.z);
    lawnMesh.receiveShadow = true;
    decoGroup.add(lawnMesh);

    // Viền bê tông quanh cỏ
    const curbMesh = new THREE.Mesh(
        new THREE.TorusGeometry(lawnRadius, 0.8, 8, 64),
        new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.7 })
    );
    curbMesh.rotation.x = -Math.PI / 2;
    curbMesh.scale.set(1, 1, lawnSize.z / lawnSize.x);
    curbMesh.position.set(lawnCenter.x, gy + 0.6, lawnCenter.z);
    decoGroup.add(curbMesh);

    // Đường nhựa vòng quanh
    const roadMesh = new THREE.Mesh(
        new THREE.RingGeometry(lawnRadius + 1, lawnRadius + 10, 64),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 })
    );
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.scale.set(1, 1, lawnSize.z / lawnSize.x);
    roadMesh.position.set(lawnCenter.x, gy + 0.15, lawnCenter.z);
    roadMesh.receiveShadow = true;
    decoGroup.add(roadMesh);

    // --- ĐÀI PHUN NƯỚC (đặt giữa thảm cỏ) ---
    const fountainGroup = new THREE.Group();
    
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.6, metalness: 0.1 });
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 2, 24), baseMat);
    base1.position.y = 1; base1.castShadow = true; base1.receiveShadow = true;
    fountainGroup.add(base1);

    const poolMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7 });
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1, 24), poolMat);
    pool.position.y = 2.5;
    fountainGroup.add(pool);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.4, metalness: 0.2 });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 6, 12), pillarMat);
    pillar.position.y = 5; pillar.castShadow = true;
    fountainGroup.add(pillar);

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.5, 0.5, 16), pillarMat);
    dish.position.y = 8.5; dish.castShadow = true;
    fountainGroup.add(dish);

    // Hạt nước phun
    const waterMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, depthWrite: false });
    const waterGeo = new THREE.SphereGeometry(0.2, 4, 4);
    for (let i = 0; i < 60; i++) {
        const drop = new THREE.Mesh(waterGeo, waterMat.clone());
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2;
        const height = 8 + Math.random() * 5;
        drop.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        drop.userData = { angle, radius, baseY: height, speed: 0.3 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 };
        fountainGroup.add(drop);
        fountainParticles.push(drop);
    }

    // Đặt đài phun ngay giữa thảm cỏ
    fountainGroup.position.set(lawnCenter.x, gy, lawnCenter.z);
    decoGroup.add(fountainGroup);

    // --- CÂY BỤI (dọc mép trước Dinh) ---
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x1a5c0a, roughness: 0.9 });
    const bushZ = lawnCenter.z - lawnSize.z * 0.45; // Mép sau thảm cỏ (sát Dinh)
    for (let i = -3; i <= 3; i++) {
        if (Math.abs(i) < 1) continue;
        const bush = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random(), 8, 8), bushMat);
        bush.position.set(lawnCenter.x + i * 6, gy + 1.2, bushZ);
        bush.scale.y = 0.7; bush.castShadow = true;
        decoGroup.add(bush);
    }

    // --- CÂY LỚN 2 BÊN ---
    const treeX = lawnSize.x * 0.4; // Gần mép rìa thảm cỏ
    for (let side = -1; side <= 1; side += 2) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 15),
            new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 }));
        trunk.position.set(lawnCenter.x + side * treeX, gy + 7.5, lawnCenter.z);
        trunk.castShadow = true;
        decoGroup.add(trunk);
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(8, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x1a6b0a, roughness: 0.95 }));
        foliage.position.set(lawnCenter.x + side * treeX, gy + 18, lawnCenter.z);
        foliage.scale.y = 0.8; foliage.castShadow = true;
        decoGroup.add(foliage);
    }

    // --- HÀNG CỜ ĐỎ (dọc viền thảm cỏ) ---
    function createSmallFlag(x, z) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 12),
            new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 }));
        pole.position.set(x, gy + 6, z); pole.castShadow = true;
        decoGroup.add(pole);

        const fCanvas = document.createElement('canvas');
        fCanvas.width = 128; fCanvas.height = 85;
        const fCtx = fCanvas.getContext('2d');
        fCtx.fillStyle = '#DA251D'; fCtx.fillRect(0, 0, 128, 85);
        fCtx.fillStyle = '#FFFF00'; fCtx.beginPath();
        const cx2 = 64, cy2 = 42, r2 = 18;
        for (let j = 0; j < 5; j++) {
            const a = -Math.PI/2 + (j*2*Math.PI)/5;
            const ia = a + Math.PI/5;
            if (j===0) fCtx.moveTo(cx2+r2*Math.cos(a), cy2+r2*Math.sin(a));
            else fCtx.lineTo(cx2+r2*Math.cos(a), cy2+r2*Math.sin(a));
            fCtx.lineTo(cx2+r2*0.4*Math.cos(ia), cy2+r2*0.4*Math.sin(ia));
        }
        fCtx.closePath(); fCtx.fill();
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.3),
            new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(fCanvas), side: THREE.DoubleSide, roughness: 0.8 }));
        fl.position.set(x + 3, gy + 11, z); fl.castShadow = true;
        decoGroup.add(fl);
    }
    
    // 2 hàng cờ dọc 2 bên thảm cỏ
    const flagSpread = lawnSize.z * 0.35;
    for (let i = 0; i < 4; i++) {
        const fz = lawnCenter.z + flagSpread * (i / 3 - 0.5);
        createSmallFlag(lawnCenter.x - lawnSize.x * 0.35, fz);
        createSmallFlag(lawnCenter.x + lawnSize.x * 0.35, fz);
    }

    model.add(decoGroup);
    return decoGroup;
}

// =============================================
// 7. LOAD MÔ HÌNH & Tương tác
// =============================================
const loader = new GLTFLoader();
const htmlHotspots = [];
const progressFill = document.getElementById('progress-fill');

function createHTMLHotspot(x, y, z, title, desc, imageUrl = null) {
    const el = document.createElement('div');
    el.className = 'hotspot-marker hidden';
    el.innerHTML = `
        <div class="hotspot-pulse"></div>
        <div class="hotspot-dot"></div>
        <div class="hotspot-label">${title}</div>
    `;
    document.body.appendChild(el);
    
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        showModal(title, desc, imageUrl);
    });

    htmlHotspots.push({
        element: el,
        position: new THREE.Vector3(x, y, z)
    });
}

loader.load('dinh_doc_lap_independence_palace/scene.gltf', function (gltf) {
    const model = gltf.scene;
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if(child.material) {
                child.material.envMapIntensity = 0.3;
            }

            // TÁCH NỀN BẦU TRỜI CŨ CỦA MÔ HÌNH
            child.geometry.computeBoundingBox();
            const s = new THREE.Vector3();
            child.geometry.boundingBox.getSize(s);
            const childName = child.name ? child.name.toLowerCase() : "";
            
            // Ẩn nền trời
            if (s.x > 600 || s.y > 400 || childName.includes('sky') || childName.includes('bg') || childName.includes('background')) {
                child.visible = false;
            }

            // TÌM THẢM CỎ CŨ (Lấy mốc tọa độ rồi ẩn đi)
            if (child.material && s.x > 100 && s.z > 100 && s.y < 30) {
                const color = child.material.color;
                if (color && color.g > color.r && color.g > color.b) {
                    child.visible = false; // Ẩn đi vì đã có thảm cỏ mới ở addYardDecorations
                    
                    if (!window.__lawnRef) { // Chỉ lưu mốc từ mảnh cỏ lớn đầu tiên
                        const lawnWorldPos = new THREE.Vector3();
                        child.getWorldPosition(lawnWorldPos);
                        const lawnBox = new THREE.Box3().setFromObject(child);
                        window.__lawnRef = { pos: lawnWorldPos, box: lawnBox, mesh: child };
                        console.log('LAWN ref found:', childName || child.name);
                    }
                }
            }
            // Ẩn ground/terrain phẳng quá lớn (nhưng KHÔNG phải thảm cỏ)
            if (s.x > 200 && s.z > 200 && s.y < 10) {
                child.visible = false;
            }
        }
    });
    
    // Tính bounding box CHỈ từ mesh còn hiện (loại bỏ ground/sky đã ẩn)
    // Tối ưu hóa tốc độ load: Dùng boundingBox đã tính sẵn thay vì setFromObject
    const visibleBox = new THREE.Box3();
    model.updateMatrixWorld(true);
    model.traverse((child) => {
        if (child.isMesh && child.visible && child.geometry.boundingBox) {
            const childBox = child.geometry.boundingBox.clone();
            childBox.applyMatrix4(child.matrixWorld);
            visibleBox.union(childBox);
        }
    });
    
    const center = visibleBox.getCenter(new THREE.Vector3());
    const groundY = visibleBox.min.y;

    console.log('VISIBLE BBox center:', center);
    console.log('VISIBLE BBox min:', visibleBox.min);
    console.log('VISIBLE BBox max:', visibleBox.max);
    console.log('VISIBLE groundY:', groundY);
    
    // DEBUG: hiển thị tọa độ
    document.title = `Vcenter(${center.x.toFixed(1)},${center.y.toFixed(1)},${center.z.toFixed(1)}) Vground=${groundY.toFixed(1)}`;

    model.position.x += (model.position.x - center.x);
    model.position.z += (model.position.z - center.z);
    scene.add(model);

    console.log('Model final position:', model.position);

    // Thêm trang trí sân (đài phun, cờ, cây) dựa trên vị trí thảm cỏ gốc
    addYardDecorations(model);

    // Fade out loading
    const loadingScreen = document.getElementById('loading');
    loadingScreen.style.opacity = '0';
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 1500);

}, function(xhr) {
    // Progress callback
    if (xhr.lengthComputable && progressFill) {
        const percent = (xhr.loaded / xhr.total) * 100;
        progressFill.style.width = percent + '%';
    }
});

// =============================================
// 8. MODAL INTERACTION & AUDIO GUIDE
// =============================================
const infoModal = document.getElementById('info-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const closeModal = document.getElementById('close-modal');
const modalBackdrop = document.querySelector('.modal-backdrop');
const modalImage = document.getElementById('modal-image');
const btnAudioGuide = document.getElementById('btn-audio-guide');
const audioText = document.getElementById('audio-text');

let currentUtterance = null;

function showModal(title, desc, imageUrl = null) {
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    
    if (imageUrl && modalImage) {
        modalImage.src = imageUrl;
        modalImage.classList.remove('hidden');
    } else if (modalImage) {
        modalImage.classList.add('hidden');
    }

    // Tắt đọc âm thanh nếu đang đọc
    window.speechSynthesis.cancel();
    if (btnAudioGuide) {
        btnAudioGuide.classList.remove('playing');
        audioText.textContent = "Nghe thuyết minh";
    }

    infoModal.classList.remove('hidden');
}

function hideModal() {
    infoModal.classList.add('hidden');
    window.speechSynthesis.cancel();
}

// Logic cho nút Thuyết minh Audio Guide
if (btnAudioGuide) {
    btnAudioGuide.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            btnAudioGuide.classList.remove('playing');
            audioText.textContent = "Nghe thuyết minh";
        } else {
            currentUtterance = new SpeechSynthesisUtterance(modalDesc.textContent);
            currentUtterance.lang = 'vi-VN';
            currentUtterance.onend = () => {
                btnAudioGuide.classList.remove('playing');
                audioText.textContent = "Nghe thuyết minh";
            };
            window.speechSynthesis.speak(currentUtterance);
            btnAudioGuide.classList.add('playing');
            audioText.textContent = "Đang phát...";
        }
    });
}

// Click anywhere else to close modal
window.addEventListener('click', (event) => {
    if (!event.target.closest('.modal-panel') && 
        !event.target.closest('.hotspot-marker') &&
        !event.target.closest('#btn-info') &&
        !event.target.closest('#ref-controls') &&
        !event.target.closest('#btn-audio-guide')) {
        hideModal();
    }
});

closeModal.addEventListener('click', hideModal);
if (modalBackdrop) {
    modalBackdrop.addEventListener('click', hideModal);
}

// =============================================
// 8.5 FOIL FLAG BALLOONS (Bóng bay tráng nhôm)
// =============================================
const balloonParticles = [];

function createFlagTexture(isLiberation) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (isLiberation) {
        ctx.fillStyle = '#dd1111';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(0, 256, 512, 256);
    } else {
        ctx.fillStyle = '#dd1111';
        ctx.fillRect(0, 0, 512, 512);
    }

    ctx.translate(256, 256);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    const outerRadius = 140;
    const innerRadius = 53;
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    return tex;
}

const natFlagTex = createFlagTexture(false);
const libFlagTex = createFlagTexture(true);

function createBubbleGeometry() {
    return new THREE.SphereGeometry(7, 32, 32);
}

// Giữ lại hàm tạo sao vàng 3D
function createStarGeometry() {
    const shape = new THREE.Shape();
    const outerRadius = 8;
    const innerRadius = 3.5;
    const points = 5;
    const PI2 = Math.PI * 2;
    shape.moveTo(0, outerRadius);
    for (let i = 1; i < points * 2; i++) {
        const radius = i % 2 === 1 ? innerRadius : outerRadius;
        const a = (i / (points * 2)) * PI2;
        shape.lineTo(Math.sin(a) * radius, Math.cos(a) * radius);
    }
    shape.lineTo(0, outerRadius);

    const extrudeSettings = { depth: 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.5, bevelSegments: 2 };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
}

const bubbleGeo = createBubbleGeometry();
const starGeo = createStarGeometry();

const natMat = new THREE.MeshPhysicalMaterial({ 
    map: natFlagTex, roughness: 0.1, metalness: 0.1, 
    transparent: true, opacity: 0.65, transmission: 0.5, ior: 1.2 
});
const libMat = new THREE.MeshPhysicalMaterial({ 
    map: libFlagTex, roughness: 0.1, metalness: 0.1, 
    transparent: true, opacity: 0.65, transmission: 0.5, ior: 1.2 
});
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.1, metalness: 0.8, emissive: 0x332200 });

for (let i = 0; i < 45; i++) {
    const group = new THREE.Group();
    const randType = Math.random();
    
    if (randType < 0.25) {
        // Sao vàng 3D
        const star = new THREE.Mesh(starGeo, goldMat);
        group.add(star);
        group.userData.isStar = true;
    } else {
        // Bong bóng dạng tròn (Cờ Tổ quốc hoặc Cờ Giải phóng)
        const isLiberation = Math.random() > 0.5;
        const mat = isLiberation ? libMat : natMat;
        const balloon = new THREE.Mesh(bubbleGeo, mat);
        group.add(balloon);
        
        // Bỏ nút thắt và dây để giống bong bóng xà phòng lơ lửng
        group.userData.isStar = false;
    }

    group.position.set(
        (Math.random() - 0.5) * 800,
        Math.random() * 400 - 50,
        (Math.random() - 0.5) * 800
    );
    
    const s = 0.8 + Math.random() * 0.5;
    group.scale.set(s, s, s);
    
    // Tốc độ trôi CHẬM HƠN (như yêu cầu)
    group.userData.speedY = 0.15 + Math.random() * 0.25; 
    group.userData.speedX = (Math.random() - 0.5) * 0.15;
    group.userData.swaySpeed = 0.005 + Math.random() * 0.01;
    group.userData.swayPhase = Math.random() * Math.PI * 2;
    group.userData.baseX = group.position.x;
    group.userData.rotSpeedX = (Math.random() - 0.5) * 0.02;
    group.userData.rotSpeedY = (Math.random() - 0.5) * 0.02;
    
    scene.add(group);
    balloonParticles.push(group);
}


// =============================================
// 9. PARTICLE STARS (Start Overlay)
// =============================================
function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            opacity: Math.random() * 0.8 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
        });
    }

    let animId;
    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
            s.twinkle += 0.02;
            s.y -= s.speed;
            if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }
            
            const alpha = s.opacity * (0.5 + 0.5 * Math.sin(s.twinkle));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.fill();
        }
        animId = requestAnimationFrame(drawStars);
    }
    drawStars();

    return () => cancelAnimationFrame(animId);
}

const stopParticles = initParticles();

// =============================================
// 10. UI EVENTS
// =============================================
const startBtn = document.getElementById('start-btn');
const startOverlay = document.getElementById('start-overlay');
const vinylDisc = document.getElementById('vinyl-disc');
const soundBars = document.getElementById('sound-bars');

startBtn.addEventListener('click', () => {
    startOverlay.style.opacity = '0';
    startOverlay.style.transform = 'scale(1.1)';
    setTimeout(() => {
        startOverlay.style.display = 'none';
        if (stopParticles) stopParticles();
        controls.autoRotate = false;
    }, 1200);
    
    if (sound.buffer) sound.play().catch(e => console.log('Autoplay blocked:', e));
    
    document.getElementById('canvas-container').style.pointerEvents = 'auto';
    document.getElementById('ref-controls').classList.remove('hidden');
    document.getElementById('btn-info').classList.remove('hidden');
});

// =============================================
// 11. GIAO DIỆN MỚI (REFERENCE CONTROLS)
// =============================================

// Nút Đổi nền (Chuyển qua lại 4 themes)
document.getElementById('btn-color')?.addEventListener('click', () => {
    window.applyTheme(currentThemeIdx + 1);
});

// Nút Wireframe (Dạng khung dây)
let isWireframe = false;
document.getElementById('btn-wireframe')?.addEventListener('click', () => {
    isWireframe = !isWireframe;
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.wireframe = isWireframe;
        }
    });
});

// Nút Reset
document.getElementById('btn-reset')?.addEventListener('click', () => {
    camera.position.set(180, 70, 220);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
});

// Nút Toàn màn hình (Hỗ trợ đa trình duyệt & hiển thị lỗi nếu bị chặn)
document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    try {
        const docElm = document.documentElement;
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
        
        if (!isFullscreen) {
            if (docElm.requestFullscreen) {
                docElm.requestFullscreen().catch(e => {
                    console.log(e);
                    alert("Trình duyệt từ chối Toàn màn hình (Có thể do thiết bị/trình duyệt không hỗ trợ hoặc chặn popup).");
                });
            } else if (docElm.webkitRequestFullscreen) {
                docElm.webkitRequestFullscreen();
            } else if (docElm.mozRequestFullScreen) {
                docElm.mozRequestFullScreen();
            } else if (docElm.msRequestFullscreen) {
                docElm.msRequestFullscreen();
            } else {
                alert("Thiết bị/Trình duyệt của bạn (VD: iPhone Safari) không hỗ trợ tính năng Toàn Màn Hình cho trang web.");
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(e => console.log(e));
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    } catch (err) {
        alert("Lỗi Fullscreen: " + err.message);
    }
});

// Nút Tự động xoay
document.getElementById('btn-autorotate')?.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 1.5;
    const btn = document.getElementById('btn-autorotate');
    if (controls.autoRotate) {
        btn.style.background = 'rgba(212, 175, 55, 0.4)';
        btn.style.borderColor = 'var(--primary-gold)';
    } else {
        btn.style.background = '';
        btn.style.borderColor = '';
    }
});

// Nút Thông tin (Góc dưới phải)
document.getElementById('btn-info')?.addEventListener('click', () => {
    const t = translations[currentLang];
    showModal(t.infoTitle, t.infoDesc);
});

// =============================================
// 11b. NGÔN NGỮ (LANGUAGE TOGGLE)
// =============================================
let currentLang = 'vi';
const translations = {
    vi: {
        color: '🎨 Đổi nền',
        wireframe: '🔲 Khung dây',
        autorotate: 'Tự động xoay',
        reset: '🔄 Đặt lại',
        fullscreen: '⛶ Toàn màn',
        lang: '🌐 EN',
        music: '🔊 Nhạc',
        info: '💬 Thông tin',
        infoTitle: 'Dinh Độc Lập — Hào Quang Chiến Thắng',
        infoDesc: 'Dinh Độc Lập (hay Hội trường Thống Nhất) không chỉ là một công trình kiến trúc độc đáo, mà còn là một chứng nhân lịch sử vĩ đại của dân tộc Việt Nam.\n\nĐược thiết kế bởi kiến trúc sư Ngô Viết Thụ - người Việt Nam đầu tiên đạt giải Khôi nguyên La Mã, công trình mang đậm bản sắc văn hóa Á Đông kết hợp hài hòa với nghệ thuật kiến trúc hiện đại phương Tây. Bố cục mặt bằng của Dinh lấy cảm hứng từ triết học phương Đông, thể hiện những chữ Hán mang ý nghĩa tốt đẹp như: Cát, Trung, Tam, Chủ, Hưng.\n\nVào lúc 10h45 ngày 30 tháng 4 năm 1975, xe tăng mang số hiệu 843 và 390 của Quân Giải phóng đã húc tung cổng chính, tiến thẳng vào Dinh. Đến 11h30 cùng ngày, lá cờ Mặt trận Dân tộc Giải phóng miền Nam Việt Nam tung bay trên nóc Dinh Độc Lập, đánh dấu thời khắc lịch sử thiêng liêng: Chế độ Việt Nam Cộng hòa chính thức sụp đổ, miền Nam hoàn toàn giải phóng, non sông thu về một mối.\n\nNgày nay, Dinh Độc Lập được công nhận là Di tích quốc gia đặc biệt, là biểu tượng tự hào của khát vọng hòa bình và tinh thần đoàn kết bất diệt của người Việt Nam.',
        audioGuide: 'Nghe thuyết minh',
        audioPlaying: 'Đang phát...',
        modalHeader: 'THÔNG TIN LỊCH SỬ',
    },
    en: {
        color: '🎨 Theme',
        wireframe: '🔲 Wireframe',
        autorotate: 'Auto Rotate',
        reset: '🔄 Reset',
        fullscreen: '⛶ Fullscreen',
        lang: '🌐 VI',
        music: '🔊 Music',
        info: '💬 Info',
        infoTitle: 'Independence Palace — Glory of Victory',
        infoDesc: 'The Independence Palace (also known as the Reunification Convention Hall) is not only a unique architectural masterpiece but also a great historical witness of the Vietnamese nation.\n\nDesigned by architect Ngo Viet Thu - the first Vietnamese to win the Grand Prix de Rome, the building deeply reflects Eastern cultural identity harmoniously combined with modern Western architecture. Its layout is inspired by Eastern philosophy, representing auspicious Chinese characters such as Auspicious, Loyalty, Three, Master, and Prosperity.\n\nAt 10:45 AM on April 30, 1975, tanks 843 and 390 of the Liberation Army crashed through the main gates, advancing straight into the Palace. By 11:30 AM the same day, the flag of the National Liberation Front of South Vietnam fluttered on the roof of the Independence Palace, marking a sacred historical moment: The official collapse of the Republic of Vietnam, the complete liberation of the South, and the reunification of the country.\n\nToday, the Independence Palace is recognized as a Special National Monument, standing as a proud symbol of the aspiration for peace and the immortal spirit of unity of the Vietnamese people.',
        audioGuide: 'Audio Guide',
        audioPlaying: 'Playing...',
        modalHeader: 'HISTORICAL INFO',
    }
};

function updateLanguage() {
    const t = translations[currentLang];
    document.getElementById('btn-color').title = t.color;
    document.getElementById('btn-wireframe').title = t.wireframe;
    document.getElementById('btn-autorotate').title = t.autorotate;
    document.getElementById('btn-reset').title = t.reset;
    document.getElementById('btn-fullscreen').title = t.fullscreen;
    document.getElementById('btn-lang').title = t.lang;
    document.getElementById('btn-music').title = t.music;
    
    document.getElementById('btn-info').textContent = t.info;
    
    const headerLabel = document.querySelector('.modal-header-label');
    if (headerLabel) headerLabel.textContent = t.modalHeader;
    
    if (audioText && !window.speechSynthesis.speaking) {
        audioText.textContent = t.audioGuide;
    }
}

document.getElementById('btn-lang')?.addEventListener('click', () => {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    updateLanguage();
});

// =============================================
// 11c. BẬT/TẮT NHẠC
// =============================================
const btnMusic = document.getElementById('btn-music');
let musicPlaying = false;

btnMusic?.addEventListener('click', () => {
    if (!sound.paused) {
        sound.pause();
        btnMusic.textContent = '🔇';
    } else {
        sound.play().catch(e => console.log('Play blocked:', e));
        btnMusic.textContent = '🔊';
    }
});

// =============================================
// 12. TIMELINE MILESTONES (Ẩn theo yêu cầu UI mới)
// =============================================
document.querySelectorAll('.timeline-milestone').forEach(milestone => {
    milestone.addEventListener('click', () => {
        const title = milestone.dataset.title;
        const desc = milestone.dataset.desc;
        if (title && desc) {
            showModal(title, desc);
        }
    });
});

// =============================================
// 13. VÒNG LẶP RENDER
// =============================================
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    // Animate balloon particles
    for (const b of balloonParticles) {
        const d = b.userData;
        d.swayPhase += d.swaySpeed;
        
        b.position.y += d.speedY;
        b.position.x = d.baseX + Math.sin(d.swayPhase) * 15; // Bóng lắc lư sang 2 bên
        b.position.z += d.speedX * 0.2; // Trôi dạt nhẹ
        
        d.baseX += d.speedX; // Cập nhật gốc X để bóng trôi ngang dần
        
        if (d.isStar) {
            // Ngôi sao xoay vòng liên tục
            b.rotation.x += d.rotSpeedX;
            b.rotation.y += d.rotSpeedY;
            b.rotation.z += 0.005;
        } else {
            // Bóng bay trái tim thì lắc qua lắc lại theo nhịp
            b.rotation.z = Math.sin(d.swayPhase) * 0.1;
            b.rotation.x = Math.sin(d.swayPhase * 1.5) * 0.05;
            b.rotation.y = Math.sin(d.swayPhase * 0.8) * 0.05;
        }
        
        // Reset khi bay quá cao
        if (b.position.y > 500) {
            b.position.y = -100;
            d.baseX = (Math.random() - 0.5) * 800;
            b.position.z = (Math.random() - 0.5) * 800;
        }
    }

    // Animate fountain water
    for (const drop of fountainParticles) {
        const d = drop.userData;
        d.phase += 0.05;
        // Nước phun lên rồi rơi xuống theo parabol
        const t = (Math.sin(d.phase) + 1) / 2; // 0 -> 1 -> 0
        drop.position.y = d.baseY - t * (d.baseY - 3); // Rơi từ baseY xuống mặt nước (y=3)
        // Mở rộng bán kính khi rơi
        const currentRadius = d.radius + t * 6;
        drop.position.x = Math.cos(d.angle + d.phase * 0.2) * currentRadius;
        drop.position.z = Math.sin(d.angle + d.phase * 0.2) * currentRadius;
        drop.material.opacity = 0.4 + (1 - t) * 0.4;
    }

    // Update hotspot positions
    for (const hotspot of htmlHotspots) {
        if (hotspot.element.classList.contains('hidden')) continue;
        
        const pos = hotspot.position.clone();
        pos.project(camera);
        
        if (pos.z > 1) {
            hotspot.element.style.display = 'none';
            continue;
        }
        
        const x = (pos.x * .5 + .5) * window.innerWidth;
        const y = (pos.y * -.5 + .5) * window.innerHeight;
        
        hotspot.element.style.display = 'flex';
        hotspot.element.style.left = `${x}px`;
        hotspot.element.style.top = `${y}px`;
    }

    controls.update();
    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// =============================================
// 12. ROBOT GUIDE VIDEO CONTROL
// =============================================
const robotVideo = document.getElementById('robot-video');
const closeRobotBtn = document.getElementById('close-robot');
const robotGuide = document.getElementById('robot-guide');

if (closeRobotBtn && robotGuide) {
    closeRobotBtn.addEventListener('click', () => {
        robotGuide.style.display = 'none';
        if (robotVideo) robotVideo.pause();
    });
}

if (robotVideo && robotGuide) {
    robotVideo.addEventListener('click', () => {
        robotVideo.muted = !robotVideo.muted;
        if (!robotVideo.muted) {
            robotGuide.classList.add('unmuted');
        } else {
            robotGuide.classList.remove('unmuted');
        }
    });
}
