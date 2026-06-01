import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Download, Edit3, Link2, Loader2, QrCode, Save, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { User } from '../types';
import { createQrLink, deleteQrLink, QrLink, subscribeUserQrLinks, updateQrLink } from '../utils/firebaseQrLinks';

interface QrGeneratorProps {
    user: User;
    onBack: () => void;
}

type QrMode = 'static' | 'dynamic';

const templates = [
    { id: 'pastel', name: 'Kẹo ngọt', bg: '#fff1f2', fg: '#be185d', accent: '#f9a8d4' },
    { id: 'classroom', name: 'Lớp học', bg: '#ecfdf5', fg: '#047857', accent: '#6ee7b7' },
    { id: 'rainbow', name: 'Cầu vồng', bg: '#eff6ff', fg: '#2563eb', accent: '#a78bfa' },
    { id: 'minimal', name: 'Tối giản', bg: '#ffffff', fg: '#111827', accent: '#e5e7eb' },
    { id: 'festival', name: 'Lễ hội', bg: '#fff7ed', fg: '#c2410c', accent: '#fdba74' },
    { id: 'tech', name: 'Công nghệ', bg: '#eef2ff', fg: '#4338ca', accent: '#818cf8' },
];

type QrTemplate = typeof templates[number];

const qrFrames = [
    { id: 'none', name: 'Không khung', hint: 'Chỉ giữ mã QR' },
    { id: 'soft', name: 'Bo tròn kẹo', hint: 'Mềm, sạch, dễ in' },
    { id: 'stars', name: 'Sao vui', hint: 'Nổi bật cho lớp học' },
    { id: 'flowers', name: 'Hoa điểm 10', hint: 'Dễ thương, tiểu học' },
    { id: 'notebook', name: 'Vở ô ly', hint: 'Gọn như phiếu học tập' },
    { id: 'rainbow', name: 'Cầu vồng', hint: 'Nhiều màu, bắt mắt' },
    { id: 'cornerFlowers', name: 'Hoa bốn góc', hint: 'Giống tem trang trí' },
    { id: 'scallop', name: 'Viền ren', hint: 'Mềm và nổi bật' },
    { id: 'pencil', name: 'Bút chì', hint: 'Hợp phiếu học tập' },
    { id: 'balloons', name: 'Bóng bay', hint: 'Vui cho lớp nhỏ' },
    { id: 'badge', name: 'Huy hiệu', hint: 'Gọn, chuyên nghiệp' },
    { id: 'book', name: 'Trang vở', hint: 'Dành cho tài liệu' },
    { id: 'garland', name: 'Dây cờ', hint: 'Sinh động' },
    { id: 'sunshine', name: 'Nắng vui', hint: 'Tươi sáng' },
    { id: 'envelope', name: 'Phong bì hoa', hint: 'Giống mẫu thư mời' },
    { id: 'lantern', name: 'Lồng đèn', hint: 'Nổi bật, lễ hội' },
    { id: 'autumn', name: 'Lá mùa thu', hint: 'Tự nhiên, gọn đẹp' },
] as const;

type QrFrameId = typeof qrFrames[number]['id'];

type QrPresetGroup = 'ready' | 'frame' | 'shape' | 'school' | 'simple';

const qrPresets = [
    { id: 'none-clean', name: 'Không khung', templateId: 'minimal', frameId: 'none' as QrFrameId, group: 'simple' as QrPresetGroup },
    { id: 'envelope-blue', name: 'Phong bì hoa', templateId: 'rainbow', frameId: 'envelope' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'lantern-red', name: 'Lồng đèn', templateId: 'festival', frameId: 'lantern' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'autumn-leaf', name: 'Lá mùa thu', templateId: 'festival', frameId: 'autumn' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'flower-festival', name: 'Hoa cam', templateId: 'festival', frameId: 'cornerFlowers' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'aqua-scallop', name: 'Viền xanh', templateId: 'classroom', frameId: 'scallop' as QrFrameId, group: 'frame' as QrPresetGroup },
    { id: 'pencil-tech', name: 'Bút chì', templateId: 'tech', frameId: 'pencil' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'green-badge', name: 'Huy hiệu', templateId: 'classroom', frameId: 'badge' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'pastel-balloons', name: 'Bóng bay', templateId: 'pastel', frameId: 'balloons' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'book-rainbow', name: 'Trang vở', templateId: 'rainbow', frameId: 'book' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'festival-garland', name: 'Dây cờ', templateId: 'festival', frameId: 'garland' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'candy-soft', name: 'Kẹo hồng', templateId: 'pastel', frameId: 'soft' as QrFrameId, group: 'frame' as QrPresetGroup },
    { id: 'class-stars', name: 'Sao lớp học', templateId: 'classroom', frameId: 'sunshine' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'notebook-rainbow', name: 'Vở ô ly', templateId: 'rainbow', frameId: 'notebook' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'rainbow-tech', name: 'Cầu vồng', templateId: 'tech', frameId: 'rainbow' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'green-flower', name: 'Lá xanh', templateId: 'classroom', frameId: 'cornerFlowers' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'blue-soft', name: 'Xanh dịu', templateId: 'rainbow', frameId: 'soft' as QrFrameId, group: 'frame' as QrPresetGroup },
    { id: 'clean-stars', name: 'Sạch đẹp', templateId: 'minimal', frameId: 'stars' as QrFrameId, group: 'simple' as QrPresetGroup },
    { id: 'pink-stars', name: 'Sao hồng', templateId: 'pastel', frameId: 'stars' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'orange-soft', name: 'Cam vui', templateId: 'festival', frameId: 'scallop' as QrFrameId, group: 'frame' as QrPresetGroup },
    { id: 'green-notebook', name: 'Vở xanh', templateId: 'classroom', frameId: 'notebook' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'purple-flower', name: 'Hoa tím', templateId: 'tech', frameId: 'flowers' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'blue-rainbow', name: 'Xanh cầu vồng', templateId: 'rainbow', frameId: 'rainbow' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'black-soft', name: 'Đơn giản', templateId: 'minimal', frameId: 'badge' as QrFrameId, group: 'simple' as QrPresetGroup },
    { id: 'orange-stars', name: 'Sao cam', templateId: 'festival', frameId: 'sunshine' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'pink-flower', name: 'Hoa hồng', templateId: 'pastel', frameId: 'cornerFlowers' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'green-soft', name: 'Xanh non', templateId: 'classroom', frameId: 'balloons' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'purple-stars', name: 'Sao tím', templateId: 'tech', frameId: 'stars' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'blue-flower', name: 'Hoa xanh', templateId: 'rainbow', frameId: 'flowers' as QrFrameId, group: 'ready' as QrPresetGroup },
    { id: 'orange-rainbow', name: 'Cam cầu vồng', templateId: 'festival', frameId: 'rainbow' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'pink-notebook', name: 'Vở hồng', templateId: 'pastel', frameId: 'notebook' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'green-rainbow', name: 'Lớp học màu', templateId: 'classroom', frameId: 'rainbow' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'purple-soft', name: 'Tím dịu', templateId: 'tech', frameId: 'soft' as QrFrameId, group: 'frame' as QrPresetGroup },
    { id: 'blue-stars', name: 'Sao xanh', templateId: 'rainbow', frameId: 'stars' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'clean-notebook', name: 'Vở sạch', templateId: 'minimal', frameId: 'notebook' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'clean-rainbow', name: 'Viền màu', templateId: 'minimal', frameId: 'rainbow' as QrFrameId, group: 'frame' as QrPresetGroup },
    { id: 'orange-notebook', name: 'Vở cam', templateId: 'festival', frameId: 'notebook' as QrFrameId, group: 'school' as QrPresetGroup },
    { id: 'purple-rainbow', name: 'Tím cầu vồng', templateId: 'tech', frameId: 'rainbow' as QrFrameId, group: 'shape' as QrPresetGroup },
    { id: 'clean-flower', name: 'Hoa trắng', templateId: 'minimal', frameId: 'flowers' as QrFrameId, group: 'simple' as QrPresetGroup },
];

