// ===== 8 Template Definitions =====
const TEMPLATES = [
    {
        id: 1,
        name: "Xuân Hồng",
        desc: "Hoa mai vàng, khung cổ điển",
        colors: { primary: '#c0392b', secondary: '#e67e22', accent: '#f1c40f', bg: '#e8613a', text: '#5a1a0a', cardBg: '#fdf6ee' },
        thumbnail: '🌸'
    },
    {
        id: 2,
        name: "Bính Ngọ",
        desc: "Ngựa phi, phong cách thư pháp",
        colors: { primary: '#8b1a1a', secondary: '#c0392b', accent: '#d4a017', bg: '#a01010', text: '#3a0a0a', cardBg: '#fef9f0' },
        thumbnail: '🐎'
    },
    {
        id: 3,
        name: "Tân Xuân",
        desc: "Banner vàng, hoa mai, lì xì",
        colors: { primary: '#27ae60', secondary: '#c0392b', accent: '#f1c40f', bg: '#2d8a4e', text: '#1a3a1a', cardBg: '#fefdf5' },
        thumbnail: '🧧'
    },
    {
        id: 4,
        name: "Đèn Lồng",
        desc: "Đèn lồng đỏ, hoa đào hồng",
        colors: { primary: '#c0392b', secondary: '#e74c3c', accent: '#f39c12', bg: '#fdf5e6', text: '#5a1a0a', cardBg: '#fffef7' },
        thumbnail: '🏮'
    },
    {
        id: 5,
        name: "Sen Vàng",
        desc: "Hoa sen thanh tao, xanh vàng",
        colors: { primary: '#2980b9', secondary: '#1abc9c', accent: '#f1c40f', bg: '#1a5276', text: '#0a2a3a', cardBg: '#f0f8ff' },
        thumbnail: '🪷'
    },
    {
        id: 6,
        name: "Trúc Xanh",
        desc: "Trúc xanh, phong cách thủy mặc",
        colors: { primary: '#2c6e49', secondary: '#4a8c6f', accent: '#8fbc8f', bg: '#f5f0e8', text: '#1a3a1a', cardBg: '#fafaf5' },
        thumbnail: '🎋'
    },
    {
        id: 7,
        name: "Pháo Hoa",
        desc: "Pháo hoa rực rỡ, hiện đại",
        colors: { primary: '#6c3483', secondary: '#a569bd', accent: '#f1c40f', bg: '#1a0a2e', text: '#ffeedd', cardBg: '#1e0a35' },
        thumbnail: '🎆'
    },
    {
        id: 8,
        name: "Mùa Xuân",
        desc: "Gradient hồng, hoa đào watercolor",
        colors: { primary: '#e84393', secondary: '#fd79a8', accent: '#fdcb6e', bg: '#ffeef8', text: '#5a1a3a', cardBg: '#fff5f9' },
        thumbnail: '🌺'
    }
];

// ===== SVG Decoration Generators =====

function createCherryBlossom(cx, cy, size, color = '#f1c40f', opacity = 1) {
    let petals = '';
    for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const px = cx + Math.cos(angle) * size * 0.6;
        const py = cy + Math.sin(angle) * size * 0.6;
        petals += `<ellipse cx="${px}" cy="${py}" rx="${size * 0.45}" ry="${size * 0.25}" 
      transform="rotate(${i * 72}, ${px}, ${py})" fill="${color}" opacity="${opacity}"/>`;
    }
    petals += `<circle cx="${cx}" cy="${cy}" r="${size * 0.15}" fill="#e67e22" opacity="${opacity}"/>`;
    return petals;
}

function createPeachBlossom(cx, cy, size, color = '#ff69b4', opacity = 1) {
    let petals = '';
    for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const px = cx + Math.cos(angle) * size * 0.5;
        const py = cy + Math.sin(angle) * size * 0.5;
        petals += `<ellipse cx="${px}" cy="${py}" rx="${size * 0.4}" ry="${size * 0.28}" 
      transform="rotate(${i * 72}, ${px}, ${py})" fill="${color}" opacity="${opacity}"/>`;
    }
    petals += `<circle cx="${cx}" cy="${cy}" r="${size * 0.18}" fill="#ffb6c1" opacity="${opacity}"/>`;
    petals += `<circle cx="${cx}" cy="${cy}" r="${size * 0.08}" fill="#ff1493" opacity="${opacity}"/>`;
    return petals;
}

