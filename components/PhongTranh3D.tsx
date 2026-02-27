import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Image as ImageIcon, Plus, Trash2, Edit3, Eye, Share2, ArrowLeft,
    Save, X, Copy, Check, GalleryHorizontalEnd, Maximize, Play, Pause,
    MousePointer, Footprints
} from 'lucide-react';
import {
    Gallery, GalleryPainting, createGallery, getUserGalleries,
    updateGallery, deleteGallery, getGallery
} from '../utils/firebaseGallery';
import { uploadToImgBB } from '../utils/imgbbService';

// ============================================================
// Types & Templates
// ============================================================
interface PhongTranh3DProps {
    user: { email: string; name: string } | null;
    onRequireLogin?: () => void;
}
type Screen = 'LIST' | 'EDITOR' | 'VIEWER';
type ControlMode = 'orbit' | 'fps';

const TEMPLATES = [
    {
        id: 'royal' as const, name: 'Bảo tàng Hoàng gia', icon: '🏛️',
        description: 'Sàn gỗ parquet, tường be, khung vàng, trụ cột, spotlight ấm',
        wall: 0xf0e6d3, floor: 0x8B6914, ceiling: 0xf5efe5, frame: 0xB8860B,
        accent: 0xc9a84c, ambient: 1.0, spot: 2.5, bg: '#3d2b1a',
        spotColor: 0xfff0c8, floorReflect: 0.05
    },
    {
        id: 'minimal' as const, name: 'Gallery Tối giản', icon: '⬜',
        description: 'Sàn bê tông mài, tường trắng, khung đen mỏng, LED ẩn',
        wall: 0xfafafa, floor: 0xd8d8d8, ceiling: 0xffffff, frame: 0x1a1a1a,
        accent: 0x888888, ambient: 1.4, spot: 1.8, bg: '#f0f0f5',
        spotColor: 0xffffff, floorReflect: 0.15
    },
    {
        id: 'art' as const, name: 'Triển lãm Nghệ thuật', icon: '🎨',
        description: 'Sàn đá tối, tường xám, khung bạc, neon accent, hiện đại',
        wall: 0x2a2a35, floor: 0x1a1a24, ceiling: 0x1e1e28, frame: 0x8888aa,
        accent: 0x6366f1, ambient: 0.6, spot: 3.5, bg: '#0f0f18',
        spotColor: 0xc4b5fd, floorReflect: 0.3
    }
];