const qrDesignTabs: Array<{ id: QrPresetGroup | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'Sẵn Có', icon: '🧩' },
    { id: 'frame', label: 'Khung', icon: '🖼' },
    { id: 'shape', label: 'Hình dạng', icon: '▦' },
    { id: 'school', label: 'Tiểu học', icon: '✏️' },
    { id: 'simple', label: 'Gọn', icon: '×' },
];

const miniQrCells = Array.from({ length: 49 }, (_, index) => index);
const miniQrPattern = new Set([0, 1, 2, 6, 7, 9, 11, 13, 14, 16, 18, 19, 21, 23, 25, 27, 28, 30, 32, 35, 36, 38, 39, 41, 42, 46, 47, 48]);

const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, color: string) => {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outer : inner;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
};

const drawFlower = (ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, center: string) => {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18, 14, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = center;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawBalloon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(cx - 7, cy - 9, 5, 8, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 28);
    ctx.quadraticCurveTo(cx - 12, cy + 52, cx + 4, cy + 78);
    ctx.stroke();
    ctx.restore();
};

const drawPetalFlower = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, petal: string, core: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = petal;
    ctx.strokeStyle = core;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i);
        ctx.beginPath();
        ctx.ellipse(0, -27, 15, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawLantern = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, outline: string, fill: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = outline;
    ctx.fillStyle = fill;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.bezierCurveTo(72, -65, 70, 54, 0, 84);
    ctx.bezierCurveTo(-70, 54, -72, -65, 0, -88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.lineTo(0, 84);
    ctx.moveTo(-34, -74);
    ctx.quadraticCurveTo(-58, 0, -34, 72);
    ctx.moveTo(34, -74);
    ctx.quadraticCurveTo(58, 0, 34, 72);
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(-35, -96, 70, 26, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-27, 72, 54, 25, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 97);
    ctx.lineTo(0, 166);
    ctx.moveTo(-18, 166);
    ctx.lineTo(18, 166);
    ctx.moveTo(-14, 166);
    ctx.lineTo(-14, 206);
    ctx.moveTo(0, 166);
    ctx.lineTo(0, 213);
    ctx.moveTo(14, 166);
    ctx.lineTo(14, 206);
    ctx.stroke();
    ctx.restore();
};

const drawAutumnLeaf = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate(-0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -45);
    ctx.bezierCurveTo(42, -25, 44, 26, 0, 50);
    ctx.bezierCurveTo(-44, 26, -42, -25, 0, -45);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo(0, 58);
    ctx.moveTo(0, -4);
    ctx.lineTo(24, -20);
    ctx.moveTo(0, 12);
    ctx.lineTo(-25, -2);
    ctx.stroke();
    ctx.restore();
};

const drawEnvelopeOverlay = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = '#fee2df';
    ctx.strokeStyle = '#e8b8af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(235, 430, 430, 235);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(235, 430);
    ctx.lineTo(450, 558);
    ctx.lineTo(665, 430);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(235, 665);
    ctx.lineTo(400, 548);
    ctx.moveTo(665, 665);
    ctx.lineTo(500, 548);
    ctx.stroke();
    ctx.restore();
};