function createLantern(cx, cy, size, color = '#e74c3c') {
    return `
    <line x1="${cx}" y1="${cy - size}" x2="${cx}" y2="${cy - size * 0.5}" stroke="#d4a017" stroke-width="2"/>
    <rect x="${cx - size * 0.15}" y="${cy - size * 0.55}" width="${size * 0.3}" height="${size * 0.12}" rx="2" fill="#d4a017"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.35}" ry="${size * 0.5}" fill="${color}" opacity="0.9"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.25}" ry="${size * 0.45}" fill="${color}" opacity="0.5" stroke="#d4a017" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - size * 0.5}" x2="${cx}" y2="${cy + size * 0.5}" stroke="#d4a017" stroke-width="1.5" opacity="0.5"/>
    <rect x="${cx - size * 0.12}" y="${cy + size * 0.42}" width="${size * 0.24}" height="${size * 0.08}" rx="2" fill="#d4a017"/>
    <line x1="${cx}" y1="${cy + size * 0.5}" x2="${cx}" y2="${cy + size * 0.8}" stroke="#d4a017" stroke-width="1.5"/>
    <polygon points="${cx - size * 0.08},${cy + size * 0.75} ${cx},${cy + size * 0.95} ${cx + size * 0.08},${cy + size * 0.75}" fill="#d4a017"/>
  `;
}

function createCloud(cx, cy, size, color = '#d4a017', opacity = 0.6) {
    return `
    <g opacity="${opacity}">
      <circle cx="${cx}" cy="${cy}" r="${size * 0.4}" fill="${color}"/>
      <circle cx="${cx - size * 0.35}" cy="${cy + size * 0.1}" r="${size * 0.3}" fill="${color}"/>
      <circle cx="${cx + size * 0.35}" cy="${cy + size * 0.1}" r="${size * 0.3}" fill="${color}"/>
      <circle cx="${cx - size * 0.15}" cy="${cy - size * 0.2}" r="${size * 0.25}" fill="${color}"/>
      <circle cx="${cx + size * 0.15}" cy="${cy - size * 0.2}" r="${size * 0.25}" fill="${color}"/>
    </g>
  `;
}

function createBranch(x1, y1, x2, y2, color = '#5a3a1a') {
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 30;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
    return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

function createLotus(cx, cy, size, color = '#f8b4d9') {
    let petals = '';
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i * (360 / petalCount) - 90) * Math.PI / 180;
        const px = cx + Math.cos(angle) * size * 0.3;
        const py = cy + Math.sin(angle) * size * 0.3;
        const shade = i % 2 === 0 ? color : adjustColor(color, -20);
        petals += `<ellipse cx="${px}" cy="${py}" rx="${size * 0.2}" ry="${size * 0.45}" 
      transform="rotate(${i * (360 / petalCount)}, ${px}, ${py})" fill="${shade}" opacity="0.85"/>`;
    }
    petals += `<circle cx="${cx}" cy="${cy}" r="${size * 0.15}" fill="#f1c40f"/>`;
    return petals;
}

function createBamboo(x, yStart, yEnd, color = '#2c6e49') {
    let bamboo = '';
    const segmentH = 50;
    for (let y = yStart; y < yEnd; y += segmentH) {
        bamboo += `<rect x="${x - 4}" y="${y}" width="8" height="${segmentH - 5}" rx="3" fill="${color}" opacity="0.7"/>`;
        bamboo += `<ellipse cx="${x}" cy="${y + segmentH - 5}" rx="6" ry="3" fill="${adjustColor(color, -30)}" opacity="0.5"/>`;
    }
    // Add leaves
    for (let i = 0; i < 3; i++) {
        const ly = yStart + (yEnd - yStart) * (0.2 + i * 0.3);
        const dir = i % 2 === 0 ? 1 : -1;
        bamboo += `<path d="M${x},${ly} Q${x + dir * 25},${ly - 10} ${x + dir * 40},${ly - 5}" 
      stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>`;
        bamboo += `<ellipse cx="${x + dir * 30}" cy="${ly - 8}" rx="15" ry="5" 
      transform="rotate(${dir * -15}, ${x + dir * 30}, ${ly - 8})" fill="${color}" opacity="0.4"/>`;
    }
    return bamboo;
}

