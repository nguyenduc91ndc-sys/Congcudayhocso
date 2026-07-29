import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, BookOpen, Check, Copy, Edit3, Eye, Fullscreen, Image as ImageIcon,
    Loader2, Monitor, Mountain, Palette, Plus, Save, School, Sparkles, Trash2, Upload, X
} from 'lucide-react';
import {
    Gallery,
    GalleryPainting,
    GalleryTemplate,
    createGalleryShareId,
    createGallery,
    deleteGallery,
    getGallery,
    getUserGalleries,
    updateGallery,
    updateGalleryPainting
} from '../utils/firebaseGallery';
import { compressImageForUpload, compressImageToDataUrl, isValidImage, uploadImageWithProgress } from '../utils/firebaseStorage';

interface Props {
    user: { email?: string; name?: string } | null;
    onRequireLogin?: () => void;
    onBack?: () => void;
}

type ScreenMode = 'dashboard' | 'editor' | 'viewer';

const degToRad = (value: number) => value * Math.PI / 180;

const ROOM_TEMPLATES: Array<{
    id: GalleryTemplate;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    panoramaUrl: string;
    color: string;
}> = [
    {
        id: 'classroom',
        label: 'Lớp học vui',
        subtitle: 'Trưng bày sản phẩm học tập',
        icon: <School size={20} />,
        panoramaUrl: '/dinhoclap3d/sharp_panorama.png',
        color: 'from-sky-400 to-cyan-500'
    },
    {
        id: 'nature',
        label: 'Thiên nhiên',
        subtitle: 'Chủ đề cây xanh, trái đất',
        icon: <Mountain size={20} />,
        panoramaUrl: '/dinhoclap3d/countryside_panorama.png',
        color: 'from-emerald-400 to-lime-500'
    },
    {
        id: 'history',
        label: 'Lịch sử',
        subtitle: 'Ảnh tư liệu, nhân vật, sự kiện',
        icon: <BookOpen size={20} />,
        panoramaUrl: '/dinhoclap3d/vietnam_panorama.png',
        color: 'from-amber-400 to-orange-500'
    },
    {
        id: 'technology',
        label: 'Công nghệ',
        subtitle: 'AI, robot, STEM, sản phẩm số',
        icon: <Monitor size={20} />,
        panoramaUrl: '/dinhoclap3d/sharp_panorama.png',
        color: 'from-violet-500 to-fuchsia-500'
    }
];

const getTemplate = (id: GalleryTemplate) => ROOM_TEMPLATES.find(template => template.id === id) || ROOM_TEMPLATES[0];

const DEFAULT_FRAME_COUNT = 16;

const getEvenCoordinate = (slot: number, count: number, min: number, max: number) => {
    if (count <= 1) return (min + max) / 2;
    const gap = (max - min) / (count - 1);
    return min + gap * slot;
};

const getBalancedFramePosition = (index: number, total = DEFAULT_FRAME_COUNT): [number, number, number] => {
    const wallIndex = index % 4;
    const slotOnWall = Math.floor(index / 4);
    const countOnWall = Math.ceil(Math.max(1, total - wallIndex) / 4);
    const columns = countOnWall <= 4 ? countOnWall : 4;
    const row = Math.floor(slotOnWall / columns);
    const column = slotOnWall % columns;
    const y = countOnWall <= 4 ? 0.95 : Math.max(-0.72, 1.45 - row * 1.55);

    if (wallIndex === 0) return [getEvenCoordinate(column, columns, -4.9, 4.9), y, -5.84];
    if (wallIndex === 1) return [6.84, y, getEvenCoordinate(column, columns, -4.25, 4.25)];
    if (wallIndex === 2) return [getEvenCoordinate(column, columns, 4.9, -4.9), y, 4.94];
    return [-6.84, y, getEvenCoordinate(column, columns, 4.25, -4.25)];
};

const getYawForWallPoint = (x: number, z: number) => z > 4 ? 180 : x > 6 ? 90 : x < -6 ? -90 : 0;

const clampFramePointToRoom = (point: THREE.Vector3) => {
    const isLeft = point.x < -6.2;
    const isRight = point.x > 6.2;
    const isBack = point.z > 4.2;
    return new THREE.Vector3(
        isLeft ? -6.84 : isRight ? 6.84 : Math.max(-5.7, Math.min(5.7, point.x)),
        Math.max(-1.05, Math.min(2.45, point.y)),
        isLeft || isRight ? Math.max(-4.65, Math.min(4.55, point.z)) : isBack ? 4.94 : -5.84
    );
};

const applyFramePoint = (frame: GalleryPainting, point: THREE.Vector3): GalleryPainting => {
    const clamped = clampFramePointToRoom(point);
    return {
        ...frame,
        x: clamped.x,
        y: clamped.y,
        z: clamped.z,
        yaw: degToRad(getYawForWallPoint(clamped.x, clamped.z)),
        pitch: 0
    };
};

const getFrameWallNormal = (frame: GalleryPainting) => {
    const point = getFrameWorldPosition(frame);
    if (point.x < -6.2) return new THREE.Vector3(1, 0, 0);
    if (point.x > 6.2) return new THREE.Vector3(-1, 0, 0);
    if (point.z > 4.2) return new THREE.Vector3(0, 0, -1);
    return new THREE.Vector3(0, 0, 1);
};

const getFrameWallRotation = (point: THREE.Vector3) => {
    if (point.x < -6) return Math.PI / 2;
    if (point.x > 6) return -Math.PI / 2;
    if (point.z > 4) return Math.PI;
    return 0;
};

const createDefaultPaintings = (): GalleryPainting[] => Array.from({ length: DEFAULT_FRAME_COUNT }, (_, index) => {
    const [x, y, z] = getBalancedFramePosition(index, DEFAULT_FRAME_COUNT);
    const yaw = getYawForWallPoint(x, z);
    return {
        id: `frame-${index + 1}`,
        label: `Khung ${index + 1}`,
        yaw: degToRad(yaw),
        pitch: 0,
        position: index,
        x,
        y,
        z
    };
});

const createFallbackPainting = (index: number, total = index + 1): GalleryPainting => {
    const [x, y, z] = getBalancedFramePosition(index, total);
    const yaw = getYawForWallPoint(x, z);
    return {
        id: `frame-${Date.now()}-${index + 1}`,
        label: `Khung ${index + 1}`,
        yaw: degToRad(yaw),
        pitch: 0,
        position: index,
        x,
        y,
        z
    };
};

const normalizePaintings = (paintings?: GalleryPainting[]): GalleryPainting[] => {
    const defaults = createDefaultPaintings();
    if (!paintings?.length) return defaults;

    const length = paintings.length;
    return Array.from({ length }, (_, index) => {
        const fallback = defaults[index] || createFallbackPainting(index, length);
        const painting = paintings[index];
        return {
            ...fallback,
            ...(painting || {}),
            id: painting?.id || fallback.id,
            label: painting?.label || fallback.label,
            yaw: typeof painting?.yaw === 'number' ? painting.yaw : fallback.yaw,
            pitch: typeof painting?.pitch === 'number' ? painting.pitch : fallback.pitch,
            position: typeof painting?.position === 'number' ? painting.position : index
        };
    });
};

const getFilledCount = (gallery: Gallery) => normalizePaintings(gallery.paintings).filter(frame => frame.imageUrl || frame.youtubeUrl || frame.title || frame.description).length;

const getShareUrl = (galleryId: string) => `${window.location.origin}/share/panorama/${createGalleryShareId(galleryId)}`;

const getSafeExternalUrl = (value?: string) => {
    const rawValue = value?.trim();
    if (!rawValue) return '';

    const candidate = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;
    try {
        const url = new URL(candidate);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
    } catch {
        return '';
    }
};

const KID_FRAME_COLORS = ['#fb7185', '#38bdf8', '#facc15', '#34d399', '#a78bfa', '#fb923c'];

const getFrameWorldPosition = (frame: GalleryPainting) => {
    if (typeof frame.x === 'number' && typeof frame.y === 'number' && typeof frame.z === 'number') {
        return new THREE.Vector3(frame.x, frame.y, frame.z);
    }

    const index = typeof frame.position === 'number' ? frame.position : Number(frame.id.replace(/\D/g, '')) - 1;
    const [x, y, z] = getBalancedFramePosition(Math.max(0, index), DEFAULT_FRAME_COUNT);
    return new THREE.Vector3(x, y, z);
};

const hasFrameContent = (frame: GalleryPainting) => Boolean(frame.imageUrl || frame.youtubeUrl || frame.title || frame.description);

const createFloorTexture = (baseColor: string, accentColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return canvas;

    context.fillStyle = baseColor;
    context.fillRect(0, 0, 256, 256);
    context.globalAlpha = 0.18;
    context.fillStyle = '#ffffff';
    for (let y = 0; y < 256; y += 64) {
        for (let x = 0; x < 256; x += 64) {
            if ((x + y) / 64 % 2 === 0) context.fillRect(x, y, 64, 64);
        }
    }
    context.globalAlpha = 0.35;
    context.strokeStyle = accentColor;
    context.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, 256);
        context.moveTo(0, i);
        context.lineTo(256, i);
        context.stroke();
    }
    context.globalAlpha = 1;
    return canvas;
};

const createTechWallTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return canvas;

    const gradient = context.createLinearGradient(0, 0, 1024, 512);
    gradient.addColorStop(0, '#e0f2fe');
    gradient.addColorStop(0.5, '#f8fafc');
    gradient.addColorStop(1, '#dcfce7');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 512);

    context.globalAlpha = 0.16;
    context.strokeStyle = '#0284c7';
    context.lineWidth = 5;
    for (let y = 60; y < 470; y += 82) {
        context.beginPath();
        context.moveTo(40, y);
        context.lineTo(220, y);
        context.lineTo(260, y + 34);
        context.lineTo(420, y + 34);
        context.lineTo(470, y - 18);
        context.lineTo(640, y - 18);
        context.lineTo(690, y + 26);
        context.lineTo(960, y + 26);
        context.stroke();
    }
    context.fillStyle = '#22c55e';
    for (let x = 70; x < 980; x += 120) {
        for (let y = 75; y < 450; y += 110) {
            context.beginPath();
            context.arc(x, y, 10, 0, Math.PI * 2);
            context.fill();
        }
    }

    context.globalAlpha = 0.28;
    context.lineWidth = 9;

    context.strokeStyle = '#0ea5e9';
    context.fillStyle = 'rgba(14,165,233,0.12)';
    context.beginPath();
    context.roundRect?.(76, 66, 156, 118, 20);
    context.fill();
    context.stroke();
    context.strokeStyle = '#22c55e';
    for (let i = 0; i < 5; i += 1) {
        const x = 52 + i * 38;
        context.beginPath();
        context.moveTo(x, 48);
        context.lineTo(x, 66);
        context.moveTo(x, 184);
        context.lineTo(x, 204);
        context.stroke();
    }

    context.strokeStyle = '#8b5cf6';
    context.fillStyle = 'rgba(139,92,246,0.1)';
    context.beginPath();
    context.arc(810, 132, 66, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(786, 118, 10, 0, Math.PI * 2);
    context.arc(834, 118, 10, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(784, 154);
    context.quadraticCurveTo(810, 174, 838, 154);
    context.stroke();
    context.beginPath();
    context.moveTo(810, 66);
    context.lineTo(810, 38);
    context.moveTo(764, 206);
    context.lineTo(738, 236);
    context.moveTo(856, 206);
    context.lineTo(884, 236);
    context.stroke();

    context.strokeStyle = '#f97316';
    context.fillStyle = 'rgba(249,115,22,0.12)';
    context.beginPath();
    context.roundRect?.(690, 306, 198, 104, 24);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(744, 358);
    context.lineTo(716, 338);
    context.lineTo(744, 318);
    context.moveTo(834, 318);
    context.lineTo(862, 338);
    context.lineTo(834, 358);
    context.moveTo(784, 376);
    context.lineTo(808, 302);
    context.stroke();

    context.globalAlpha = 0.16;
    context.fillStyle = '#0ea5e9';
    [310, 520, 615].forEach((x, index) => {
        context.beginPath();
        context.arc(x, 108 + index * 76, 42, 0, Math.PI * 2);
        context.fill();
    });

    return canvas;
};

const getSharedGalleryId = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === 'phong_tranh_3d' && params.get('id')) return params.get('id');

    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[0] === 'share' && (segments[1] === 'phong-tranh-3d' || segments[1] === 'panorama')) {
        return segments[2];
    }
    return null;
};