const drawPictorialQrCanvas = (
    ctx: CanvasRenderingContext2D,
    qrImage: HTMLImageElement,
    frameId: QrFrameId,
    template: QrTemplate
) => {
    if (frameId === 'envelope') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 900, 900);
        ctx.strokeStyle = template.fg;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.roundRect(292, 118, 316, 316, 24);
        ctx.stroke();
        ctx.drawImage(qrImage, 312, 138, 276, 276);

        [['#fca5a5', 232, 300, 0.75], ['#facc15', 656, 178, 0.55], ['#93c5fd', 250, 218, 0.55], ['#f97316', 650, 322, 0.55]].forEach(([color, x, y, scale]) => {
            drawPetalFlower(ctx, Number(x), Number(y), Number(scale), String(color), template.fg);
        });
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 5;
        [[250, 338, 250, 444], [650, 355, 650, 444], [220, 388, 220, 444], [680, 392, 680, 444]].forEach(([x1, y1, x2, y2]) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo((x1 + x2) / 2 + 18, (y1 + y2) / 2, x2, y2);
            ctx.stroke();
        });
        drawEnvelopeOverlay(ctx);
        return true;
    }

    if (frameId === 'lantern') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 900, 900);
        ctx.strokeStyle = '#f4d06f';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.roundRect(130, 130, 640, 640, 50);
        ctx.stroke();
        drawLantern(ctx, 122, 420, 0.78, '#dc2626', '#fde68a');
        drawLantern(ctx, 778, 500, 0.78, '#dc2626', '#fde68a');
        drawPetalFlower(ctx, 130, 205, 0.85, '#fde68a', '#dc2626');
        drawPetalFlower(ctx, 744, 292, 0.78, '#fde68a', '#dc2626');
        drawPetalFlower(ctx, 720, 610, 0.45, '#fde68a', '#dc2626');
        drawPetalFlower(ctx, 170, 140, 0.38, '#fde68a', '#dc2626');
        ctx.drawImage(qrImage, 230, 232, 440, 440);
        return true;
    }

    if (frameId === 'autumn') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 900, 900);
        ctx.strokeStyle = template.fg;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(255, 145);
        ctx.lineTo(190, 145);
        ctx.lineTo(190, 245);
        ctx.moveTo(645, 145);
        ctx.lineTo(710, 145);
        ctx.lineTo(710, 245);
        ctx.moveTo(255, 755);
        ctx.lineTo(190, 755);
        ctx.lineTo(190, 655);
        ctx.moveTo(645, 755);
        ctx.lineTo(710, 755);
        ctx.lineTo(710, 655);
        ctx.stroke();
        [[210, 130, 0.55, '#166534'], [720, 730, 0.55, '#166534'], [160, 560, 0.48, '#b45309'], [735, 240, 0.45, '#b45309'], [642, 134, 0.35, '#d97706'], [270, 760, 0.35, '#d97706']].forEach(([x, y, scale, color]) => {
            drawAutumnLeaf(ctx, Number(x), Number(y), Number(scale), String(color));
        });
        ctx.fillStyle = '#b45309';
        [[250, 120], [690, 210], [145, 515], [718, 675], [650, 125], [220, 760]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.ellipse(x, y, 16, 10, 0.4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.drawImage(qrImage, 240, 200, 420, 420);
        return true;
    }

    return false;
};