function createFirework(cx, cy, size, colors = ['#f1c40f', '#e74c3c', '#3498db', '#e67e22']) {
    let fw = '';
    const rays = 12;
    for (let i = 0; i < rays; i++) {
        const angle = (i * (360 / rays)) * Math.PI / 180;
        const len = size * (0.6 + Math.random() * 0.4);
        const ex = cx + Math.cos(angle) * len;
        const ey = cy + Math.sin(angle) * len;
        const color = colors[i % colors.length];
        fw += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="2" opacity="0.8"/>`;
        fw += `<circle cx="${ex}" cy="${ey}" r="${3 + Math.random() * 3}" fill="${color}" opacity="0.9"/>`;
    }
    fw += `<circle cx="${cx}" cy="${cy}" r="${size * 0.08}" fill="#fff" opacity="0.9"/>`;
    return fw;
}

function createSparkle(cx, cy, size, color = '#f1c40f') {
    return `
    <g>
      <line x1="${cx - size}" y1="${cy}" x2="${cx + size}" y2="${cy}" stroke="${color}" stroke-width="1.5" opacity="0.8"/>
      <line x1="${cx}" y1="${cy - size}" x2="${cx}" y2="${cy + size}" stroke="${color}" stroke-width="1.5" opacity="0.8"/>
      <line x1="${cx - size * 0.6}" y1="${cy - size * 0.6}" x2="${cx + size * 0.6}" y2="${cy + size * 0.6}" stroke="${color}" stroke-width="1" opacity="0.5"/>
      <line x1="${cx + size * 0.6}" y1="${cy - size * 0.6}" x2="${cx - size * 0.6}" y2="${cy + size * 0.6}" stroke="${color}" stroke-width="1" opacity="0.5"/>
    </g>
  `;
}

function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ===== Generate decorations for each template =====
function getTemplateDecorations(templateId, width, height) {
    let svg = '';

    switch (templateId) {
        case 1: // Xuân Hồng - Cherry blossoms
            // Corner branches with blossoms
            svg += createBranch(0, 0, 120, 80);
            svg += createBranch(0, 0, 80, 130);
            svg += createCherryBlossom(60, 40, 14);
            svg += createCherryBlossom(90, 65, 12);
            svg += createCherryBlossom(40, 75, 10);
            svg += createCherryBlossom(100, 35, 8, '#f39c12');
            svg += createCherryBlossom(25, 50, 9);

            // Bottom right branch
            svg += createBranch(width, height, width - 130, height - 90);
            svg += createBranch(width, height, width - 80, height - 140);
            svg += createCherryBlossom(width - 70, height - 50, 15);
            svg += createCherryBlossom(width - 100, height - 75, 12);
            svg += createCherryBlossom(width - 45, height - 85, 10);
            svg += createCherryBlossom(width - 110, height - 40, 9, '#f39c12');

            // Scattered small blossoms
            svg += createCherryBlossom(width - 30, 60, 8, '#f1c40f', 0.6);
            svg += createCherryBlossom(30, height - 50, 7, '#f39c12', 0.5);
            break;

        case 2: // Bính Ngọ - Horse
            // Horse silhouette (left side)
            svg += `<g transform="translate(30, 50) scale(0.8)" opacity="0.85">
        <path d="M40,120 C35,100 30,85 35,70 C38,60 45,55 48,45 C50,38 48,30 52,25 
        C55,20 60,22 62,18 C64,14 62,8 65,5 C68,2 72,5 74,8 C76,12 75,18 78,22 
        C82,28 88,30 90,35 C92,40 88,48 92,55 C96,62 105,65 110,72 
        C115,78 118,85 120,95 C122,105 118,115 115,120 
        C112,125 108,128 105,120 C103,115 104,108 102,105 
        C100,102 95,100 92,102 C88,105 86,110 84,115 
        C82,120 80,125 76,122 C72,118 74,110 72,105 
        C70,100 65,98 62,100 C58,103 56,108 54,115 
        C52,120 50,128 45,125 C42,122 42,118 40,120Z" 
        fill="#8b1a1a" opacity="0.7"/>
      </g>`;
            // Golden clouds
            svg += createCloud(width - 80, height - 60, 40, '#d4a017', 0.7);
            svg += createCloud(width - 40, height - 90, 30, '#d4a017', 0.5);
            svg += createCloud(60, height - 40, 25, '#d4a017', 0.4);
            break;

        case 3: // Tân Xuân - Lucky envelopes, tangerines
            // Cherry blossoms top right
            svg += createBranch(width, 0, width - 100, 70);
            svg += createCherryBlossom(width - 50, 30, 12, '#f1c40f');
            svg += createCherryBlossom(width - 80, 55, 10, '#f39c12');
            svg += createCherryBlossom(width - 30, 60, 8, '#f1c40f');

            // Lucky envelopes bottom left
            svg += `<g transform="translate(20, ${height - 100})" opacity="0.8">
        <rect x="0" y="0" width="45" height="55" rx="4" fill="#e74c3c" transform="rotate(-10, 22, 27)"/>
        <rect x="5" y="5" width="35" height="20" rx="3" fill="#c0392b" transform="rotate(-10, 22, 15)"/>
        <circle cx="22" cy="30" r="8" fill="#f1c40f" transform="rotate(-10, 22, 30)"/>
      </g>`;
            svg += `<g transform="translate(45, ${height - 85})" opacity="0.7">
        <rect x="0" y="0" width="45" height="55" rx="4" fill="#c0392b" transform="rotate(5, 22, 27)"/>
        <rect x="5" y="5" width="35" height="20" rx="3" fill="#a93226" transform="rotate(5, 22, 15)"/>
        <circle cx="22" cy="30" r="8" fill="#d4a017" transform="rotate(5, 22, 30)"/>
      </g>`;

            // Tangerines bottom right
            svg += `<g transform="translate(${width - 90}, ${height - 70})">
        <circle cx="25" cy="35" r="18" fill="#f39c12" opacity="0.8"/>
        <circle cx="55" cy="30" r="15" fill="#e67e22" opacity="0.7"/>
        <ellipse cx="25" cy="20" rx="8" ry="4" fill="#27ae60" opacity="0.6"/>
        <ellipse cx="55" cy="18" rx="6" ry="3" fill="#2ecc71" opacity="0.5"/>
      </g>`;

            // Coins / decoration top left
            svg += `<g transform="translate(15, 15)" opacity="0.6">
        <circle cx="15" cy="15" r="10" fill="#f1c40f" stroke="#d4a017" stroke-width="1"/>
        <rect cx="15" cy="15" x="11" y="11" width="8" height="8" rx="1" fill="none" stroke="#d4a017" stroke-width="1"/>
      </g>`;
            break;

        case 4: // Đèn Lồng - Lanterns, peach blossoms
            // Lanterns
            svg += createLantern(60, 60, 35, '#e74c3c');
            svg += createLantern(width - 60, 55, 30, '#c0392b');
            svg += createLantern(width - 25, 80, 20, '#e74c3c');

            // Large peach blossoms
            svg += createPeachBlossom(width - 50, height - 80, 25, '#ff69b4');
            svg += createPeachBlossom(width - 90, height - 50, 20, '#ff1493');
            svg += createPeachBlossom(50, height - 60, 22, '#ff69b4');
            svg += createPeachBlossom(30, height - 100, 18, '#ff1493', 0.7);
            svg += createPeachBlossom(80, height - 30, 15, '#ffb6c1', 0.6);

            // Small scattered blossoms
            svg += createPeachBlossom(width - 20, height / 2, 8, '#ffb6c1', 0.4);
            svg += createPeachBlossom(15, height / 3, 7, '#ff69b4', 0.3);
            break;

        case 5: // Sen Vàng - Lotus
            // Lotus flowers
            svg += createLotus(width - 70, height - 80, 30, '#f8b4d9');
            svg += createLotus(60, height - 60, 25, '#f4a0c8');
            svg += createLotus(width - 40, 80, 18, '#f8b4d9');

            // Lotus leaves
            svg += `<ellipse cx="40" cy="${height - 100}" rx="35" ry="18" fill="#1abc9c" opacity="0.3" transform="rotate(-20, 40, ${height - 100})"/>`;
            svg += `<ellipse cx="${width - 50}" cy="${height - 120}" rx="30" ry="15" fill="#1abc9c" opacity="0.25" transform="rotate(15, ${width - 50}, ${height - 120})"/>`;

            // Golden accents
            svg += createSparkle(width / 2, 30, 8, '#f1c40f');
            svg += createSparkle(50, 40, 6, '#f1c40f');
            svg += createSparkle(width - 50, 35, 6, '#f1c40f');
            break;

        case 6: // Trúc Xanh - Bamboo
            // Bamboo stalks
            svg += createBamboo(25, 20, height - 20, '#2c6e49');
            svg += createBamboo(45, 60, height - 40, '#4a8c6f');
            svg += createBamboo(width - 25, 30, height - 30, '#2c6e49');

            // Ink wash circles (decorative)
            svg += `<circle cx="${width / 2}" cy="30" r="20" fill="none" stroke="#2c6e49" stroke-width="1" opacity="0.2"/>`;
            svg += `<circle cx="${width / 2}" cy="30" r="25" fill="none" stroke="#2c6e49" stroke-width="0.5" opacity="0.15"/>`;
            break;

        case 7: // Pháo Hoa - Fireworks
            // Multiple fireworks
            svg += createFirework(80, 70, 50, ['#f1c40f', '#e74c3c', '#ff69b4', '#3498db']);
            svg += createFirework(width - 70, 90, 40, ['#e67e22', '#f1c40f', '#e74c3c', '#9b59b6']);
            svg += createFirework(width / 2, 40, 35, ['#3498db', '#1abc9c', '#f1c40f', '#e74c3c']);
            svg += createFirework(width - 40, height - 80, 30, ['#f1c40f', '#ff69b4', '#3498db']);

            // Sparkles everywhere
            for (let i = 0; i < 15; i++) {
                const sx = 30 + Math.random() * (width - 60);
                const sy = 20 + Math.random() * (height - 40);
                svg += createSparkle(sx, sy, 3 + Math.random() * 5, ['#f1c40f', '#fff', '#ff69b4', '#3498db'][Math.floor(Math.random() * 4)]);
            }
            break;

        case 8: // Mùa Xuân - Watercolor peach blossoms
            // Scattered peach blossoms
            svg += createBranch(0, 30, 150, 100, '#8b6351');
            svg += createBranch(80, 60, 130, 20, '#8b6351');
            svg += createPeachBlossom(50, 45, 16, '#ff69b4', 0.7);
            svg += createPeachBlossom(90, 30, 14, '#ffb6c1', 0.6);
            svg += createPeachBlossom(120, 65, 12, '#ff1493', 0.5);
            svg += createPeachBlossom(30, 70, 10, '#ff69b4', 0.4);

            // Bottom decorations
            svg += createBranch(width, height - 20, width - 140, height - 90, '#8b6351');
            svg += createPeachBlossom(width - 60, height - 55, 18, '#ff69b4', 0.7);
            svg += createPeachBlossom(width - 100, height - 70, 14, '#ffb6c1', 0.6);
            svg += createPeachBlossom(width - 40, height - 90, 11, '#ff1493', 0.5);

            // Floating petals
            for (let i = 0; i < 8; i++) {
                const px = 50 + Math.random() * (width - 100);
                const py = 100 + Math.random() * (height - 200);
                svg += `<ellipse cx="${px}" cy="${py}" rx="${4 + Math.random() * 4}" ry="${2 + Math.random() * 3}" 
          fill="#ffb6c1" opacity="${0.2 + Math.random() * 0.3}" 
          transform="rotate(${Math.random() * 360}, ${px}, ${py})"/>`;
            }
            break;
    }

    return svg;
}