function GalleryCanvas({
    gallery,
    selectedFrameId,
    readOnly,
    onSelectFrame,
    onMoveFrame
}: {
    gallery: Gallery;
    selectedFrameId?: string;
    readOnly: boolean;
    onSelectFrame: (frame: GalleryPainting) => void;
    onMoveFrame?: (frame: GalleryPainting) => void | Promise<void>;
}) {
    const paintings = useMemo(() => normalizePaintings(gallery.paintings), [gallery.paintings]);
    const mountRef = useRef<HTMLDivElement>(null);
    const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const canvasApiRef = useRef<{
        getFramePointFromPointer: (frame: GalleryPainting, event: PointerEvent | React.PointerEvent) => THREE.Vector3 | null;
        moveFrameVisual: (frame: GalleryPainting) => void;
        setDraggingFrameId: (frameId: string | null) => void;
    } | null>(null);
    const onSelectFrameRef = useRef(onSelectFrame);
    const onMoveFrameRef = useRef(onMoveFrame);
    const overlayDragRef = useRef<{
        frame: GalleryPainting;
        pointerId: number;
        startX: number;
        startY: number;
        moved: boolean;
    } | null>(null);
    const suppressOverlayClickRef = useRef(false);

    useEffect(() => {
        onSelectFrameRef.current = onSelectFrame;
        onMoveFrameRef.current = onMoveFrame;
    }, [onSelectFrame, onMoveFrame]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#101827');
        scene.fog = new THREE.Fog('#101827', 10, 24);
        const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1000);
        camera.position.set(0, 0.55, 1.6);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x020617, 1);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        mount.appendChild(renderer.domElement);

        let disposed = false;
        const themeColors: Record<GalleryTemplate, { wall: string; side: string; floor: string; accent: string; light: string }> = {
            classroom: { wall: '#fff7ed', side: '#e0f2fe', floor: '#fbbf24', accent: '#38bdf8', light: '#fff7ed' },
            nature: { wall: '#ecfdf5', side: '#d9f99d', floor: '#6b8e23', accent: '#22c55e', light: '#fef9c3' },
            history: { wall: '#f8ead1', side: '#ead3ad', floor: '#a16207', accent: '#f59e0b', light: '#fff7ed' },
            technology: { wall: '#eef8ff', side: '#ecfeff', floor: '#93c5fd', accent: '#0ea5e9', light: '#dbeafe' }
        };
        const colors = themeColors[gallery.template] || themeColors.classroom;
        const created: Array<{ dispose?: () => void }> = [];
        const clickablePaintings: THREE.Object3D[] = [];
        const frameGroups = new Map<string, THREE.Group>();
        const liveFramePositions = new Map<string, THREE.Vector3>();
        let draggingFrameId: string | null = null;
        const addMesh = (mesh: THREE.Mesh) => {
            scene.add(mesh);
            created.push(mesh.geometry, mesh.material as THREE.Material);
            return mesh;
        };
        const setGroupWallRotation = (group: THREE.Group, point: THREE.Vector3) => {
            group.rotation.y = getFrameWallRotation(point);
        };
        const moveFrameVisual = (frame: GalleryPainting) => {
            const point = getFrameWorldPosition(frame);
            liveFramePositions.set(frame.id, point.clone());
            const group = frameGroups.get(frame.id);
            if (group) {
                group.position.copy(point);
                setGroupWallRotation(group, point);
            }
        };

        const floorTexture = new THREE.CanvasTexture(createFloorTexture(colors.floor, colors.accent));
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(8, 7);
        created.push(floorTexture);

        const wallTexture = gallery.template === 'technology' ? new THREE.CanvasTexture(createTechWallTexture()) : null;
        if (wallTexture) {
            wallTexture.colorSpace = THREE.SRGBColorSpace;
            created.push(wallTexture);
        }

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: colors.wall,
            map: wallTexture || undefined,
            roughness: 0.86,
            metalness: 0.02
        });
        const sideMaterial = new THREE.MeshStandardMaterial({ color: colors.side, roughness: 0.9, metalness: 0.02 });
        const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.72, metalness: 0.04 });
        const ceilingMaterial = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.95 });

        addMesh(new THREE.Mesh(new THREE.PlaneGeometry(14, 11.5), floorMaterial)).rotation.x = -Math.PI / 2;
        scene.children[scene.children.length - 1].position.set(0, -1.75, -0.7);
        addMesh(new THREE.Mesh(new THREE.PlaneGeometry(14, 5.4), wallMaterial)).position.set(0, 0.85, -6);
        const leftWall = addMesh(new THREE.Mesh(new THREE.PlaneGeometry(11.5, 5.4), sideMaterial));
        leftWall.position.set(-7, 0.85, -0.7);
        leftWall.rotation.y = Math.PI / 2;
        const rightWall = addMesh(new THREE.Mesh(new THREE.PlaneGeometry(11.5, 5.4), sideMaterial));
        rightWall.position.set(7, 0.85, -0.7);
        rightWall.rotation.y = -Math.PI / 2;
        const backWall = addMesh(new THREE.Mesh(new THREE.PlaneGeometry(14, 5.4), sideMaterial));
        backWall.position.set(0, 0.85, 5.05);
        backWall.rotation.y = Math.PI;
        const ceiling = addMesh(new THREE.Mesh(new THREE.PlaneGeometry(14, 11.5), ceilingMaterial));
        ceiling.position.set(0, 3.55, -0.7);
        ceiling.rotation.x = Math.PI / 2;

        const trimMaterial = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.5, metalness: gallery.template === 'technology' ? 0.26 : 0.08 });
        const addBox = (size: [number, number, number], position: [number, number, number]) => {
            const mesh = addMesh(new THREE.Mesh(new THREE.BoxGeometry(...size), trimMaterial));
            mesh.position.set(...position);
            return mesh;
        };
        addBox([14.1, 0.08, 0.08], [0, -1.32, -5.94]);
        addBox([14.1, 0.08, 0.08], [0, 3.05, -5.94]);
        addBox([14.1, 0.08, 0.08], [0, -1.32, 5.0]);
        addBox([14.1, 0.08, 0.08], [0, 3.05, 5.0]);
        addBox([0.08, 4.38, 0.08], [-6.25, 0.86, -5.93]);
        addBox([0.08, 4.38, 0.08], [6.25, 0.86, -5.93]);
        addBox([0.08, 4.38, 0.08], [-6.25, 0.86, 5.0]);
        addBox([0.08, 4.38, 0.08], [6.25, 0.86, 5.0]);
        addBox([0.08, 4.38, 11.02], [-6.96, 0.86, -0.47]);
        addBox([0.08, 4.38, 11.02], [6.96, 0.86, -0.47]);

        if (gallery.template === 'technology') {
            const iconMaterial = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.42, metalness: 0.18 });
            const iconAccentMaterial = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.45, metalness: 0.12 });
            created.push(iconMaterial, iconAccentMaterial);

            const chip = new THREE.Group();
            chip.position.set(-5.05, 2.18, -5.86);
            scene.add(chip);
            const chipBody = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.54, 0.06), iconMaterial);
            chip.add(chipBody);
            created.push(chipBody.geometry);
            for (let i = 0; i < 4; i += 1) {
                const y = -0.27 + i * 0.18;
                const leftPin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.035), iconAccentMaterial);
                const rightPin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.035), iconAccentMaterial);
                leftPin.position.set(-0.44, y, 0);
                rightPin.position.set(0.44, y, 0);
                chip.add(leftPin, rightPin);
                created.push(leftPin.geometry, rightPin.geometry);
            }

            const codeIcon = new THREE.Group();
            codeIcon.position.set(4.85, 2.08, -5.86);
            scene.add(codeIcon);
            const codeLeft = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24, Math.PI * 1.25), iconAccentMaterial);
            const codeRight = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24, Math.PI * 1.25), iconAccentMaterial);
            const codeSlash = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.72, 0.035), iconMaterial);
            codeLeft.rotation.z = Math.PI * 0.9;
            codeRight.rotation.z = -Math.PI * 0.1;
            codeLeft.position.set(-0.28, 0, 0);
            codeRight.position.set(0.28, 0, 0);
            codeSlash.rotation.z = -0.36;
            codeIcon.add(codeLeft, codeRight, codeSlash);
            created.push(codeLeft.geometry, codeRight.geometry, codeSlash.geometry);

            const robotMaterial = new THREE.MeshStandardMaterial({ color: '#e0f2fe', roughness: 0.34, metalness: 0.24 });
            const screenMaterial = new THREE.MeshBasicMaterial({ color: '#22c55e' });
            created.push(robotMaterial, screenMaterial);
            const robot = new THREE.Group();
            robot.position.set(0, -1.03, -4.72);
            scene.add(robot);
            const robotBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.28), robotMaterial);
            const robotHead = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.28), robotMaterial);
            const robotScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), screenMaterial);
            robotBody.position.set(0, 0.25, 0);
            robotHead.position.set(0, 0.86, 0);
            robotScreen.position.set(0, 0.86, -0.145);
            robot.add(robotBody, robotHead, robotScreen);
            created.push(robotBody.geometry, robotHead.geometry, robotScreen.geometry);
        }

        const visitorRobot = new THREE.Group();
        scene.add(visitorRobot);
        const visitorWhite = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.38, metalness: 0.12 });
        const visitorBlue = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.36, metalness: 0.16 });
        const visitorScreen = new THREE.MeshBasicMaterial({ color: '#0f172a' });
        const visitorEye = new THREE.MeshBasicMaterial({ color: '#22c55e' });
        const visitorCheek = new THREE.MeshBasicMaterial({ color: '#fb7185', transparent: true, opacity: 0.86 });
        const visitorArrow = new THREE.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.92 });
        const visitorShadow = new THREE.MeshBasicMaterial({ color: '#0f172a', transparent: true, opacity: 0.18 });
        created.push(visitorWhite, visitorBlue, visitorScreen, visitorEye, visitorCheek, visitorArrow, visitorShadow);

        const robotShadow = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), visitorShadow);
        robotShadow.rotation.x = -Math.PI / 2;
        robotShadow.position.set(0, -0.2, 0.03);
        visitorRobot.add(robotShadow);

        const visitorBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.28), visitorWhite);
        visitorBody.position.set(0, 0.36, 0);
        visitorRobot.add(visitorBody);

        const visitorChest = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), visitorBlue);
        visitorChest.position.set(0, 0.39, -0.145);
        visitorRobot.add(visitorChest);

        const visitorHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.3), visitorWhite);
        visitorHead.position.set(0, 0.84, 0);
        visitorRobot.add(visitorHead);

        const visitorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.2), visitorScreen);
        visitorFace.position.set(0, 0.84, -0.155);
        visitorRobot.add(visitorFace);

        const leftEye = new THREE.Mesh(new THREE.CircleGeometry(0.035, 18), visitorEye);
        const rightEye = new THREE.Mesh(new THREE.CircleGeometry(0.035, 18), visitorEye);
        leftEye.position.set(-0.1, 0.86, -0.162);
        rightEye.position.set(0.1, 0.86, -0.162);
        visitorRobot.add(leftEye, rightEye);

        const leftCheek = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), visitorCheek);
        const rightCheek = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), visitorCheek);
        leftCheek.position.set(-0.18, 0.8, -0.163);
        rightCheek.position.set(0.18, 0.8, -0.163);
        visitorRobot.add(leftCheek, rightCheek);

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 12), visitorBlue);
        const antennaDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), visitorArrow);
        antenna.position.set(0, 1.12, 0);
        antennaDot.position.set(0, 1.24, 0);
        visitorRobot.add(antenna, antennaDot);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), visitorBlue);
        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), visitorBlue);
        leftArm.position.set(-0.34, 0.43, 0);
        rightArm.position.set(0.34, 0.43, 0);
        visitorRobot.add(leftArm, rightArm);

        const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.24), visitorBlue);
        const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.24), visitorBlue);
        leftFoot.position.set(-0.14, 0.07, -0.02);
        rightFoot.position.set(0.14, 0.07, -0.02);
        visitorRobot.add(leftFoot, rightFoot);

        const floorArrow = new THREE.Group();
        floorArrow.position.set(0, -0.17, -0.74);
        const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.46), visitorArrow);
        const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 3), visitorArrow);
        arrowShaft.position.set(0, 0, 0.16);
        arrowHead.position.set(0, 0, -0.18);
        arrowHead.rotation.x = -Math.PI / 2;
        floorArrow.add(arrowShaft, arrowHead);
        visitorRobot.add(floorArrow);

        created.push(
            robotShadow.geometry, visitorBody.geometry, visitorChest.geometry, visitorHead.geometry,
            visitorFace.geometry, leftEye.geometry, rightEye.geometry, leftCheek.geometry, rightCheek.geometry,
            antenna.geometry, antennaDot.geometry, leftArm.geometry, rightArm.geometry, leftFoot.geometry,
            rightFoot.geometry, arrowShaft.geometry, arrowHead.geometry
        );

        const addPaintingSurface = (frame: GalleryPainting, index: number) => {
            if (!hasFrameContent(frame)) return;

            const point = getFrameWorldPosition(frame);
            liveFramePositions.set(frame.id, point.clone());
            const frameColor = KID_FRAME_COLORS[index % KID_FRAME_COLORS.length];
            const group = new THREE.Group();
            group.position.copy(point);
            setGroupWallRotation(group, point);
            frameGroups.set(frame.id, group);
            scene.add(group);

            if (frame.imageUrl) {
                const image = new Image();
                image.onload = () => {
                    if (disposed) return;

                    const maxWidth = 1.7;
                    const maxHeight = 1.25;
                    const aspect = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1.25;
                    const width = aspect >= maxWidth / maxHeight ? maxWidth : maxHeight * aspect;
                    const height = aspect >= maxWidth / maxHeight ? maxWidth / aspect : maxHeight;
                    const shadowMaterial = new THREE.MeshBasicMaterial({
                        color: '#0f172a',
                        transparent: true,
                        opacity: 0.16
                    });
                    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.08, height + 0.08), shadowMaterial);
                    shadow.position.set(0.035, -0.035, -0.015);
                    group.add(shadow);
                    created.push(shadow.geometry, shadowMaterial);

                    const texture = new THREE.Texture(image);
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.needsUpdate = true;
                    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
                    mesh.position.set(0, 0, 0.02);
                    mesh.userData.frameId = frame.id;
                    clickablePaintings.push(mesh);
                    group.add(mesh);
                    created.push(texture, material, mesh.geometry);
                };
                image.src = frame.imageUrl;
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 340;
                const context = canvas.getContext('2d');
                if (context) {
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, 512, 340);
                    context.fillStyle = frame.youtubeUrl ? '#ef4444' : frameColor;
                    context.beginPath();
                    context.roundRect?.(42, 44, 428, 252, 28);
                    context.fill();
                    context.fillStyle = '#ffffff';
                    context.font = '900 54px Arial';
                    context.textAlign = 'center';
                    context.fillText(frame.youtubeUrl ? 'VIDEO' : (frame.title || frame.label), 256, 185);
                }
                const texture = new THREE.CanvasTexture(canvas);
                texture.colorSpace = THREE.SRGBColorSpace;
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const shadowMaterial = new THREE.MeshBasicMaterial({
                    color: '#0f172a',
                    transparent: true,
                    opacity: 0.16
                });
                const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.63, 1.11), shadowMaterial);
                shadow.position.set(0.035, -0.035, -0.015);
                group.add(shadow);
                created.push(shadow.geometry, shadowMaterial);
                const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.03), material);
                mesh.position.set(0, 0, 0.02);
                mesh.userData.frameId = frame.id;
                clickablePaintings.push(mesh);
                group.add(mesh);
                created.push(texture, material, mesh.geometry);
            }
        };
        paintings.forEach(frame => {
            if (!liveFramePositions.has(frame.id)) liveFramePositions.set(frame.id, getFrameWorldPosition(frame));
        });
        paintings.forEach(addPaintingSurface);

        const addWallDot = (x: number, y: number, color: string) => {
            const material = new THREE.MeshBasicMaterial({ color });
            const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), material);
            mesh.position.set(x, y, -5.91);
            scene.add(mesh);
            created.push(mesh.geometry, material);
        };
        [-5.8, -4.1, -2.4, -0.7, 1, 2.7, 4.4, 6.1].forEach((x, index) => {
            addWallDot(x, 2.72 + (index % 2) * 0.18, KID_FRAME_COLORS[index % KID_FRAME_COLORS.length]);
        });

        scene.add(new THREE.HemisphereLight('#ffffff', '#475569', 1.45));
        const keyLight = new THREE.DirectionalLight('#ffffff', 2.6);
        keyLight.position.set(0, 5.5, 3.5);
        scene.add(keyLight);
        [-4, 0, 4].forEach((x) => {
            const light = new THREE.PointLight(colors.light, 42, 7, 1.5);
            light.position.set(x, 2.8, -3.2);
            scene.add(light);
            const lamp = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.16, 24), new THREE.MeshBasicMaterial({ color: colors.light })));
            lamp.position.set(x, 3.36, -3.2);
        });
        [-3, 3].forEach((x) => {
            const light = new THREE.PointLight(colors.light, 28, 6, 1.5);
            light.position.set(x, 2.6, 3.1);
            scene.add(light);
        });

        let yaw = 0;
        let pitch = -0.04;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startYaw = 0;
        let startPitch = 0;
        let draggedFrame: GalleryPainting | null = null;
        let frameDragMoved = false;
        let frameId = 0;
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        visitorRobot.position.set(-1.25, -1.54, -0.85);

        const getHoveredPainting = (event: PointerEvent) => {
            if (clickablePaintings.length === 0) return null;

            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
            raycaster.setFromCamera(pointer, camera);
            return raycaster.intersectObjects(clickablePaintings, false)[0] || null;
        };
        const getFramePointFromPointer = (frame: GalleryPainting, event: PointerEvent | React.PointerEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
            raycaster.setFromCamera(pointer, camera);

            const point = liveFramePositions.get(frame.id) || getFrameWorldPosition(frame);
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(getFrameWallNormal(frame), point);
            const hit = new THREE.Vector3();
            if (!raycaster.ray.intersectPlane(plane, hit)) return null;
            return clampFramePointToRoom(hit);
        };

        canvasApiRef.current = {
            getFramePointFromPointer,
            moveFrameVisual,
            setDraggingFrameId: (frameId) => {
                draggingFrameId = frameId;
                renderer.domElement.style.cursor = frameId ? 'grabbing' : 'grab';
            }
        };

        const updateCanvasCursor = (event?: PointerEvent) => {
            if (isDragging || draggingFrameId) {
                renderer.domElement.style.cursor = 'grabbing';
                return;
            }

            if (event && getHoveredPainting(event)) {
                renderer.domElement.style.cursor = 'pointer';
                return;
            }

            renderer.domElement.style.cursor = 'grab';
        };

        const resize = () => {
            const rect = mount.getBoundingClientRect();
            const width = Math.max(1, rect.width);
            const height = Math.max(1, rect.height);
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        const updateVisitorRobot = () => {
            const time = performance.now() * 0.001;
            const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
            const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
            const target = camera.position
                .clone()
                .add(forward.multiplyScalar(2.45))
                .add(right.multiplyScalar(-1.25));

            target.x = Math.max(-5.85, Math.min(5.85, target.x));
            target.z = Math.max(-4.75, Math.min(4.35, target.z));
            target.y = -1.54 + Math.sin(time * 5.2) * 0.035;
            visitorRobot.position.lerp(target, 0.18);
            visitorRobot.rotation.y = -yaw;

            const walk = Math.sin(time * 6);
            visitorHead.rotation.z = walk * 0.035;
            leftArm.rotation.x = walk * 0.42;
            rightArm.rotation.x = -walk * 0.42;
            leftFoot.position.y = 0.07 + Math.max(0, walk) * 0.035;
            rightFoot.position.y = 0.07 + Math.max(0, -walk) * 0.035;
            floorArrow.position.y = -0.17 + Math.sin(time * 4.2) * 0.018;
        };

        const updateCamera = () => {
            pitch = Math.max(-0.65, Math.min(0.48, pitch));
            const direction = new THREE.Vector3(
                Math.sin(yaw) * Math.cos(pitch),
                Math.sin(pitch),
                -Math.cos(yaw) * Math.cos(pitch)
            );
            const target = camera.position.clone().add(direction);
            camera.lookAt(target);
        };

        const updateHotspots = () => {
            const rect = mount.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            paintings.forEach((frame) => {
                const element = hotspotRefs.current[frame.id];
                if (!element) return;

                const point = liveFramePositions.get(frame.id)?.clone() || getFrameWorldPosition(frame);
                const cameraDirection = new THREE.Vector3();
                camera.getWorldDirection(cameraDirection);
                const visible = point.clone().sub(camera.position).normalize().dot(cameraDirection) > 0.05;
                const projected = point.project(camera);
                const x = (projected.x * 0.5 + 0.5) * width;
                const y = (-projected.y * 0.5 + 0.5) * height;

                element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
                element.style.opacity = visible ? '1' : '0';
                element.style.pointerEvents = visible ? 'auto' : 'none';
            });
        };

        const animate = () => {
            if (disposed) return;
            updateCamera();
            updateVisitorRobot();
            renderer.render(scene, camera);
            updateHotspots();
            frameId = window.requestAnimationFrame(animate);
        };

        const onPointerDown = (event: PointerEvent) => {
            const hit = !readOnly ? getHoveredPainting(event) : null;
            const hitFrameId = hit?.object.userData.frameId;
            const hitFrame = paintings.find(item => item.id === hitFrameId);
            if (hitFrame) {
                draggedFrame = hitFrame;
                frameDragMoved = false;
                draggingFrameId = hitFrame.id;
                startX = event.clientX;
                startY = event.clientY;
                renderer.domElement.style.cursor = 'grabbing';
                renderer.domElement.setPointerCapture?.(event.pointerId);
                event.preventDefault();
                return;
            }

            isDragging = true;
            renderer.domElement.style.cursor = 'grabbing';
            startX = event.clientX;
            startY = event.clientY;
            startYaw = yaw;
            startPitch = pitch;
            renderer.domElement.setPointerCapture?.(event.pointerId);
        };

        const onPointerMove = (event: PointerEvent) => {
            if (draggedFrame) {
                event.preventDefault();
                const point = getFramePointFromPointer(draggedFrame, event);
                if (!point) return;
                frameDragMoved = frameDragMoved || Math.hypot(event.clientX - startX, event.clientY - startY) > 4;
                const nextFrame = applyFramePoint(draggedFrame, point);
                draggedFrame = nextFrame;
                moveFrameVisual(nextFrame);
                return;
            }

            if (isDragging) {
                yaw = startYaw - (event.clientX - startX) * 0.0032;
                pitch = startPitch + (event.clientY - startY) * 0.0032;
                return;
            }

            updateCanvasCursor(event);
        };

        const onPointerUp = (event: PointerEvent) => {
            if (draggedFrame) {
                renderer.domElement.releasePointerCapture?.(event.pointerId);
                const nextFrame = draggedFrame;
                const moved = frameDragMoved;
                draggedFrame = null;
                draggingFrameId = null;
                frameDragMoved = false;
                updateCanvasCursor(event);
                if (moved) onMoveFrameRef.current?.(nextFrame);
                else onSelectFrameRef.current(nextFrame);
                return;
            }

            const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
            isDragging = false;
            renderer.domElement.releasePointerCapture?.(event.pointerId);
            updateCanvasCursor(event);

            if (moved > 5 || clickablePaintings.length === 0) return;

            const hit = getHoveredPainting(event);
            const frameId = hit?.object.userData.frameId;
            const frame = paintings.find(item => item.id === frameId);
            if (frame) onSelectFrameRef.current(frame);
        };

        const onPointerLeave = () => {
            if (!isDragging && !draggedFrame) renderer.domElement.style.cursor = 'grab';
        };

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            camera.fov = Math.max(42, Math.min(72, camera.fov + event.deltaY * 0.018));
            camera.updateProjectionMatrix();
        };

        resize();
        updateCamera();
        renderer.domElement.style.cursor = 'grab';
        animate();

        const observer = new ResizeObserver(resize);
        observer.observe(mount);
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerUp);
        renderer.domElement.addEventListener('pointerleave', onPointerLeave);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            disposed = true;
            if (canvasApiRef.current?.moveFrameVisual === moveFrameVisual) canvasApiRef.current = null;
            window.cancelAnimationFrame(frameId);
            observer.disconnect();
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointermove', onPointerMove);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            renderer.domElement.removeEventListener('pointercancel', onPointerUp);
            renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
            renderer.domElement.removeEventListener('wheel', onWheel);
            created.forEach(item => item.dispose?.());
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, [gallery.panoramaUrl, gallery.template, paintings, readOnly]);

    const handleHotspotPointerDown = (frame: GalleryPainting, event: React.PointerEvent<HTMLButtonElement>) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        overlayDragRef.current = {
            frame,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false
        };
        canvasApiRef.current?.setDraggingFrameId(frame.id);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handleHotspotPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        const drag = overlayDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();

        const point = canvasApiRef.current?.getFramePointFromPointer(drag.frame, event);
        if (!point) return;

        drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        const nextFrame = applyFramePoint(drag.frame, point);
        overlayDragRef.current = { ...drag, frame: nextFrame };
        canvasApiRef.current?.moveFrameVisual(nextFrame);
    };

    const finishHotspotDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
        const drag = overlayDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();

        overlayDragRef.current = null;
        canvasApiRef.current?.setDraggingFrameId(null);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (drag.moved) {
            suppressOverlayClickRef.current = true;
            onMoveFrameRef.current?.(drag.frame);
        } else {
            onSelectFrameRef.current(drag.frame);
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-950">
            <div ref={mountRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0">
                {paintings.map(frame => {
                    const active = selectedFrameId === frame.id;
                    const hasContent = hasFrameContent(frame);
                    const frameIndex = typeof frame.position === 'number' ? frame.position : 0;
                    const frameColor = KID_FRAME_COLORS[frameIndex % KID_FRAME_COLORS.length];
                    if (readOnly && !hasContent) return null;

                    if (!hasContent) {
                        return (
                            <button
                                key={frame.id}
                                ref={(element) => { hotspotRefs.current[frame.id] = element; }}
                                type="button"
                                onPointerDown={(event) => handleHotspotPointerDown(frame, event)}
                                onPointerMove={handleHotspotPointerMove}
                                onPointerUp={finishHotspotDrag}
                                onPointerCancel={finishHotspotDrag}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (suppressOverlayClickRef.current) {
                                        suppressOverlayClickRef.current = false;
                                        return;
                                    }
                                    onSelectFrameRef.current(frame);
                                }}
                                className={`pointer-events-auto absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-lg shadow-sky-950/20 transition-[opacity,filter] hover:brightness-110 ${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${active ? 'ring-4 ring-yellow-300' : ''}`}
                                style={{ background: frameColor }}
                                title={`Thêm nội dung cho ${frame.label}`}
                            >
                                +
                            </button>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}
export default function PhongTranh3D({ user, onRequireLogin, onBack }: Props) {
    const [mode, setMode] = useState<ScreenMode>('dashboard');
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [currentGallery, setCurrentGallery] = useState<Gallery | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<GalleryPainting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [saveProgress, setSaveProgress] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTemplate, setNewTemplate] = useState<GalleryTemplate>('classroom');
    const [copiedGalleryId, setCopiedGalleryId] = useState<string | null>(null);
    const [previewFrame, setPreviewFrame] = useState<GalleryPainting | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const userEmail = user?.email || '';
    const userName = user?.name || 'Giáo viên';

    const loadUserGalleries = async () => {
        if (!userEmail) {
            setGalleries([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const data = await getUserGalleries(userEmail);
        setGalleries(data.map(gallery => ({ ...gallery, paintings: normalizePaintings(gallery.paintings) })));
        setIsLoading(false);
    };

    useEffect(() => {
        const sharedId = getSharedGalleryId();
        if (sharedId) {
            setIsLoading(true);
            getGallery(sharedId).then(gallery => {
                if (gallery) {
                    setCurrentGallery({ ...gallery, paintings: normalizePaintings(gallery.paintings) });
                    setMode('viewer');
                }
            }).finally(() => setIsLoading(false));
            return;
        }

        if (!userEmail) {
            setIsLoading(false);
            onRequireLogin?.();
            return;
        }
        loadUserGalleries();
    }, [userEmail]);

    const handleCreateGallery = async () => {
        if (!userEmail) {
            onRequireLogin?.();
            return;
        }

        const title = newTitle.trim();
        if (!title) {
            alert('Vui lòng nhập tên phòng.');
            return;
        }

        const template = getTemplate(newTemplate);
        setIsSaving(true);
        setSaveStatus('Đang tạo phòng...');
        setSaveProgress(0);
        const id = await createGallery({
            title,
            template: template.id,
            panoramaUrl: template.panoramaUrl,
            ownerEmail: userEmail,
            ownerName: userName,
            paintings: createDefaultPaintings()
        });
        setIsSaving(false);
        setSaveStatus('');
        setSaveProgress(0);

        if (!id) return;

        const gallery: Gallery = {
            id,
            title,
            template: template.id,
            panoramaUrl: template.panoramaUrl,
            ownerEmail: userEmail,
            ownerName: userName,
            paintings: createDefaultPaintings(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setGalleries(prev => [gallery, ...prev]);
        setCurrentGallery(gallery);
        setSelectedFrame(gallery.paintings[0]);
        setShowCreateModal(false);
        setNewTitle('');
        setMode('editor');
    };

    const handleDeleteGallery = async (galleryId: string) => {
        if (!confirm('Xoa phong tranh nay?')) return;
        const success = await deleteGallery(galleryId);
        if (success) setGalleries(prev => prev.filter(gallery => gallery.id !== galleryId));
    };

    const handleOpenEditor = (gallery: Gallery) => {
        const normalized = { ...gallery, paintings: normalizePaintings(gallery.paintings) };
        setCurrentGallery(normalized);
        setSelectedFrame(normalized.paintings[0]);
        setMode('editor');
    };

    const handleOpenViewer = (gallery: Gallery) => {
        setCurrentGallery({ ...gallery, paintings: normalizePaintings(gallery.paintings) });
        setSelectedFrame(null);
        setMode('viewer');
    };

    const handleCopyShare = async (galleryId: string) => {
        await navigator.clipboard.writeText(getShareUrl(galleryId));
        setCopiedGalleryId(galleryId);
        setTimeout(() => setCopiedGalleryId(null), 1800);
    };

    const handleFullscreen = () => {
        const element = containerRef.current;
        if (!element) return;
        if (!document.fullscreenElement) element.requestFullscreen?.();
        else document.exitFullscreen?.();
    };

    const openFrameVideoInTab = (frame: GalleryPainting) => {
        const videoUrl = getSafeExternalUrl(frame.youtubeUrl);
        if (!videoUrl) return false;

        window.open(videoUrl, '_blank', 'noopener,noreferrer');
        return true;
    };

    const handleSaveFrame = async (updates: Partial<GalleryPainting>, file?: File | null) => {
        if (!currentGallery || !selectedFrame) return;
        if (!userEmail || currentGallery.ownerEmail !== userEmail) return;

        setIsSaving(true);
        setSaveStatus(file ? 'Đang nén ảnh...' : 'Đang lưu...');
        setSaveProgress(0);
        let nextImageUrl = updates.imageUrl;

        if (file) {
            if (!isValidImage(file)) {
                alert('File anh khong hop le.');
                setIsSaving(false);
                setSaveStatus('');
                setSaveProgress(0);
                return;
            }
            const compressed = await compressImageForUpload(file, { maxWidth: 800, maxHeight: 800, quality: 0.68 });
            setSaveStatus('Đang tải ảnh lên...');
            nextImageUrl = await uploadImageWithProgress(
                compressed,
                `gallery-paintings/${userEmail.replace(/[.#$[\]]/g, '_')}`,
                setSaveProgress
            ) || updates.imageUrl;
        }

        setSaveStatus('Đang lưu khung...');
        const currentPaintings = normalizePaintings(currentGallery.paintings);
        const paintingIndex = currentPaintings.findIndex(frame => frame.id === selectedFrame.id);
        const paintings = currentPaintings.map(frame => (
            frame.id === selectedFrame.id ? { ...frame, ...updates, imageUrl: nextImageUrl } : frame
        ));
        const updatedFrame = paintings[paintingIndex];
        const updatedGallery = { ...currentGallery, paintings, updatedAt: Date.now() };
        setCurrentGallery(updatedGallery);
        setSelectedFrame(updatedFrame || null);
        setGalleries(prev => prev.map(gallery => gallery.id === currentGallery.id ? updatedGallery : gallery));
        if (paintingIndex >= 0 && updatedFrame) {
            await updateGalleryPainting(currentGallery.id, paintingIndex, updatedFrame);
        } else {
            await updateGallery(currentGallery.id, { paintings });
        }
        setIsSaving(false);
        setSaveStatus('');
        setSaveProgress(0);
    };

    const handleUploadFrameFile = async (file: File): Promise<string | null> => {
        if (!userEmail) return null;

        setIsSaving(true);
        setSaveStatus('Đang tối ưu ảnh...');
        setSaveProgress(0);

        if (!isValidImage(file)) {
            alert('File ảnh không hợp lệ.');
            setIsSaving(false);
            setSaveStatus('');
            setSaveProgress(0);
            return null;
        }

        const imageUrl = await compressImageToDataUrl(file, { maxWidth: 520, maxHeight: 520, quality: 0.52 });
        setSaveProgress(100);

        setIsSaving(false);
        setSaveStatus('');
        setSaveProgress(0);
        return imageUrl;
    };

    const handleClearFrame = async () => {
        if (!selectedFrame) return;
        await handleSaveFrame({
            imageUrl: '',
            youtubeUrl: '',
            title: '',
            description: ''
        });
    };

    const applySelectedFrameUpdate = async (nextFrame: GalleryPainting) => {
        if (!currentGallery || !selectedFrame) return;

        const currentPaintings = normalizePaintings(currentGallery.paintings);
        const paintingIndex = currentPaintings.findIndex(frame => frame.id === selectedFrame.id);
        if (paintingIndex < 0) return;

        const paintings = currentPaintings.map(frame => frame.id === selectedFrame.id ? nextFrame : frame);
        const updatedGallery = { ...currentGallery, paintings, updatedAt: Date.now() };
        setCurrentGallery(updatedGallery);
        setSelectedFrame(nextFrame);
        setGalleries(prev => prev.map(gallery => gallery.id === currentGallery.id ? updatedGallery : gallery));
        await updateGalleryPainting(currentGallery.id, paintingIndex, nextFrame);
    };

    const applyFrameUpdate = async (nextFrame: GalleryPainting) => {
        if (!currentGallery) return;

        const currentPaintings = normalizePaintings(currentGallery.paintings);
        const paintingIndex = currentPaintings.findIndex(frame => frame.id === nextFrame.id);
        if (paintingIndex < 0) return;

        const paintings = currentPaintings.map(frame => frame.id === nextFrame.id ? nextFrame : frame);
        const updatedGallery = { ...currentGallery, paintings, updatedAt: Date.now() };
        setCurrentGallery(updatedGallery);
        setSelectedFrame(prev => prev?.id === nextFrame.id ? nextFrame : prev);
        setGalleries(prev => prev.map(gallery => gallery.id === currentGallery.id ? updatedGallery : gallery));
        await updateGalleryPainting(currentGallery.id, paintingIndex, nextFrame);
    };

    const clampFrameToWall = (frame: GalleryPainting, point: THREE.Vector3): GalleryPainting => {
        return applyFramePoint(frame, point);
    };

    const handleMoveSelectedFrame = async (direction: 'left' | 'right' | 'up' | 'down') => {
        if (!selectedFrame) return;
        const point = getFrameWorldPosition(selectedFrame);
        const step = 0.32;
        const isSideWall = point.x < -6.2 || point.x > 6.2;

        if (direction === 'up') point.y += step;
        if (direction === 'down') point.y -= step;
        if (direction === 'left') {
            if (isSideWall) point.z -= step;
            else point.x -= step;
        }
        if (direction === 'right') {
            if (isSideWall) point.z += step;
            else point.x += step;
        }

        await applySelectedFrameUpdate(clampFrameToWall(selectedFrame, point));
    };

    const handleSetSelectedFrameWall = async (wall: 'front' | 'left' | 'right' | 'back') => {
        if (!selectedFrame) return;
        const point = getFrameWorldPosition(selectedFrame);
        const nextPoint = new THREE.Vector3(point.x, point.y, point.z);
        if (wall === 'front') nextPoint.set(Math.max(-5.4, Math.min(5.4, point.x)), point.y, -5.84);
        if (wall === 'back') nextPoint.set(Math.max(-5.4, Math.min(5.4, point.x)), point.y, 4.94);
        if (wall === 'left') nextPoint.set(-6.84, point.y, Math.max(-4.4, Math.min(4.4, point.z)));
        if (wall === 'right') nextPoint.set(6.84, point.y, Math.max(-4.4, Math.min(4.4, point.z)));
        await applySelectedFrameUpdate(clampFrameToWall(selectedFrame, nextPoint));
    };

    const handleAddFrame = async () => {
        if (!currentGallery) return;
        const paintings = normalizePaintings(currentGallery.paintings);
        const nextFrame = {
            ...createFallbackPainting(paintings.length, paintings.length + 1),
            id: `frame-${Date.now()}`,
            label: `Khung ${paintings.length + 1}`,
            position: paintings.length
        };
        const nextPaintings = [...paintings, nextFrame];
        const updatedGallery = { ...currentGallery, paintings: nextPaintings, updatedAt: Date.now() };
        setCurrentGallery(updatedGallery);
        setSelectedFrame(nextFrame);
        setGalleries(prev => prev.map(gallery => gallery.id === currentGallery.id ? updatedGallery : gallery));
        await updateGallery(currentGallery.id, { paintings: nextPaintings });
    };

    const handleDistributeFrames = async () => {
        if (!currentGallery) return;
        const currentPaintings = normalizePaintings(currentGallery.paintings);
        const nextPaintings = currentPaintings.map((frame, index) => {
            const [x, y, z] = getBalancedFramePosition(index, currentPaintings.length);
            return {
                ...frame,
                position: index,
                yaw: degToRad(getYawForWallPoint(x, z)),
                pitch: 0,
                x,
                y,
                z
            };
        });
        const updatedGallery = { ...currentGallery, paintings: nextPaintings, updatedAt: Date.now() };
        const nextSelectedFrame = selectedFrame ? nextPaintings.find(frame => frame.id === selectedFrame.id) || nextPaintings[0] : nextPaintings[0];
        setCurrentGallery(updatedGallery);
        setSelectedFrame(nextSelectedFrame || null);
        setGalleries(prev => prev.map(gallery => gallery.id === currentGallery.id ? updatedGallery : gallery));
        await updateGallery(currentGallery.id, { paintings: nextPaintings });
    };

    const handleDeleteSelectedFrame = async () => {
        if (!currentGallery || !selectedFrame) return;
        const paintings = normalizePaintings(currentGallery.paintings);
        if (paintings.length <= 1) return;
        if (hasFrameContent(selectedFrame) && !confirm('Xóa vị trí khung này và nội dung bên trong?')) return;

        const nextPaintings = paintings.filter(frame => frame.id !== selectedFrame.id);
        const updatedGallery = { ...currentGallery, paintings: nextPaintings, updatedAt: Date.now() };
        setCurrentGallery(updatedGallery);
        setSelectedFrame(nextPaintings[0] || null);
        setGalleries(prev => prev.map(gallery => gallery.id === currentGallery.id ? updatedGallery : gallery));
        await updateGallery(currentGallery.id, { paintings: nextPaintings });
    };

    const renderDashboard = () => (
        <div className="min-h-screen bg-[#fff8ec] text-slate-800">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <aside className="w-full border-b-4 border-orange-100 bg-white px-4 py-5 shadow-lg lg:w-72 lg:border-b-0 lg:border-r-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200"
                    >
                            <ArrowLeft size={17} /> Quay lại
                    </button>
                    <div className="mb-7 rounded-3xl bg-gradient-to-br from-sky-400 via-pink-400 to-orange-300 p-5 text-white shadow-xl">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25">
                            <Palette size={30} />
                        </div>
                        <h1 className="text-2xl font-black leading-tight">Phòng tranh 3D</h1>
                        <p className="mt-2 text-sm font-bold text-white/90">Tạo không gian triển lãm màu sắc cho học sinh</p>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
                            Chia sẻ cộng đồng, không sử dụng cho mục đích thương mại
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (!userEmail) onRequireLogin?.();
                                else setShowCreateModal(true);
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3 font-black text-white shadow-lg shadow-pink-200 transition hover:-translate-y-0.5"
                        >
                            <Plus size={20} /> Tạo phòng mới
                        </button>
                    </div>
                </aside>

                <main className="flex-1 px-4 py-6 md:px-8">
                    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase text-fuchsia-600 shadow-sm">
                                <Sparkles size={15} /> Thư viện của tôi
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">Quản lý phòng trưng bày</h2>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-white">
                            <Loader2 className="animate-spin text-sky-500" size={42} />
                        </div>
                    ) : galleries.length === 0 ? (
                        <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] border-4 border-dashed border-orange-200 bg-white px-5 text-center shadow-sm">
                            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-yellow-200 to-pink-200 text-orange-600 shadow-inner">
                                <Palette size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Chưa có phòng nào</h3>
                            <p className="mt-2 max-w-md text-sm font-semibold text-slate-500">Bắt đầu bằng một phòng màu sắc, sau đó gắn ảnh và video vào từng khung.</p>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 font-black text-white shadow-lg shadow-sky-200"
                            >
                                <Plus size={20} /> Tạo phòng đầu tiên
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {galleries.map(gallery => {
                                const template = getTemplate(gallery.template);
                                const filledCount = getFilledCount(gallery);
                                return (
                                    <motion.article
                                        key={gallery.id}
                                        layout
                                        className="overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-xl shadow-orange-100"
                                    >
                                        <div className={`bg-gradient-to-br ${template.color} p-5 text-white`}>
                                            <div className="mb-5 flex items-start justify-between gap-4">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25">
                                                    {template.icon}
                                                </div>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-800">{filledCount}/{normalizePaintings(gallery.paintings).length} khung</span>
                                            </div>
                                            <h3 className="line-clamp-2 min-h-[56px] text-2xl font-black leading-tight">{gallery.title}</h3>
                                            <p className="mt-1 text-sm font-bold text-white/85">{template.label}</p>
                                        </div>
                                        <div className="space-y-3 p-4">
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                                                Cập nhật: {new Date(gallery.updatedAt || gallery.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={() => handleOpenViewer(gallery)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 py-3 text-sm font-black text-white">
                                                    <Eye size={16} /> Xem
                                                </button>
                                                <button type="button" onClick={() => handleOpenEditor(gallery)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-3 py-3 text-sm font-black text-slate-900">
                                                    <Edit3 size={16} /> Sửa
                                                </button>
                                                <button type="button" onClick={() => handleCopyShare(gallery.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 py-3 text-sm font-black text-white">
                                                    {copiedGalleryId === gallery.id ? <Check size={16} /> : <Copy size={16} />} Link
                                                </button>
                                                <button type="button" onClick={() => handleDeleteGallery(gallery.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-100 px-3 py-3 text-sm font-black text-rose-600">
                                                    <Trash2 size={16} /> Xóa
                                                </button>
                                            </div>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );

    const renderRoom = (readOnly: boolean) => {
        if (!currentGallery) return null;
        const paintings = normalizePaintings(currentGallery.paintings);
        const template = getTemplate(currentGallery.template);
        const filledCount = getFilledCount(currentGallery);

        return (
            <div ref={containerRef} className="h-[100dvh] overflow-hidden bg-slate-950 text-white">
                <div className="flex h-full flex-col">
                    <header className="z-20 flex min-h-14 items-center justify-between gap-2 border-b border-white/10 bg-slate-950/95 px-2 py-2 md:h-16 md:px-5 md:py-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (readOnly && getSharedGalleryId() && !userEmail) onBack?.();
                                else {
                                    setMode('dashboard');
                                    setCurrentGallery(null);
                                    setSelectedFrame(null);
                                    loadUserGalleries();
                                }
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-xs font-black text-white hover:bg-white/15 md:gap-2 md:rounded-2xl md:px-3 md:text-sm"
                        >
                            <ArrowLeft size={17} /> <span className="hidden sm:inline">{readOnly ? 'Thoát' : 'Lưu & quay lại'}</span><span className="sm:hidden">{readOnly ? 'Thoát' : 'Lưu'}</span>
                        </button>
                        <div className="min-w-0 flex-1 text-center">
                            <h2 className="truncate text-sm font-black md:text-xl">{currentGallery.title}</h2>
                            {!readOnly && <p className="hidden text-xs font-bold text-white/55 md:block">{filledCount}/{paintings.length} khung đã có nội dung</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                                <button type="button" onClick={handleFullscreen} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15 md:h-10 md:w-10 md:rounded-2xl" title="Toàn màn hình">
                                <Fullscreen size={18} />
                            </button>
                            {!readOnly && (
                                <button type="button" onClick={() => handleCopyShare(currentGallery.id)} className="hidden items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white md:inline-flex">
                                    {copiedGalleryId === currentGallery.id ? <Check size={16} /> : <Copy size={16} />} Chia sẻ
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="flex min-h-0 flex-1">
                        <section className="relative min-w-0 flex-1">
                            <div className="absolute left-3 top-3 z-10 rounded-2xl bg-white/90 px-3 py-2 text-slate-900 shadow-lg md:left-4 md:top-4 md:px-4 md:py-3">
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${template.color} text-white md:h-8 md:w-8`}>{template.icon}</span>
                                    {template.label}
                                </div>
                            </div>
                            <GalleryCanvas
                                gallery={currentGallery}
                                selectedFrameId={selectedFrame?.id}
                                readOnly={readOnly}
                                onSelectFrame={(frame) => {
                                    if (readOnly) {
                                        if (!openFrameVideoInTab(frame)) setPreviewFrame(frame);
                                    } else {
                                        setSelectedFrame(frame);
                                    }
                                }}
                                onMoveFrame={(frame) => {
                                    if (!readOnly) void applyFrameUpdate(frame);
                                }}
                            />
                            {!readOnly && (
                                <div className="absolute inset-x-2 bottom-2 z-20 rounded-3xl border border-white/10 bg-slate-950/88 p-3 shadow-2xl backdrop-blur-md lg:hidden">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-black">Danh sách khung</div>
                                            <div className="text-xs font-bold text-white/55">{filledCount}/{paintings.length} khung đã có nội dung</div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button type="button" onClick={handleDistributeFrames} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-950/20" title="Sắp xếp đều">
                                                <Sparkles size={18} />
                                            </button>
                                            <button type="button" onClick={handleAddFrame} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/20" title="Thêm khung">
                                                <Plus size={18} />
                                            </button>
                                            <button type="button" onClick={() => handleCopyShare(currentGallery.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-950/20" title="Chia sẻ">
                                                {copiedGalleryId === currentGallery.id ? <Check size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {paintings.map((frame, index) => {
                                            const hasContent = hasFrameContent(frame);
                                            return (
                                                <button
                                                    key={frame.id}
                                                    type="button"
                                                    onClick={() => setSelectedFrame(frame)}
                                                    className={`flex h-12 min-w-[3rem] flex-col items-center justify-center rounded-2xl border text-xs font-black ${selectedFrame?.id === frame.id ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-white/10 bg-white/10 text-white'}`}
                                                    title={frame.title || frame.label}
                                                >
                                                    <span>{index + 1}</span>
                                                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${hasContent ? 'bg-emerald-300' : 'bg-white/35'}`} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        {!readOnly && (
                            <aside className="hidden w-80 flex-col border-l border-white/10 bg-slate-900 p-4 lg:flex">
                                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <h3 className="text-lg font-black">Danh sách khung</h3>
                                        <button type="button" onClick={handleAddFrame} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white hover:bg-emerald-400">
                                            <Plus size={15} /> Thêm
                                        </button>
                                    </div>
                                    <button type="button" onClick={handleDistributeFrames} className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500/20 px-3 py-2 text-xs font-black text-violet-100 hover:bg-violet-500/30">
                                        <Sparkles size={15} /> Sắp xếp đều các mặt tường
                                    </button>
                                    {selectedFrame && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                <span />
                                                <button type="button" onClick={() => handleMoveSelectedFrame('up')} className="rounded-xl bg-white/10 px-2 py-2 text-xs font-black text-white hover:bg-white/15">Lên</button>
                                                <span />
                                                <button type="button" onClick={() => handleMoveSelectedFrame('left')} className="rounded-xl bg-white/10 px-2 py-2 text-xs font-black text-white hover:bg-white/15">Trái</button>
                                                <button type="button" onClick={() => handleMoveSelectedFrame('down')} className="rounded-xl bg-white/10 px-2 py-2 text-xs font-black text-white hover:bg-white/15">Xuống</button>
                                                <button type="button" onClick={() => handleMoveSelectedFrame('right')} className="rounded-xl bg-white/10 px-2 py-2 text-xs font-black text-white hover:bg-white/15">Phải</button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={() => handleSetSelectedFrameWall('front')} className="rounded-xl bg-sky-500/20 px-2 py-2 text-xs font-black text-sky-100 hover:bg-sky-500/30">Tường trước</button>
                                                <button type="button" onClick={() => handleSetSelectedFrameWall('back')} className="rounded-xl bg-sky-500/20 px-2 py-2 text-xs font-black text-sky-100 hover:bg-sky-500/30">Tường sau</button>
                                                <button type="button" onClick={() => handleSetSelectedFrameWall('left')} className="rounded-xl bg-sky-500/20 px-2 py-2 text-xs font-black text-sky-100 hover:bg-sky-500/30">Tường trái</button>
                                                <button type="button" onClick={() => handleSetSelectedFrameWall('right')} className="rounded-xl bg-sky-500/20 px-2 py-2 text-xs font-black text-sky-100 hover:bg-sky-500/30">Tường phải</button>
                                            </div>
                                            <button type="button" onClick={handleDeleteSelectedFrame} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-black text-rose-200 hover:bg-rose-500/25">
                                                <Trash2 size={15} /> Xóa vị trí khung
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                    {paintings.map((frame, index) => {
                                        const hasContent = Boolean(frame.imageUrl || frame.youtubeUrl || frame.title || frame.description);
                                        return (
                                            <button
                                                key={frame.id}
                                                type="button"
                                                onClick={() => setSelectedFrame(frame)}
                                                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${selectedFrame?.id === frame.id ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
                                            >
                                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 font-black">{index + 1}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-black">{frame.title || frame.label}</span>
                                                    <span className="text-xs font-bold opacity-70">{hasContent ? 'Đã thêm nội dung' : 'Đang trống'}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {mode === 'dashboard' && renderDashboard()}
            {mode === 'editor' && renderRoom(false)}
            {mode === 'viewer' && renderRoom(true)}

            <AnimatePresence>
                {showCreateModal && (
                    <CreateRoomModal
                        title={newTitle}
                        template={newTemplate}
                        isSaving={isSaving}
                        onTitleChange={setNewTitle}
                        onTemplateChange={setNewTemplate}
                        onClose={() => setShowCreateModal(false)}
                        onCreate={handleCreateGallery}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedFrame && mode === 'editor' && currentGallery && (
                    <FrameEditorModal
                        key={selectedFrame.id}
                        frame={selectedFrame}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                        saveProgress={saveProgress}
                        onClose={() => setSelectedFrame(null)}
                        onSave={handleSaveFrame}
                        onUploadFile={handleUploadFrameFile}
                        onClear={handleClearFrame}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewFrame && (
                    <FramePreviewModal frame={previewFrame} onClose={() => setPreviewFrame(null)} />
                )}
            </AnimatePresence>
        </>
    );
}

function CreateRoomModal({
    title,
    template,
    isSaving,
    onTitleChange,
    onTemplateChange,
    onClose,
    onCreate
}: {
    title: string;
    template: GalleryTemplate;
    isSaving: boolean;
    onTitleChange: (value: string) => void;
    onTemplateChange: (value: GalleryTemplate) => void;
    onClose: () => void;
    onCreate: () => void;
}) {
    return (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl" initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }}>
                <div className="flex items-center justify-between bg-gradient-to-r from-sky-400 via-fuchsia-400 to-orange-300 px-6 py-5 text-white">
                    <h2 className="text-2xl font-black">Tạo phòng mới</h2>
                    <button type="button" onClick={onClose} className="rounded-2xl bg-white/20 p-2 hover:bg-white/30"><X size={22} /></button>
                </div>
                <div className="space-y-5 p-6">
                    <label className="block">
                        <span className="mb-2 block text-sm font-black text-slate-700">Tên phòng</span>
                        <input
                            value={title}
                            onChange={event => onTitleChange(event.target.value.slice(0, 60))}
                            placeholder="Ví dụ: Sản phẩm Mĩ thuật lớp 2A"
                            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-bold outline-none focus:border-sky-400"
                        />
                    </label>
                    <div>
                        <span className="mb-3 block text-sm font-black text-slate-700">Loại phòng</span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {ROOM_TEMPLATES.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onTemplateChange(item.id)}
                                    className={`rounded-3xl border-4 p-4 text-left transition ${template === item.id ? 'border-sky-400 bg-sky-50' : 'border-slate-100 bg-slate-50 hover:border-orange-200'}`}
                                >
                                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white`}>
                                        {item.icon}
                                    </div>
                                    <div className="font-black text-slate-900">{item.label}</div>
                                    <div className="text-sm font-semibold text-slate-500">{item.subtitle}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-600">Hủy</button>
                        <button type="button" onClick={onCreate} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-orange-400 px-6 py-3 font-black text-white disabled:opacity-60">
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Tạo phòng
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function FrameEditorModal({
    frame,
    isSaving,
    saveStatus,
    saveProgress,
    onClose,
    onSave,
    onUploadFile,
    onClear
}: {
    frame: GalleryPainting;
    isSaving: boolean;
    saveStatus: string;
    saveProgress: number;
    onClose: () => void;
    onSave: (updates: Partial<GalleryPainting>, file?: File | null) => Promise<void> | void;
    onUploadFile: (file: File) => Promise<string | null>;
    onClear: () => void;
}) {
    const [title, setTitle] = useState(frame.title || '');
    const [imageUrl, setImageUrl] = useState(frame.imageUrl || '');
    const [youtubeUrl, setYoutubeUrl] = useState(frame.youtubeUrl || '');
    const [description, setDescription] = useState(frame.description || '');
    const [fileName, setFileName] = useState('');
    const [localPreviewUrl, setLocalPreviewUrl] = useState('');

    useEffect(() => () => {
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    }, [localPreviewUrl]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        setFileName(selectedFile.name);
        setImageUrl('');
        setLocalPreviewUrl(prevUrl => {
            if (prevUrl) URL.revokeObjectURL(prevUrl);
            return URL.createObjectURL(selectedFile);
        });

        const uploadedUrl = await onUploadFile(selectedFile);
        if (uploadedUrl) {
            setImageUrl(uploadedUrl);
            setLocalPreviewUrl('');
            await onSave({ title, imageUrl: uploadedUrl, youtubeUrl, description }, null);
        }
    };

    return (
        <motion.div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="max-h-[96dvh] w-full max-w-xl overflow-hidden rounded-[24px] bg-white text-slate-900 shadow-2xl sm:rounded-[28px]" initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }}>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                    <h2 className="truncate pr-3 text-lg font-black sm:text-xl">Chỉnh sửa {frame.label}</h2>
                    <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 p-2 hover:bg-slate-200"><X size={20} /></button>
                </div>
                <div className="max-h-[calc(96dvh-148px)] space-y-4 overflow-y-auto p-4 sm:p-5">
                    {(imageUrl || localPreviewUrl) && (
                        <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-3">
                            <div className="mb-2 text-center text-xs font-black text-emerald-600">
                                {imageUrl ? 'Ảnh đã lưu vào khung, gửi link sẽ thấy ảnh' : 'Đang xem trước ảnh'}
                            </div>
                            <img src={imageUrl || localPreviewUrl} alt="Ảnh xem trước" className="mx-auto max-h-36 rounded-xl object-contain shadow-md sm:max-h-44" />
                        </div>
                    )}
                    <label className="block">
                        <span className="mb-2 block text-sm font-black">Tiêu đề</span>
                        <input value={title} onChange={event => setTitle(event.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" placeholder="Tên tranh hoặc sản phẩm" />
                    </label>
                    <label className="block rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-4">
                        <span className="mb-3 flex items-center gap-2 text-sm font-black text-sky-800"><Upload size={17} /> Chọn ảnh từ máy tính</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm font-bold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:font-black file:text-white" />
                        {fileName && <p className="mt-2 text-xs font-bold text-sky-700">{fileName}</p>}
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-black">Link ảnh</span>
                        <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" placeholder="https://..." />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-black">Link YouTube</span>
                        <input value={youtubeUrl} onChange={event => setYoutubeUrl(event.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" placeholder="https://www.youtube.com/watch?v=..." />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-black">Mô tả</span>
                        <textarea value={description} onChange={event => setDescription(event.target.value)} rows={4} className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" placeholder="Nội dung ngắn gọn khi học sinh bấm vào tranh" />
                    </label>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
                    {isSaving && (
                        <div className="mb-1 w-full rounded-2xl bg-sky-50 px-4 py-3">
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-sky-800">
                                <span>{saveStatus || 'Đang lưu...'}</span>
                                {saveProgress > 0 && <span>{saveProgress}%</span>}
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-300"
                                    style={{ width: `${saveProgress > 0 ? saveProgress : 35}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <button type="button" onClick={onClear} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-100 px-3 py-3 text-sm font-black text-rose-600 sm:flex-none sm:px-4 sm:text-base"><Trash2 size={17} /> Xóa khung</button>
                    <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-600 sm:flex-none sm:px-4 sm:text-base">Đóng</button>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => onSave({ title, imageUrl, youtubeUrl, description }, null)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-3 text-sm font-black text-white disabled:opacity-60 sm:flex-none sm:px-5 sm:text-base"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} {isSaving ? 'Đang lưu' : 'Lưu lại'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function FramePreviewModal({ frame, onClose }: { frame: GalleryPainting; onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const safeYoutubeUrl = getSafeExternalUrl(frame.youtubeUrl);

    return (
        <motion.div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={`relative w-full overflow-hidden rounded-[24px] border-4 border-white bg-[#fff8ec] text-slate-900 shadow-2xl sm:rounded-[34px] ${isExpanded ? 'h-[94dvh] max-h-[94dvh] max-w-[98vw] sm:h-[92vh] sm:max-h-[92vh] sm:max-w-[96vw]' : 'max-h-[88dvh] max-w-4xl'}`}
                initial={{ scale: 0.94, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 18 }}
                onClick={event => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute -left-8 top-24 hidden h-20 w-20 rounded-full bg-sky-300/35 sm:block" />
                <div className="pointer-events-none absolute -right-7 bottom-16 hidden h-24 w-24 rounded-full bg-pink-300/35 sm:block" />
                <div className="flex items-center justify-between bg-gradient-to-r from-sky-400 via-fuchsia-400 to-orange-300 px-4 py-3 text-white sm:px-6 sm:py-5">
                    <div className="min-w-0">
                        <div className="mb-1 hidden rounded-full bg-white/25 px-3 py-1 text-xs font-black sm:inline-flex">Tác phẩm của em</div>
                        <h2 className="truncate text-xl font-black leading-tight sm:text-2xl">{frame.title || frame.label}</h2>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(value => !value)}
                            className="rounded-xl bg-white/25 p-1.5 text-white hover:bg-white/35 sm:rounded-2xl sm:p-2"
                            title={isExpanded ? 'Thu nhỏ khung' : 'Phóng to khung'}
                        >
                            <Fullscreen size={20} />
                        </button>
                        <button type="button" onClick={onClose} className="rounded-xl bg-white/25 p-1.5 text-white hover:bg-white/35 sm:rounded-2xl sm:p-2"><X size={20} /></button>
                    </div>
                </div>
                <div className={`grid gap-3 overflow-y-auto p-3 sm:gap-5 sm:p-5 md:grid-cols-[1.2fr_0.8fr] ${isExpanded ? 'h-[calc(94dvh-76px)] sm:h-[calc(92vh-112px)]' : 'max-h-[calc(88dvh-64px)]'}`}>
                    <div className="relative flex min-h-0 items-center justify-center rounded-[22px] bg-white p-2 shadow-inner sm:min-h-[320px] sm:rounded-[28px] sm:p-4">
                        <span className="absolute left-5 top-5 hidden h-4 w-4 rounded-full bg-pink-400 sm:block" />
                        <span className="absolute right-5 top-5 hidden h-4 w-4 rounded-full bg-yellow-300 sm:block" />
                        <span className="absolute bottom-5 left-5 hidden h-4 w-4 rounded-full bg-sky-400 sm:block" />
                        <span className="absolute bottom-5 right-5 hidden h-4 w-4 rounded-full bg-emerald-400 sm:block" />
                        {frame.imageUrl ? (
                            <div className="relative rounded-[18px] border-4 border-[#fff1c7] bg-white p-1.5 shadow-xl sm:rounded-[24px] sm:border-8 sm:p-2">
                                <img src={frame.imageUrl} alt={frame.title || frame.label} className={`w-full rounded-xl object-contain sm:rounded-2xl ${isExpanded ? 'max-h-[calc(94dvh-150px)] sm:max-h-[calc(92vh-190px)]' : 'max-h-[34dvh] sm:max-h-[62vh]'}`} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 rounded-3xl border-4 border-dashed border-sky-200 bg-sky-50 px-10 py-12 text-sky-400">
                                <ImageIcon size={54} />
                                <span className="font-black">Khung chưa có ảnh</span>
                            </div>
                        )}
                    </div>
                    <div className="flex min-h-0 flex-col gap-3 overflow-visible md:gap-4 md:overflow-y-auto">
                        <div className="max-h-[24dvh] overflow-y-auto rounded-[22px] bg-white p-4 shadow-lg sm:max-h-none sm:rounded-[26px] sm:p-5">
                            <div className="mb-2 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 sm:mb-3">Lời giới thiệu</div>
                            {frame.description ? (
                                <p className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-slate-700 sm:text-base">{frame.description}</p>
                            ) : (
                                <p className="text-sm font-bold leading-relaxed text-slate-400 sm:text-base">Chưa có mô tả cho tác phẩm này.</p>
                            )}
                        </div>
                        {safeYoutubeUrl && (
                            <a href={safeYoutubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-orange-400 px-5 py-4 font-black text-white shadow-lg">
                                Mở video YouTube
                            </a>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