const drawFrameOnCanvas = (ctx: CanvasRenderingContext2D, frameId: QrFrameId, template: QrTemplate) => {
    if (frameId === 'none') return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (frameId === 'notebook') {
        ctx.strokeStyle = '#dbeafe';
        ctx.lineWidth = 3;
        for (let y = 140; y <= 760; y += 48) {
            ctx.beginPath();
            ctx.moveTo(122, y);
            ctx.lineTo(778, y);
            ctx.stroke();
        }
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(150, 118);
        ctx.lineTo(150, 782);
        ctx.stroke();
    }

    if (frameId === 'rainbow') {
        ['#22c55e', template.accent, template.fg, '#f59e0b'].forEach((color, index) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.roundRect(86 + index * 17, 86 + index * 17, 728 - index * 34, 728 - index * 34, 48 - index * 5);
            ctx.stroke();
        });
    } else {
        ctx.strokeStyle = template.accent;
        ctx.lineWidth = frameId === 'soft' ? 18 : 12;
        ctx.beginPath();
        ctx.roundRect(88, 88, 724, 724, 58);
        ctx.stroke();
    }

    if (frameId === 'soft') {
        ctx.fillStyle = template.fg;
        [[128, 128], [772, 128], [128, 772], [772, 772]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    if (frameId === 'stars') {
        [[145, 145], [755, 145], [145, 755], [755, 755], [450, 115], [450, 785], [115, 450], [785, 450]].forEach(([x, y], index) => {
            drawStar(ctx, x, y, index % 2 === 0 ? 22 : 17, index % 2 === 0 ? 9 : 7, index % 2 === 0 ? template.fg : template.accent);
        });
    }

    if (frameId === 'flowers') {
        [[145, 145], [755, 145], [145, 755], [755, 755]].forEach(([x, y], index) => {
            drawFlower(ctx, x, y, index % 2 === 0 ? template.accent : '#fdba74', template.fg);
        });
    }

    if (frameId === 'cornerFlowers') {
        [[122, 122], [778, 122], [122, 778], [778, 778]].forEach(([x, y], index) => {
            drawFlower(ctx, x, y, index % 2 === 0 ? template.accent : '#fca5a5', template.fg);
        });
        ctx.strokeStyle = template.fg;
        ctx.lineWidth = 5;
        [[185, 115, 715, 115], [185, 785, 715, 785], [115, 185, 115, 715], [785, 185, 785, 715]].forEach(([x1, y1, x2, y2]) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    }

    if (frameId === 'scallop') {
        ctx.fillStyle = template.accent;
        for (let x = 126; x <= 774; x += 42) {
            ctx.beginPath();
            ctx.arc(x, 95, 14, 0, Math.PI * 2);
            ctx.arc(x, 805, 14, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let y = 126; y <= 774; y += 42) {
            ctx.beginPath();
            ctx.arc(95, y, 14, 0, Math.PI * 2);
            ctx.arc(805, y, 14, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (frameId === 'pencil') {
        [[122, 175, -0.18], [778, 175, 0.18]].forEach(([x, y, rotation]) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-15, 0, 30, 185);
            ctx.fillStyle = template.fg;
            ctx.fillRect(-15, 0, 30, 24);
            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.moveTo(-15, 185);
            ctx.lineTo(15, 185);
            ctx.lineTo(0, 220);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(-6, 207);
            ctx.lineTo(6, 207);
            ctx.lineTo(0, 220);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    if (frameId === 'balloons') {
        drawBalloon(ctx, 140, 135, template.accent);
        drawBalloon(ctx, 188, 122, '#fdba74');
        drawBalloon(ctx, 760, 135, template.fg);
        drawBalloon(ctx, 712, 122, '#f9a8d4');
    }

    if (frameId === 'badge') {
        ctx.strokeStyle = template.fg;
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.roundRect(112, 112, 676, 676, 28);
        ctx.stroke();
        ctx.fillStyle = template.accent;
        [[112, 112], [788, 112], [112, 788], [788, 788]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.roundRect(x - 28, y - 28, 56, 56, 16);
            ctx.fill();
        });
    }

    if (frameId === 'book') {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i += 1) {
            ctx.beginPath();
            ctx.roundRect(116 + i * 14, 116 + i * 14, 668, 668, 22);
            ctx.stroke();
        }
        ctx.fillStyle = template.accent;
        ctx.fillRect(128, 128, 30, 644);
    }

    if (frameId === 'garland') {
        ctx.strokeStyle = template.fg;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(145, 128);
        ctx.quadraticCurveTo(450, 186, 755, 128);
        ctx.stroke();
        ['#22c55e', '#f59e0b', '#ec4899', template.fg].forEach((color, index) => {
            for (let x = 190 + index * 36; x < 735; x += 150) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(x, 145);
                ctx.lineTo(x + 28, 145);
                ctx.lineTo(x + 14, 182);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    if (frameId === 'sunshine') {
        [[142, 142], [758, 142], [142, 758], [758, 758]].forEach(([x, y]) => {
            drawStar(ctx, x, y, 34, 15, '#fbbf24');
        });
        ctx.strokeStyle = template.accent;
        ctx.lineWidth = 6;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 14) {
            const x1 = 450 + Math.cos(angle) * 342;
            const y1 = 450 + Math.sin(angle) * 342;
            const x2 = 450 + Math.cos(angle) * 366;
            const y2 = 450 + Math.sin(angle) * 366;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    ctx.restore();
};

const QrPresetPreview: React.FC<{ frameId: QrFrameId; template: QrTemplate }> = ({ frameId, template }) => (
    <div
        className="relative mx-auto flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-xl bg-white p-2"
        style={{
            border: frameId === 'none' ? '1px solid #d1d5db' : `3px solid ${frameId === 'rainbow' ? template.fg : template.accent}`,
            boxShadow: frameId === 'none' ? 'none' : 'inset 0 0 0 6px rgba(255,255,255,.72)',
        }}
    >
        {frameId === 'none' && (
            <>
                <span className="absolute left-3 top-1/2 h-0.5 w-12 -translate-y-1/2 rotate-45 rounded-full bg-slate-500" />
                <span className="absolute left-3 top-1/2 h-0.5 w-12 -translate-y-1/2 -rotate-45 rounded-full bg-slate-500" />
            </>
        )}
        {frameId === 'notebook' && (
            <>
                <span className="absolute left-4 top-0 h-full w-0.5 bg-rose-300" />
                {[25, 45, 65].map(item => <span key={item} className="absolute left-2 right-2 h-px bg-sky-200" style={{ top: `${item}%` }} />)}
            </>
        )}
        {frameId === 'rainbow' && <span className="absolute inset-1 rounded-xl border-2 border-emerald-400 shadow-[inset_0_0_0_2px_#f59e0b]" />}
        {frameId === 'scallop' && (
            <>
                {[10, 26, 42, 58].map(item => (
                    <span key={`top-${item}`} className="absolute top-0 h-3 w-3 rounded-full" style={{ left: item, background: template.accent }} />
                ))}
                {[10, 26, 42, 58].map(item => (
                    <span key={`bottom-${item}`} className="absolute bottom-0 h-3 w-3 rounded-full" style={{ left: item, background: template.accent }} />
                ))}
            </>
        )}
        {frameId === 'stars' && (
            <>
                <span className="absolute left-1 top-1 text-[14px]" style={{ color: template.fg }}>★</span>
                <span className="absolute bottom-1 right-1 text-[14px]" style={{ color: template.accent }}>★</span>
            </>
        )}
        {frameId === 'flowers' && (
            <>
                <span className="absolute left-1 top-1 h-3 w-3 rounded-full" style={{ background: template.accent }} />
                <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full" style={{ background: '#fdba74' }} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: template.fg }} />
                <span className="absolute bottom-2 left-2 h-2 w-2 rounded-full" style={{ background: template.fg }} />
            </>
        )}
        {frameId === 'cornerFlowers' && (
            <>
                <span className="absolute left-0 top-0 h-4 w-4 rounded-full" style={{ background: template.accent }} />
                <span className="absolute right-0 top-0 h-4 w-4 rounded-full" style={{ background: '#fdba74' }} />
                <span className="absolute bottom-0 left-0 h-4 w-4 rounded-full" style={{ background: '#fca5a5' }} />
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full" style={{ background: template.fg }} />
            </>
        )}
        {frameId === 'pencil' && (
            <>
                <span className="absolute left-2 top-2 h-10 w-2 rotate-12 rounded-sm bg-amber-400" />
                <span className="absolute right-2 top-2 h-10 w-2 -rotate-12 rounded-sm bg-amber-400" />
                <span className="absolute left-2 top-1 h-2 w-2 rotate-12 rounded-sm" style={{ background: template.fg }} />
                <span className="absolute right-2 top-1 h-2 w-2 -rotate-12 rounded-sm" style={{ background: template.fg }} />
            </>
        )}
        {frameId === 'balloons' && (
            <>
                <span className="absolute left-1 top-1 h-5 w-4 rounded-full" style={{ background: template.accent }} />
                <span className="absolute left-5 top-2 h-4 w-3 rounded-full bg-amber-300" />
                <span className="absolute right-1 top-1 h-5 w-4 rounded-full" style={{ background: template.fg }} />
            </>
        )}
        {frameId === 'badge' && (
            <>
                <span className="absolute left-1 top-1 h-3 w-3 rounded" style={{ background: template.accent }} />
                <span className="absolute right-1 top-1 h-3 w-3 rounded" style={{ background: template.accent }} />
                <span className="absolute bottom-1 left-1 h-3 w-3 rounded" style={{ background: template.accent }} />
                <span className="absolute bottom-1 right-1 h-3 w-3 rounded" style={{ background: template.accent }} />
            </>
        )}
        {frameId === 'book' && (
            <>
                <span className="absolute inset-2 rounded-lg border border-slate-300" />
                <span className="absolute inset-3 rounded-lg border border-slate-200" />
                <span className="absolute bottom-3 left-3 h-8 w-2 rounded bg-sky-300" />
            </>
        )}
        {frameId === 'garland' && (
            <>
                <span className="absolute left-3 top-2 h-3 w-3 rounded-b-sm bg-emerald-400" />
                <span className="absolute left-7 top-2 h-3 w-3 rounded-b-sm bg-amber-400" />
                <span className="absolute left-11 top-2 h-3 w-3 rounded-b-sm bg-pink-400" />
                <span className="absolute right-4 top-2 h-3 w-3 rounded-b-sm" style={{ background: template.fg }} />
            </>
        )}
        {frameId === 'sunshine' && (
            <>
                <span className="absolute left-1 top-1 text-[15px] text-amber-400">✦</span>
                <span className="absolute right-1 top-1 text-[15px] text-amber-400">✦</span>
                <span className="absolute bottom-1 left-1 text-[15px] text-amber-400">✦</span>
                <span className="absolute bottom-1 right-1 text-[15px] text-amber-400">✦</span>
            </>
        )}
        {frameId === 'envelope' && (
            <>
                <span className="absolute bottom-0 left-2 right-2 h-7 bg-rose-100" />
                <span className="absolute bottom-0 left-2 h-0 w-0 border-b-[28px] border-l-[28px] border-b-rose-200 border-l-transparent" />
                <span className="absolute bottom-0 right-2 h-0 w-0 border-b-[28px] border-r-[28px] border-b-rose-200 border-r-transparent" />
                <span className="absolute left-1 top-4 text-[13px] text-rose-500">✿</span>
                <span className="absolute right-1 top-3 text-[13px] text-amber-400">✿</span>
            </>
        )}
        {frameId === 'lantern' && (
            <>
                <span className="absolute left-1 top-4 h-8 w-4 rounded-full border-2 border-red-600 bg-yellow-200" />
                <span className="absolute right-1 top-5 h-8 w-4 rounded-full border-2 border-red-600 bg-yellow-200" />
                <span className="absolute left-0 top-1 text-[14px] text-red-600">✿</span>
                <span className="absolute right-0 top-1 text-[14px] text-red-600">✿</span>
            </>
        )}
        {frameId === 'autumn' && (
            <>
                <span className="absolute left-1 top-1 text-[16px] text-orange-700">♣</span>
                <span className="absolute right-1 bottom-1 text-[16px] text-green-700">♣</span>
                <span className="absolute right-1 top-3 h-2 w-3 rounded-full bg-amber-700" />
                <span className="absolute left-2 bottom-3 h-2 w-3 rounded-full bg-amber-700" />
            </>
        )}
        {frameId !== 'none' && (
            <div className="pointer-events-none absolute inset-x-4 bottom-1 h-2 rounded-full opacity-60" style={{ background: template.accent }} />
        )}
        <div className={`relative z-10 grid h-11 w-11 grid-cols-7 gap-[2px] rounded-md bg-white p-1 ${frameId === 'none' ? 'opacity-0' : ''} ${frameId === 'envelope' ? '-translate-y-2 scale-90' : ''}`}>
            {miniQrCells.map(item => (
                <span
                    key={item}
                    className="rounded-[1px]"
                    style={{ background: miniQrPattern.has(item) ? template.fg : template.bg }}
                />
            ))}
        </div>
    </div>
);

const QrGenerator: React.FC<QrGeneratorProps> = ({ user, onBack }) => {
    const [mode, setMode] = useState<QrMode>('static');
    const [title, setTitle] = useState('Mã QR của tôi');
    const [targetUrl, setTargetUrl] = useState('');
    const [templateId, setTemplateId] = useState('pastel');
    const [frameId, setFrameId] = useState<QrFrameId>('soft');
    const [activePresetGroup, setActivePresetGroup] = useState<QrPresetGroup | 'all'>('all');
    const [showAllPresets, setShowAllPresets] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [dynamicLinks, setDynamicLinks] = useState<QrLink[]>([]);
    const [selectedDynamicId, setSelectedDynamicId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const template = templates.find(item => item.id === templateId) || templates[0];
    const frame = qrFrames.find(item => item.id === frameId) || qrFrames[0];
    const filteredPresets = activePresetGroup === 'all' ? qrPresets : qrPresets.filter(item => item.group === activePresetGroup);
    const visiblePresets = showAllPresets ? filteredPresets : filteredPresets.slice(0, 24);
    const selectedDynamic = dynamicLinks.find(item => item.id === selectedDynamicId) || null;
    const qrValue = useMemo(() => {
        if (mode === 'dynamic' && selectedDynamic) {
            return `${window.location.origin}/?qr=${selectedDynamic.id}`;
        }
        return normalizeUrl(targetUrl);
    }, [mode, selectedDynamic, targetUrl]);

    useEffect(() => {
        const unsubscribe = subscribeUserQrLinks(user.email || '', setDynamicLinks);
        return () => unsubscribe();
    }, [user.email]);

    useEffect(() => {
        let cancelled = false;

        const renderQr = async () => {
            if (!qrValue) {
                setQrDataUrl('');
                return;
            }

            const dataUrl = await QRCode.toDataURL(qrValue, {
                width: 420,
                margin: 2,
                color: {
                    dark: template.fg,
                    light: template.bg,
                },
                errorCorrectionLevel: 'H',
            });
            if (!cancelled) setQrDataUrl(dataUrl);
        };

        renderQr().catch(() => setQrDataUrl(''));
        return () => { cancelled = true; };
    }, [qrValue, template.bg, template.fg]);

    const createDynamic = async () => {
        if (!targetUrl.trim()) {
            setMessage('Vui lòng nhập link cần tạo QR.');
            return;
        }

        setIsSaving(true);
        setMessage('');
        try {
            const created = await createQrLink({
                title,
                targetUrl,
                ownerEmail: user.email || '',
                ownerName: user.name || '',
            });
            setSelectedDynamicId(created.id);
            setMessage('Đã tạo QR động. Bạn có thể đổi link sau mà QR cũ vẫn giữ nguyên.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không tạo được QR động.');
        } finally {
            setIsSaving(false);
        }
    };

    const saveDynamic = async () => {
        if (!selectedDynamic) return;
        setIsSaving(true);
        try {
            await updateQrLink(selectedDynamic.id, { title, targetUrl });
            setMessage('Đã lưu thay đổi QR động.');
        } catch {
            setMessage('Không lưu được QR động.');
        } finally {
            setIsSaving(false);
        }
    };

    const selectDynamic = (item: QrLink) => {
        setMode('dynamic');
        setSelectedDynamicId(item.id);
        setTitle(item.title);
        setTargetUrl(item.targetUrl);
        setMessage('');
    };

    const removeDynamic = async (id: string) => {
        if (!confirm('Xóa QR động này? QR đã in ra sẽ không chuyển hướng được nữa.')) return;
        await deleteQrLink(id);
        if (selectedDynamicId === id) setSelectedDynamicId(null);
    };

    const copyQrLink = async () => {
        if (!qrValue) return;
        await navigator.clipboard.writeText(qrValue);
        setMessage('Đã sao chép link QR.');
    };

    const applyPreset = (preset: typeof qrPresets[number]) => {
        setTemplateId(preset.templateId);
        setFrameId(preset.frameId);
    };

    const downloadPng = async () => {
        if (!qrDataUrl) return;

        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = template.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const qrImage = new Image();
        qrImage.onload = () => {
            const drewPictorial = drawPictorialQrCanvas(ctx, qrImage, frameId, template);
            if (drewPictorial) {
                const link = document.createElement('a');
                link.download = `${(title || 'qr').replace(/[^\w-]+/g, '-').toLowerCase()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                return;
            }

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(62, 62, 776, 776, 64);
            ctx.fill();

            drawFrameOnCanvas(ctx, frameId, template);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(174, 174, 552, 552, 34);
            ctx.fill();
            ctx.drawImage(qrImage, 190, 190, 520, 520);

            const link = document.createElement('a');
            link.download = `${(title || 'qr').replace(/[^\w-]+/g, '-').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        qrImage.src = qrDataUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-pink-50 to-amber-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
                    <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700">
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black sm:text-2xl">Tạo mã QR</h1>
                        <p className="text-xs text-slate-500 sm:text-sm">Tạo QR tĩnh hoặc QR động có thể sửa link sau.</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_420px]">
                <section className="space-y-5">
                    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
                            {(['static', 'dynamic'] as QrMode[]).map(item => (
                                <button
                                    key={item}
                                    onClick={() => { setMode(item); setSelectedDynamicId(null); setMessage(''); }}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {item === 'static' ? 'QR tĩnh' : 'QR động'}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-bold text-slate-700">Tên lưu QR</span>
                                <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-slate-700">Link cần tạo QR</span>
                                <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                            </label>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="text-xl font-black text-slate-900">Mẫu Sẵn Có</h2>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{filteredPresets.length} mẫu</span>
                            </div>
                            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                                {qrDesignTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActivePresetGroup(tab.id);
                                            setShowAllPresets(false);
                                        }}
                                        className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-black transition ${activePresetGroup === tab.id ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-400' : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-300'}`}
                                    >
                                        <span className="text-2xl leading-none">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                                {visiblePresets.map(preset => {
                                    const presetTemplate = templates.find(item => item.id === preset.templateId) || templates[0];
                                    const active = templateId === preset.templateId && frameId === preset.frameId;
                                    return (
                                        <button
                                            key={preset.id}
                                            title={preset.name}
                                            aria-label={`Chọn mẫu ${preset.name}`}
                                            onClick={() => applyPreset(preset)}
                                            className={`flex aspect-square items-center justify-center rounded border bg-white p-2 transition hover:border-fuchsia-400 hover:shadow-sm ${active ? 'border-fuchsia-500 ring-1 ring-fuchsia-500' : 'border-slate-200'}`}
                                        >
                                            <QrPresetPreview frameId={preset.frameId} template={presetTemplate} />
                                        </button>
                                    );
                                })}
                            </div>
                            {filteredPresets.length > 24 && (
                                <div className="mt-5 text-center">
                                    <button
                                        onClick={() => setShowAllPresets(value => !value)}
                                        className="font-bold text-fuchsia-600 underline-offset-4 hover:underline"
                                    >
                                        {showAllPresets ? 'Thu gọn' : 'Xem Thêm'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {mode === 'dynamic' && !selectedDynamic && (
                                <button onClick={createDynamic} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                                    Tạo QR động
                                </button>
                            )}
                            {mode === 'dynamic' && selectedDynamic && (
                                <button onClick={saveDynamic} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Lưu thay đổi
                                </button>
                            )}
                            <button onClick={copyQrLink} disabled={!qrValue} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
                                <Copy size={18} /> Copy link QR
                            </button>
                            <button onClick={downloadPng} disabled={!qrDataUrl} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
                                <Download size={18} /> Tải PNG
                            </button>
                        </div>

                        {message && <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">{message}</p>}
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                        <h2 className="mb-3 font-black">QR động của tôi</h2>
                        {dynamicLinks.length === 0 ? (
                            <p className="text-sm text-slate-500">Bạn chưa có QR động nào.</p>
                        ) : (
                            <div className="grid gap-2">
                                {dynamicLinks.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3">
                                        <Link2 size={18} className="text-indigo-500" />
                                        <button onClick={() => selectDynamic(item)} className="min-w-0 flex-1 text-left">
                                            <div className="truncate font-bold">{item.title}</div>
                                            <div className="truncate text-xs text-slate-500">{item.targetUrl}</div>
                                        </button>
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{item.scans || 0} lượt</span>
                                        <button onClick={() => selectDynamic(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 size={16} /></button>
                                        <button onClick={() => removeDynamic(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-3xl p-5 shadow-xl ring-1 ring-black/5" style={{ background: `linear-gradient(135deg, ${template.bg}, #ffffff)` }}>
                        <div
                            className="relative mx-auto aspect-square w-full max-w-[370px] overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-lg"
                            aria-label={`Xem trước QR với khung ${frame.name}`}
                            style={{ border: frameId === 'none' ? '1px solid #e5e7eb' : `10px solid ${frameId === 'rainbow' ? template.fg : template.accent}` }}
                        >
                            {frameId === 'notebook' && (
                                <div className="pointer-events-none absolute inset-0 opacity-80">
                                    <span className="absolute left-12 top-0 h-full w-1 rounded-full bg-rose-300" />
                                    {[18, 30, 42, 54, 66, 78].map(item => (
                                        <span key={item} className="absolute left-6 right-6 h-px bg-sky-200" style={{ top: `${item}%` }} />
                                    ))}
                                </div>
                            )}
                            {frameId === 'rainbow' && (
                                <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border-[6px] border-emerald-400 shadow-[inset_0_0_0_6px_#f59e0b]" />
                            )}
                            {frameId === 'scallop' && (
                                <>
                                    {[9, 20, 31, 42, 53, 64, 75, 86].map(item => (
                                        <span key={`top-${item}`} className="pointer-events-none absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full" style={{ left: `${item}%`, background: template.accent }} />
                                    ))}
                                    {[9, 20, 31, 42, 53, 64, 75, 86].map(item => (
                                        <span key={`bottom-${item}`} className="pointer-events-none absolute bottom-0 h-5 w-5 -translate-x-1/2 rounded-full" style={{ left: `${item}%`, background: template.accent }} />
                                    ))}
                                </>
                            )}
                            {frameId === 'stars' && (
                                <>
                                    <span className="pointer-events-none absolute left-5 top-5 text-3xl" style={{ color: template.fg }}>★</span>
                                    <span className="pointer-events-none absolute right-6 top-8 text-2xl" style={{ color: template.accent }}>★</span>
                                    <span className="pointer-events-none absolute bottom-6 left-8 text-2xl" style={{ color: template.accent }}>★</span>
                                    <span className="pointer-events-none absolute bottom-5 right-5 text-3xl" style={{ color: template.fg }}>★</span>
                                </>
                            )}
                            {frameId === 'flowers' && (
                                <>
                                    <span className="pointer-events-none absolute left-4 top-4 text-3xl">🌸</span>
                                    <span className="pointer-events-none absolute right-4 top-5 text-3xl">🌼</span>
                                    <span className="pointer-events-none absolute bottom-4 left-5 text-3xl">🌼</span>
                                    <span className="pointer-events-none absolute bottom-4 right-4 text-3xl">🌸</span>
                                </>
                            )}
                            {frameId === 'cornerFlowers' && (
                                <>
                                    <span className="pointer-events-none absolute left-3 top-3 h-9 w-9 rounded-full" style={{ background: template.accent }} />
                                    <span className="pointer-events-none absolute right-3 top-3 h-9 w-9 rounded-full bg-amber-300" />
                                    <span className="pointer-events-none absolute bottom-3 left-3 h-9 w-9 rounded-full bg-rose-300" />
                                    <span className="pointer-events-none absolute bottom-3 right-3 h-9 w-9 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute left-14 right-14 top-8 h-1 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute bottom-8 left-14 right-14 h-1 rounded-full" style={{ background: template.fg }} />
                                </>
                            )}
                            {frameId === 'pencil' && (
                                <>
                                    <span className="pointer-events-none absolute left-8 top-12 h-28 w-5 rotate-12 rounded bg-amber-400" />
                                    <span className="pointer-events-none absolute left-8 top-10 h-6 w-5 rotate-12 rounded" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute right-8 top-12 h-28 w-5 -rotate-12 rounded bg-amber-400" />
                                    <span className="pointer-events-none absolute right-8 top-10 h-6 w-5 -rotate-12 rounded" style={{ background: template.fg }} />
                                </>
                            )}
                            {frameId === 'balloons' && (
                                <>
                                    <span className="pointer-events-none absolute left-6 top-5 h-11 w-9 rounded-full" style={{ background: template.accent }} />
                                    <span className="pointer-events-none absolute left-16 top-8 h-9 w-7 rounded-full bg-amber-300" />
                                    <span className="pointer-events-none absolute right-6 top-5 h-11 w-9 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute right-16 top-8 h-9 w-7 rounded-full bg-pink-300" />
                                </>
                            )}
                            {frameId === 'badge' && (
                                <>
                                    <span className="pointer-events-none absolute left-5 top-5 h-8 w-8 rounded-lg" style={{ background: template.accent }} />
                                    <span className="pointer-events-none absolute right-5 top-5 h-8 w-8 rounded-lg" style={{ background: template.accent }} />
                                    <span className="pointer-events-none absolute bottom-5 left-5 h-8 w-8 rounded-lg" style={{ background: template.accent }} />
                                    <span className="pointer-events-none absolute bottom-5 right-5 h-8 w-8 rounded-lg" style={{ background: template.accent }} />
                                </>
                            )}
                            {frameId === 'book' && (
                                <>
                                    <span className="pointer-events-none absolute inset-7 rounded-[1.5rem] border-2 border-slate-300" />
                                    <span className="pointer-events-none absolute inset-10 rounded-[1.25rem] border border-slate-200" />
                                    <span className="pointer-events-none absolute bottom-10 left-10 h-20 w-4 rounded bg-sky-300" />
                                </>
                            )}
                            {frameId === 'garland' && (
                                <>
                                    {[20, 30, 40, 50, 60, 70, 80].map((item, index) => (
                                        <span key={item} className="pointer-events-none absolute top-7 h-5 w-5 rounded-b-sm" style={{ left: `${item}%`, background: ['#22c55e', '#f59e0b', '#ec4899', template.fg][index % 4] }} />
                                    ))}
                                </>
                            )}
                            {frameId === 'sunshine' && (
                                <>
                                    <span className="pointer-events-none absolute left-5 top-5 text-4xl text-amber-400">✦</span>
                                    <span className="pointer-events-none absolute right-5 top-5 text-4xl text-amber-400">✦</span>
                                    <span className="pointer-events-none absolute bottom-5 left-5 text-4xl text-amber-400">✦</span>
                                    <span className="pointer-events-none absolute bottom-5 right-5 text-4xl text-amber-400">✦</span>
                                </>
                            )}
                            {frameId === 'envelope' && (
                                <>
                                    <span className="pointer-events-none absolute bottom-12 left-14 right-14 z-20 h-28 rounded-b-lg bg-rose-100 shadow-sm" />
                                    <span className="pointer-events-none absolute bottom-12 left-14 z-20 h-0 w-0 border-b-[112px] border-l-[145px] border-b-rose-200 border-l-transparent" />
                                    <span className="pointer-events-none absolute bottom-12 right-14 z-20 h-0 w-0 border-b-[112px] border-r-[145px] border-b-rose-200 border-r-transparent" />
                                    <span className="pointer-events-none absolute left-10 top-24 z-20 text-4xl text-rose-500">✿</span>
                                    <span className="pointer-events-none absolute right-10 top-20 z-20 text-4xl text-amber-400">✿</span>
                                    <span className="pointer-events-none absolute left-16 top-38 z-20 text-3xl text-sky-500">✿</span>
                                    <span className="pointer-events-none absolute right-16 top-40 z-20 text-3xl text-pink-500">✿</span>
                                </>
                            )}
                            {frameId === 'lantern' && (
                                <>
                                    <span className="pointer-events-none absolute left-7 top-24 z-20 h-28 w-16 rounded-full border-[5px] border-red-600 bg-yellow-200" />
                                    <span className="pointer-events-none absolute right-7 top-36 z-20 h-28 w-16 rounded-full border-[5px] border-red-600 bg-yellow-200" />
                                    <span className="pointer-events-none absolute left-4 top-14 z-20 text-5xl text-red-600">✿</span>
                                    <span className="pointer-events-none absolute right-3 top-20 z-20 text-5xl text-red-600">✿</span>
                                    <span className="pointer-events-none absolute inset-8 rounded-[1.5rem] border-[7px] border-yellow-300" />
                                </>
                            )}
                            {frameId === 'autumn' && (
                                <>
                                    <span className="pointer-events-none absolute left-8 top-8 z-20 text-5xl text-green-700">♣</span>
                                    <span className="pointer-events-none absolute right-8 bottom-8 z-20 text-5xl text-green-700">♣</span>
                                    <span className="pointer-events-none absolute right-8 top-12 z-20 text-4xl text-orange-700">♣</span>
                                    <span className="pointer-events-none absolute left-10 bottom-12 z-20 text-4xl text-orange-700">♣</span>
                                    <span className="pointer-events-none absolute right-16 top-20 z-20 h-4 w-7 rounded-full bg-amber-700" />
                                    <span className="pointer-events-none absolute left-16 bottom-24 z-20 h-4 w-7 rounded-full bg-amber-700" />
                                </>
                            )}
                            {frameId === 'soft' && (
                                <>
                                    <span className="pointer-events-none absolute left-7 top-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute right-7 top-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute bottom-7 left-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute bottom-7 right-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                </>
                            )}
                            <div className={`relative z-10 flex h-full items-center justify-center rounded-[1.5rem] bg-white p-3 shadow-inner ${frameId === 'envelope' ? '-translate-y-4 scale-[.72]' : ''} ${frameId === 'lantern' || frameId === 'autumn' ? 'scale-[.86]' : ''}`}>
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="QR preview" className="w-full rounded-2xl" />
                            ) : (
                                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400">
                                    Nhập link để xem QR
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default QrGenerator;