// ============================================================
// GalleryViewer - Full 3D Experience
// ============================================================
function GalleryViewer({ gallery, onPaintingClick, onBack }: {
    gallery: Gallery;
    onPaintingClick: (p: GalleryPainting) => void;
    onBack: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<any>(null);
    const [controlMode, setControlMode] = useState<ControlMode>('orbit');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isTouring, setIsTouring] = useState(false);
    const [tourIndex, setTourIndex] = useState(0);
    const [showHint, setShowHint] = useState(true);

    // Backward compat: map old template IDs to new ones
    const templateMap: Record<string, string> = { classic: 'royal', modern: 'minimal', space: 'art' };
    const tid = templateMap[gallery.template] || gallery.template;
    const template = TEMPLATES.find(t => t.id === tid) || TEMPLATES[0];

    useEffect(() => { setTimeout(() => setShowHint(false), 5000); }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const W = container.clientWidth, H = container.clientHeight;

        // === Scene ===
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(template.bg);
        scene.fog = new THREE.Fog(template.bg, 25, 60);

        // === Camera ===
        const camera = new THREE.PerspectiveCamera(55, W / H, 0.3, 150);
        camera.position.set(0, 2.5, 10);

        // === Renderer ===
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;
        container.appendChild(renderer.domElement);

        // === Controls ===
        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.08;
        orbitControls.target.set(0, 2, 0);
        orbitControls.minDistance = 2; orbitControls.maxDistance = 35;
        orbitControls.maxPolarAngle = Math.PI / 2;

        let fpsControls: PointerLockControls | null = null;
        try { fpsControls = new PointerLockControls(camera, renderer.domElement); } catch (e) { console.warn('FPS controls not available'); }

        // Movement state
        const keys: Record<string, boolean> = {};
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const paintingMeshes = new Map<THREE.Mesh, GalleryPainting>();

        // === Lighting ===
        scene.add(new THREE.AmbientLight(0xffffff, template.ambient));
        scene.add(new THREE.HemisphereLight(0xffffff, template.floor, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(8, 12, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        // === Room Dimensions ===
        const paintings = gallery.paintings || [];
        const count = paintings.length;
        const roomW = Math.max(28, count * 4.5);
        const roomD = Math.max(18, count * 3);
        const wallH = 7;

        // === Floor ===
        const floorMat = new THREE.MeshStandardMaterial({
            color: template.floor, roughness: 0.5, metalness: template.floorReflect,
            dithering: true
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
        scene.add(floor);

        // === Walls ===
        const wallMat = new THREE.MeshStandardMaterial({ color: template.wall, roughness: 0.85, dithering: true });
        // Back
        const bw = new THREE.Mesh(new THREE.PlaneGeometry(roomW, wallH), wallMat);
        bw.position.set(0, wallH / 2, -roomD / 2); bw.receiveShadow = true; scene.add(bw);
        // Left
        const lw = new THREE.Mesh(new THREE.PlaneGeometry(roomD, wallH), wallMat.clone());
        lw.position.set(-roomW / 2, wallH / 2, 0); lw.rotation.y = Math.PI / 2; scene.add(lw);
        // Right
        const rw = new THREE.Mesh(new THREE.PlaneGeometry(roomD, wallH), wallMat.clone());
        rw.position.set(roomW / 2, wallH / 2, 0); rw.rotation.y = -Math.PI / 2; scene.add(rw);
        // Front
        const fw = new THREE.Mesh(new THREE.PlaneGeometry(roomW, wallH), wallMat.clone());
        fw.position.set(0, wallH / 2, roomD / 2); fw.rotation.y = Math.PI; scene.add(fw);

        // === Ceiling ===
        const ceilMat = new THREE.MeshStandardMaterial({ color: template.ceiling, roughness: 1, dithering: true });
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilMat);
        ceil.rotation.x = Math.PI / 2; ceil.position.y = wallH; scene.add(ceil);

        // === Ceiling Light Panels ===
        const panelsX = Math.ceil(roomW / 7);
        const panelsZ = Math.ceil(roomD / 9);
        for (let ix = 0; ix < panelsX; ix++) {
            for (let iz = 0; iz < panelsZ; iz++) {
                const lx = -roomW / 2 + 3.5 + ix * 7;
                const lz = -roomD / 2 + 4.5 + iz * 9;
                // Point light
                const pl = new THREE.PointLight(0xfff5e6, 0.5, 16);
                pl.position.set(lx, wallH - 0.5, lz);
                scene.add(pl);
                // Visible panel
                const panelMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff, emissive: template.id === 'art' ? 0x6366f1 : 0xfff8e1,
                    emissiveIntensity: template.id === 'art' ? 0.6 : 0.7, roughness: 1, dithering: true
                });
                const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), panelMat);
                panel.rotation.x = Math.PI / 2; panel.position.set(lx, wallH - 0.02, lz);
                scene.add(panel);
            }
        }

        // === Architectural Details ===
        // Pillars
        const pillarCol = template.id === 'art' ? 0x2a2a3e : (template.id === 'royal' ? 0xe0d4c0 : 0xe0e0e0);
        const pillarMat = new THREE.MeshStandardMaterial({ color: pillarCol, roughness: 0.4, metalness: 0.15 });
        const corners = [
            [-roomW / 2 + 0.3, -roomD / 2 + 0.3], [roomW / 2 - 0.3, -roomD / 2 + 0.3],
            [-roomW / 2 + 0.3, roomD / 2 - 0.3], [roomW / 2 - 0.3, roomD / 2 - 0.3]
        ];
        corners.forEach(([cx, cz]) => {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, wallH, 16), pillarMat);
            pillar.position.set(cx, wallH / 2, cz); pillar.castShadow = true; scene.add(pillar);
            // Cap
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.22, 0.25, 16), pillarMat);
            cap.position.set(cx, wallH - 0.12, cz); scene.add(cap);
            // Base
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16), pillarMat);
            base.position.set(cx, 0.075, cz); scene.add(base);
        });

        // Baseboard molding
        if (template.id !== 'art') {
            const moldCol = template.id === 'royal' ? 0xc9b896 : 0xcccccc;
            const moldMat = new THREE.MeshStandardMaterial({ color: moldCol, roughness: 0.5 });
            const mh = 0.12;
            [
                [0, mh / 2, -(roomD / 2 - 0.03), roomW, mh, 0.06],
                [-(roomW / 2 - 0.03), mh / 2, 0, 0.06, mh, roomD],
                [roomW / 2 - 0.03, mh / 2, 0, 0.06, mh, roomD],
            ].forEach(([x, y, z, w, h, d]) => {
                const m = new THREE.Mesh(new THREE.BoxGeometry(w as number, h as number, d as number), moldMat);
                m.position.set(x as number, y as number, z as number); scene.add(m);
            });
        }

        // Stars for art template
        if (template.id === 'art') {
            const sg = new THREE.BufferGeometry();
            const sp = new Float32Array(800 * 3);
            for (let i = 0; i < 800; i++) {
                sp[i * 3] = (Math.random() - 0.5) * 50;
                sp[i * 3 + 1] = Math.random() * 25;
                sp[i * 3 + 2] = (Math.random() - 0.5) * 50;
            }
            sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
            scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.06, color: 0x6366f1, transparent: true, opacity: 0.6 })));
        }

        // === Label helper ===
        const makeLabel = (text: string) => {
            const c = document.createElement('canvas');
            c.width = 512; c.height = 56;
            const ctx = c.getContext('2d')!;
            ctx.clearRect(0, 0, 512, 56);
            ctx.fillStyle = template.id === 'art' ? '#a78bfa' : '#444';
            ctx.font = '600 26px "Segoe UI", Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(text.length > 28 ? text.slice(0, 25) + '...' : text, 256, 28);
            const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
            return t;
        };

        // === Place Paintings ===
        const fW = 2.6, fH = 2.0, pW = 2.4, pH = 1.8;
        const paintY = wallH / 2 + 0.2;
        const backCap = Math.floor((roomW - 4) / (fW + 1.8));
        const sideCap = Math.floor((roomD - 4) / (fW + 1.8));

        type Placement = { p: [number, number, number]; ry: number };
        const places: Placement[] = [];

        // Back wall
        const bc = Math.min(count, backCap);
        const bs = (roomW - 4) / Math.max(bc, 1);
        for (let i = 0; i < bc; i++) places.push({ p: [-(roomW / 2 - 2) + bs * (i + 0.5), paintY, -(roomD / 2 - 0.25)], ry: 0 });
        // Left wall
        const lc = Math.min(count - bc, sideCap);
        const ls = (roomD - 4) / Math.max(lc, 1);
        for (let i = 0; i < lc; i++) places.push({ p: [-(roomW / 2 - 0.25), paintY, -(roomD / 2 - 2) + ls * (i + 0.5)], ry: Math.PI / 2 });
        // Right wall
        const rc = Math.min(count - bc - lc, sideCap);
        const rs = (roomD - 4) / Math.max(rc, 1);
        for (let i = 0; i < rc; i++) places.push({ p: [roomW / 2 - 0.25, paintY, -(roomD / 2 - 2) + rs * (i + 0.5)], ry: -Math.PI / 2 });

        const texLoader = new THREE.TextureLoader();
        const tourPositions: THREE.Vector3[] = [];

        paintings.forEach((painting, i) => {
            if (i >= places.length) return;
            const { p, ry } = places[i];
            const g = new THREE.Group();
            g.position.set(p[0], p[1], p[2]); g.rotation.y = ry;

            // Frame
            const frameMat = new THREE.MeshStandardMaterial({ color: template.frame, metalness: 0.6, roughness: 0.3 });
            const frame = new THREE.Mesh(new THREE.BoxGeometry(fW + 0.15, fH + 0.15, 0.1), frameMat);
            frame.position.z = 0.05; g.add(frame);

            // Mat
            if (template.id !== 'art') {
                const mat = new THREE.Mesh(new THREE.PlaneGeometry(fW, fH), new THREE.MeshStandardMaterial({ color: 0xf5f5ee }));
                mat.position.z = 0.07; g.add(mat);
            }

            // Canvas
            const paintMat = new THREE.MeshStandardMaterial({ color: 0x555 });
            const paintMesh = new THREE.Mesh(new THREE.PlaneGeometry(pW, pH), paintMat);
            paintMesh.position.z = 0.09; g.add(paintMesh);
            paintingMeshes.set(paintMesh, painting);

            // Label
            if (painting.title) {
                const lbl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.25),
                    new THREE.MeshBasicMaterial({ map: makeLabel(painting.title), transparent: true }));
                lbl.position.set(0, -(fH / 2 + 0.3), 0.07); g.add(lbl);
            }

            scene.add(g);

            // Load texture
            texLoader.load(painting.imageUrl, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                paintMat.map = tex; paintMat.color.set(0xffffff); paintMat.needsUpdate = true;
            }, undefined, () => { });

            // Spotlight
            const sp = new THREE.Vector3(p[0], p[1] + 2.5, p[2]);
            if (ry === 0) sp.z += 2.5; else if (ry > 0) sp.x += 2.5; else sp.x -= 2.5;
            const spot = new THREE.SpotLight(template.spotColor, template.spot, 12, 0.45, 0.7);
            spot.position.copy(sp); spot.target.position.set(p[0], p[1], p[2]);
            spot.shadow.bias = -0.001; spot.shadow.mapSize.set(1024, 1024); spot.castShadow = true;
            scene.add(spot); scene.add(spot.target);

            // Tour position (3m in front of painting)
            const lookDir = new THREE.Vector3(0, 0, 3).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
            tourPositions.push(new THREE.Vector3(p[0] + lookDir.x, 2.5, p[2] + lookDir.z));
        });

        // === Event Handlers ===
        const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
        const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
        const onClick = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(Array.from(paintingMeshes.keys()));
            if (hits.length > 0) {
                const p = paintingMeshes.get(hits[0].object as THREE.Mesh);
                if (p) onPaintingClick(p);
            }
        };
        const onHover = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(Array.from(paintingMeshes.keys()));
            renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
        };
        const onResize = () => {
            const w = container.clientWidth, h = container.clientHeight;
            camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        renderer.domElement.addEventListener('click', onClick);
        renderer.domElement.addEventListener('mousemove', onHover);
        window.addEventListener('resize', onResize);

        // === Mini-map Canvas ===
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 140; mapCanvas.height = 100;
        mapCanvas.style.cssText = 'position:absolute;bottom:12px;right:12px;border-radius:10px;border:2px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.5);pointer-events:none;z-index:10;';
        container.appendChild(mapCanvas);
        const mapCtx = mapCanvas.getContext('2d')!;

        const drawMiniMap = () => {
            mapCtx.clearRect(0, 0, 140, 100);
            mapCtx.fillStyle = 'rgba(20,20,30,0.8)'; mapCtx.fillRect(0, 0, 140, 100);
            // Room outline
            const sx = 120 / roomW, sz = 80 / roomD;
            mapCtx.strokeStyle = 'rgba(255,255,255,0.3)'; mapCtx.lineWidth = 1;
            mapCtx.strokeRect(10, 10, roomW * sx, roomD * sz);
            // Paintings as dots
            places.forEach(({ p }) => {
                mapCtx.fillStyle = template.id === 'art' ? '#6366f1' : '#f59e0b';
                const mx = 10 + (p[0] + roomW / 2) * sx;
                const mz = 10 + (p[2] + roomD / 2) * sz;
                mapCtx.beginPath(); mapCtx.arc(mx, mz, 2.5, 0, Math.PI * 2); mapCtx.fill();
            });
            // Player dot
            mapCtx.fillStyle = '#ef4444';
            const px = 10 + (camera.position.x + roomW / 2) * sx;
            const pz = 10 + (camera.position.z + roomD / 2) * sz;
            mapCtx.beginPath(); mapCtx.arc(px, pz, 4, 0, Math.PI * 2); mapCtx.fill();
            // Direction arrow
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            mapCtx.strokeStyle = '#ef4444'; mapCtx.lineWidth = 2;
            mapCtx.beginPath(); mapCtx.moveTo(px, pz);
            mapCtx.lineTo(px + dir.x * 10, pz + dir.z * 10); mapCtx.stroke();
        };

        // === Tour Logic ===
        let tourTarget: THREE.Vector3 | null = null;
        let tourLookAt: THREE.Vector3 | null = null;
        let tourTimer = 0;

        // === Animation Loop ===
        const clock = new THREE.Clock();
        let animId = 0;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.05);

            // FPS movement
            if (fpsControls?.isLocked) {
                const speed = 6 * delta;
                direction.set(0, 0, 0);
                if (keys['KeyW'] || keys['ArrowUp']) direction.z -= 1;
                if (keys['KeyS'] || keys['ArrowDown']) direction.z += 1;
                if (keys['KeyA'] || keys['ArrowLeft']) direction.x -= 1;
                if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;
                direction.normalize();
                fpsControls?.moveForward(-direction.z * speed);
                fpsControls?.moveRight(direction.x * speed);
                // Clamp to room bounds
                camera.position.x = Math.max(-roomW / 2 + 1, Math.min(roomW / 2 - 1, camera.position.x));
                camera.position.z = Math.max(-roomD / 2 + 1, Math.min(roomD / 2 - 1, camera.position.z));
                camera.position.y = 2.5;
            }

            // Tour animation
            if (tourTarget && tourLookAt) {
                camera.position.lerp(tourTarget, 2 * delta);
                const currentLook = new THREE.Vector3();
                camera.getWorldDirection(currentLook);
                const targetDir = tourLookAt.clone().sub(camera.position).normalize();
                currentLook.lerp(targetDir, 2 * delta);
                camera.lookAt(camera.position.clone().add(currentLook));

                if (camera.position.distanceTo(tourTarget) < 0.3) {
                    tourTimer += delta;
                    if (tourTimer > 3) {
                        tourTimer = 0;
                        // Dispatch to next painting via React state
                        const nextIdx = (stateRef.current?.tourIdx ?? 0) + 1;
                        if (nextIdx < tourPositions.length && nextIdx < places.length) {
                            tourTarget = tourPositions[nextIdx];
                            tourLookAt = new THREE.Vector3(places[nextIdx].p[0], places[nextIdx].p[1], places[nextIdx].p[2]);
                            stateRef.current.tourIdx = nextIdx;
                        } else {
                            tourTarget = null; tourLookAt = null;
                            stateRef.current.stopTour?.();
                        }
                    }
                }
            }

            orbitControls.update();
            drawMiniMap();
            renderer.render(scene, camera);
        };

        stateRef.current = {
            scene, camera, renderer, orbitControls, fpsControls,
            animId, tourPositions, places, tourIdx: 0,
            startTour: () => {
                if (tourPositions.length === 0) return;
                orbitControls.enabled = false;
                stateRef.current.tourIdx = 0;
                tourTarget = tourPositions[0];
                tourLookAt = new THREE.Vector3(places[0].p[0], places[0].p[1], places[0].p[2]);
                tourTimer = 0;
            },
            stopTour: () => {
                tourTarget = null; tourLookAt = null;
                orbitControls.enabled = true;
            },
            switchToFPS: () => {
                orbitControls.enabled = false;
                fpsControls?.lock();
            },
            switchToOrbit: () => {
                if (fpsControls?.isLocked) fpsControls.unlock();
                orbitControls.enabled = true;
            }
        };

        fpsControls?.addEventListener('unlock', () => {
            orbitControls.enabled = true;
        });

        animate();

        return () => {
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            renderer.domElement.removeEventListener('click', onClick);
            renderer.domElement.removeEventListener('mousemove', onHover);
            window.removeEventListener('resize', onResize);
            if (fpsControls?.isLocked) fpsControls.unlock();
            orbitControls.dispose(); fpsControls?.dispose(); renderer.dispose();
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
            if (container.contains(mapCanvas)) container.removeChild(mapCanvas);
        };
    }, [gallery, template]);

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) { el.requestFullscreen(); setIsFullscreen(true); }
        else { document.exitFullscreen(); setIsFullscreen(false); }
    };

    const startTour = () => {
        setIsTouring(true); setTourIndex(0);
        stateRef.current?.startTour();
        stateRef.current.stopTour = () => setIsTouring(false);
    };
    const stopTour = () => {
        setIsTouring(false);
        stateRef.current?.stopTour();
    };

    const switchMode = (mode: ControlMode) => {
        setControlMode(mode);
        if (mode === 'fps') stateRef.current?.switchToFPS();
        else stateRef.current?.switchToOrbit();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5 text-white" /></button>
                    <div>
                        <h2 className="text-xl font-bold text-white font-outfit">{gallery.title}</h2>
                        <p className="text-purple-300/50 text-xs">{template.name} • {gallery.paintings?.length || 0} bức tranh</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Control mode toggle */}
                    <div className="flex bg-white/5 rounded-lg p-0.5">
                        <button onClick={() => switchMode('orbit')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-all ${controlMode === 'orbit' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`}>
                            <MousePointer className="w-3.5 h-3.5" /> Xoay
                        </button>
                        <button onClick={() => switchMode('fps')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-all ${controlMode === 'fps' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`}>
                            <Footprints className="w-3.5 h-3.5" /> Đi bộ
                        </button>
                    </div>
                    {/* Tour button */}
                    <button onClick={isTouring ? stopTour : startTour} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${isTouring ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'}`}>
                        {isTouring ? <><Pause className="w-4 h-4" /> Dừng</> : <><Play className="w-4 h-4" /> Dạo phòng</>}
                    </button>
                    <button onClick={toggleFullscreen} className="p-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10"><Maximize className="w-4 h-4" /></button>
                </div>
            </div>

            <div ref={containerRef} className="w-full rounded-2xl overflow-hidden border border-white/10 relative" style={{ height: 'calc(100vh - 180px)' }}>
                {/* Hint overlay */}
                <AnimatePresence>
                    {showHint && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-xl text-white/80 text-sm pointer-events-none">
                            {controlMode === 'fps' ? '🎮 WASD di chuyển • Chuột nhìn • ESC thoát' : '🖱️ Kéo chuột xoay • Lăn chuột zoom • Click tranh xem chi tiết'}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================================
// Gallery List Screen
// ============================================================
function GalleryList({ galleries, onView, onEdit, onDelete, onShare, onCreate }: {
    galleries: Gallery[]; onView: (g: Gallery) => void; onEdit: (g: Gallery) => void;
    onDelete: (g: Gallery) => void; onShare: (g: Gallery) => void; onCreate: () => void;
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-bold text-white font-outfit">Phòng Tranh của tôi</h2>
                    <p className="text-purple-300/70 text-sm mt-1">{galleries.length}/5 phòng tranh</p></div>
                {galleries.length < 5 && (
                    <button onClick={onCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all font-medium shadow-lg shadow-purple-500/25">
                        <Plus className="w-5 h-5" /> Tạo phòng mới</button>)}
            </div>
            {galleries.length === 0 ? (
                <div className="text-center py-20">
                    <GalleryHorizontalEnd className="w-16 h-16 text-purple-400/40 mx-auto mb-4" />
                    <p className="text-purple-200/60 text-lg mb-2">Chưa có phòng tranh nào</p>
                    <button onClick={onCreate} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all font-medium mt-4">
                        <Plus className="w-5 h-5 inline mr-2" /> Tạo phòng tranh</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {galleries.map(gallery => {
                        const tMap: Record<string, string> = { classic: 'royal', modern: 'minimal', space: 'art' };
                        const tpl = TEMPLATES.find(t => t.id === (tMap[gallery.template] || gallery.template)) || TEMPLATES[0];
                        return (
                            <motion.div key={gallery.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all group">
                                <div className="h-36 flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${tpl.bg}, rgba(255,255,255,0.05))` }}>
                                    <span className="text-5xl">{tpl.icon}</span>
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 rounded-lg text-xs text-white/70">{gallery.paintings?.length || 0} tranh</div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-white text-lg truncate">{gallery.title}</h3>
                                    <p className="text-purple-300/60 text-xs mt-1">{tpl.name}</p>
                                    <div className="flex items-center gap-2 mt-4">
                                        <button onClick={() => onView(gallery)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/40 transition-colors text-sm"><Eye className="w-4 h-4" /> Xem</button>
                                        <button onClick={() => onEdit(gallery)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-sm"><Edit3 className="w-4 h-4" /> Sửa</button>
                                        <button onClick={() => onShare(gallery)} className="p-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10"><Share2 className="w-4 h-4" /></button>
                                        <button onClick={() => onDelete(gallery)} className="p-2 bg-white/5 text-red-400 rounded-lg hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Gallery Editor
// ============================================================
function GalleryEditor({ gallery, onSave, onCancel }: {
    gallery: Gallery | null;
    onSave: (data: Omit<Gallery, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState(gallery?.title || '');
    const tEditorMap: Record<string, string> = { classic: 'royal', modern: 'minimal', space: 'art' };
    const [template, setTemplate] = useState(tEditorMap[gallery?.template || ''] || gallery?.template || 'royal');
    const [paintings, setPaintings] = useState<GalleryPainting[]>(gallery?.paintings || []);
    const [uploading, setUploading] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingPainting, setEditingPainting] = useState<GalleryPainting | null>(null);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const r = await uploadToImgBB(file);
            if (r) setNewImageUrl(r.url); else alert('Lỗi upload ảnh!');
        } catch { alert('Lỗi upload ảnh.'); }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };
    const addPainting = () => {
        if (!newImageUrl) return;
        if (editingPainting) setPaintings(p => p.map(x => x.id === editingPainting.id ? { ...x, imageUrl: newImageUrl, title: newTitle, description: newDesc } : x));
        else setPaintings(p => [...p, { id: Date.now().toString(), imageUrl: newImageUrl, title: newTitle || `Bức ${paintings.length + 1}`, description: newDesc, position: paintings.length }]);
        setNewImageUrl(''); setNewTitle(''); setNewDesc(''); setEditingPainting(null); setShowAddDialog(false);
    };
    const save = () => { if (!title.trim()) { alert('Nhập tên phòng tranh!'); return; } onSave({ title: title.trim(), template: template as Gallery['template'], paintings, ownerEmail: gallery?.ownerEmail || '', ownerName: gallery?.ownerName || '' }); };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onCancel} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
                <h2 className="text-xl font-bold text-white font-outfit">{gallery ? 'Chỉnh sửa phòng tranh' : 'Tạo phòng tranh mới'}</h2>
            </div>
            <div>
                <label className="block text-sm text-purple-200/80 mb-2 font-medium">Tên phòng tranh</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Triển lãm tranh lớp 5A..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none" />
            </div>
            <div>
                <label className="block text-sm text-purple-200/80 mb-3 font-medium">Chọn giao diện</label>
                <div className="grid grid-cols-3 gap-3">
                    {TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => setTemplate(t.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${template === t.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                            <span className="text-3xl">{t.icon}</span>
                            <p className="text-white font-medium text-sm mt-2">{t.name}</p>
                            <p className="text-white/40 text-xs mt-1">{t.description}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-purple-200/80 font-medium">Tranh ({paintings.length})</label>
                    <button onClick={() => { setEditingPainting(null); setNewImageUrl(''); setNewTitle(''); setNewDesc(''); setShowAddDialog(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/40 text-sm"><Plus className="w-4 h-4" /> Thêm</button>
                </div>
                {paintings.length === 0 ? (
                    <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-2" /><p className="text-white/40 text-sm">Chưa có bức tranh nào</p></div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {paintings.map(p => (
                            <div key={p.id} className="bg-white/5 rounded-xl overflow-hidden border border-white/10 group">
                                <div className="aspect-[4/3] bg-black/30 relative overflow-hidden">
                                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => { setEditingPainting(p); setNewImageUrl(p.imageUrl); setNewTitle(p.title); setNewDesc(p.description); setShowAddDialog(true); }}
                                            className="p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/30"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => setPaintings(prev => prev.filter(x => x.id !== p.id))}
                                            className="p-1.5 bg-red-500/40 rounded-lg text-white hover:bg-red-500/60"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="p-2"><p className="text-white text-xs font-medium truncate">{p.title}</p></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3 pt-4">
                <button onClick={save} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 font-medium shadow-lg">
                    <Save className="w-5 h-5" /> {gallery ? 'Lưu thay đổi' : 'Tạo phòng tranh'}</button>
                <button onClick={onCancel} className="px-6 py-3 bg-white/5 text-white/70 rounded-xl hover:bg-white/10">Hủy</button>
            </div>
            {/* Add Dialog */}
            <AnimatePresence>
                {showAddDialog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddDialog(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-white mb-4">{editingPainting ? 'Sửa tranh' : 'Thêm tranh mới'}</h3>
                            <div className="mb-4">
                                <label className="text-sm text-purple-200/80 mb-2 block font-medium">📷 Chọn ảnh từ máy</label>
                                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload}
                                    className="w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-purple-600/30 file:text-purple-200 hover:file:bg-purple-600/50 file:cursor-pointer" />
                                {uploading && <p className="text-purple-400 text-sm mt-2 animate-pulse">⏳ Đang tải lên...</p>}
                            </div>
                            <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-white/10" /><span className="text-white/30 text-xs">hoặc dán link</span><div className="flex-1 h-px bg-white/10" /></div>
                            <div className="mb-4">
                                <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..."
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none text-sm" />
                            </div>
                            {newImageUrl && <div className="mb-4 rounded-xl overflow-hidden bg-black/30 aspect-video"><img src={newImageUrl} alt="Preview" className="w-full h-full object-contain" /></div>}
                            <div className="mb-4">
                                <label className="text-sm text-purple-200/80 mb-1 block">Tiêu đề:</label>
                                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nhập tiêu đề..."
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none text-sm" />
                            </div>
                            <div className="mb-5">
                                <label className="text-sm text-purple-200/80 mb-1 block">Mô tả:</label>
                                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Mô tả..." rows={2}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none text-sm resize-none" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowAddDialog(false)} className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl hover:bg-white/10 text-sm">Hủy</button>
                                <button onClick={addPainting} disabled={!newImageUrl || uploading}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> Lưu</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================
// Painting Detail Modal
// ============================================================
function PaintingModal({ painting, onClose }: { painting: GalleryPainting; onClose: () => void }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                className="max-w-3xl w-full bg-slate-800/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <img src={painting.imageUrl} alt={painting.title} className="w-full max-h-[60vh] object-contain bg-black" />
                    <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 backdrop-blur-sm"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-white">{painting.title || 'Không có tiêu đề'}</h3>
                    {painting.description && <p className="text-slate-300/80 mt-2">{painting.description}</p>}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================================
// Main Component
// ============================================================
const PhongTranh3D: React.FC<PhongTranh3DProps> = ({ user, onRequireLogin }) => {
    const [screen, setScreen] = useState<Screen>('LIST');
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [currentGallery, setCurrentGallery] = useState<Gallery | null>(null);
    const [viewingGallery, setViewingGallery] = useState<Gallery | null>(null);
    const [selectedPainting, setSelectedPainting] = useState<GalleryPainting | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => { loadGalleries(); }, [user]);
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('gallery');
        if (id) loadShared(id);
    }, []);

    const loadGalleries = async () => { if (!user) { setLoading(false); return; } setLoading(true); setGalleries(await getUserGalleries(user.email)); setLoading(false); };
    const loadShared = async (id: string) => { const g = await getGallery(id); if (g) { setViewingGallery(g); setScreen('VIEWER'); } };
    const handleCreate = () => { if (!user) { onRequireLogin?.(); return; } setCurrentGallery(null); setScreen('EDITOR'); };
    const handleDelete = async (g: Gallery) => { if (!confirm(`Xóa "${g.title}"?`)) return; await deleteGallery(g.id); await loadGalleries(); };
    const handleShare = (g: Gallery) => { setShareUrl(`${location.origin}?app=phong_tranh_3d&gallery=${g.id}`); setShowShareModal(true); };
    const handleCopy = async () => { try { await navigator.clipboard.writeText(shareUrl); } catch { const i = document.createElement('input'); i.value = shareUrl; document.body.appendChild(i); i.select(); document.execCommand('copy'); document.body.removeChild(i); } setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const handleSave = async (data: Omit<Gallery, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user) return; data.ownerEmail = user.email; data.ownerName = user.name;
        if (currentGallery) await updateGallery(currentGallery.id, data); else await createGallery(data);
        await loadGalleries(); setScreen('LIST');
    };

    if (loading) return (<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>);

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {screen === 'LIST' && <GalleryList galleries={galleries}
                    onView={g => { setViewingGallery(g); setScreen('VIEWER'); }} onEdit={g => { setCurrentGallery(g); setScreen('EDITOR'); }}
                    onDelete={handleDelete} onShare={handleShare} onCreate={handleCreate} />}
                {screen === 'EDITOR' && <GalleryEditor gallery={currentGallery} onSave={handleSave} onCancel={() => setScreen('LIST')} />}
                {screen === 'VIEWER' && viewingGallery && <GalleryViewer gallery={viewingGallery} onPaintingClick={p => setSelectedPainting(p)}
                    onBack={() => { setScreen('LIST'); setViewingGallery(null); }} />}
            </div>
            <AnimatePresence>{selectedPainting && <PaintingModal painting={selectedPainting} onClose={() => setSelectedPainting(null)} />}</AnimatePresence>
            <AnimatePresence>
                {showShareModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowShareModal(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Share2 className="w-5 h-5 text-purple-400" /> Chia sẻ</h3>
                            <div className="flex items-center gap-2">
                                <input type="text" value={shareUrl} readOnly className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm" />
                                <button onClick={handleCopy} className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 ${copied ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-500'} text-white`}>
                                    {copied ? <><Check className="w-4 h-4" /> Đã copy</> : <><Copy className="w-4 h-4" /> Copy</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PhongTranh3D;
