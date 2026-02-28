// Chart Generator using HTML Canvas
// Generates bar charts and pie charts as base64 PNG images

export interface ChartData {
    labels: string[];
    values: number[];
    title?: string;
    colors?: string[];
}

const DEFAULT_COLORS = [
    '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B',
    '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#14B8A6', '#D946EF',
];

function getColors(count: number, custom?: string[]): string[] {
    if (custom && custom.length >= count) return custom.slice(0, count);
    return Array.from({ length: count }, (_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
}

export function generateBarChart(data: ChartData, width = 700, height = 420): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const padding = { top: 60, right: 30, bottom: 80, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const colors = getColors(data.values.length, data.colors);
    const maxVal = Math.max(...data.values, 1) * 1.15;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Title
    if (data.title) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.title, width / 2, 32);
    }

    // Grid lines + Y-axis labels
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';

    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
        const y = padding.top + chartH - (i / gridCount) * chartH;
        const val = Math.round((maxVal * i) / gridCount);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillText(String(val), padding.left - 8, y + 4);
    }

    // Bars
    const barCount = data.values.length;
    const gap = barCount <= 4 ? 24 : barCount <= 8 ? 12 : 6;
    const barW = Math.min(60, (chartW - gap * (barCount + 1)) / barCount);
    const totalBarsW = barCount * barW + (barCount - 1) * gap;
    const startX = padding.left + (chartW - totalBarsW) / 2;

    data.values.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = startX + i * (barW + gap);
        const y = padding.top + chartH - barH;

        // Bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
        gradient.addColorStop(0, colors[i]);
        gradient.addColorStop(1, colors[i] + 'CC');
        ctx.fillStyle = gradient;

        // Rounded top
        const radius = Math.min(6, barW / 4);
        ctx.beginPath();
        ctx.moveTo(x, padding.top + chartH);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barW - radius, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
        ctx.lineTo(x + barW, padding.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Value label on top  
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(val), x + barW / 2, y - 8);

        // X-axis label
        ctx.fillStyle = '#475569';
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'center';

        // Wrap long labels
        const label = data.labels[i] || '';
        const maxLabelW = barW + gap - 4;
        if (ctx.measureText(label).width > maxLabelW && label.length > 8) {
            const mid = Math.ceil(label.length / 2);
            const line1 = label.slice(0, mid);
            const line2 = label.slice(mid);
            ctx.fillText(line1, x + barW / 2, padding.top + chartH + 18);
            ctx.fillText(line2, x + barW / 2, padding.top + chartH + 32);
        } else {
            ctx.fillText(label, x + barW / 2, padding.top + chartH + 20);
        }
    });

    // X-axis line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(width - padding.right, padding.top + chartH);
    ctx.stroke();

    // Y-axis line
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.stroke();

    return canvas.toDataURL('image/png');
}

export function generatePieChart(data: ChartData, width = 500, height = 420): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const colors = getColors(data.values.length, data.colors);
    const total = data.values.reduce((a, b) => a + b, 0) || 1;
    const centerX = width * 0.42;
    const centerY = height / 2 + 15;
    const radius = Math.min(width, height) * 0.32;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Title
    if (data.title) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.title, width / 2, 30);
    }

    // Draw slices
    let startAngle = -Math.PI / 2;
    const sliceData: { midAngle: number; pct: number; idx: number }[] = [];

    data.values.forEach((val, i) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const midAngle = startAngle + sliceAngle / 2;

        // Slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();

        // White border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        sliceData.push({ midAngle, pct: Math.round((val / total) * 100), idx: i });

        startAngle += sliceAngle;
    });

    // Percentage labels on slices
    sliceData.forEach(({ midAngle, pct }) => {
        if (pct < 5) return; // Skip tiny slices
        const labelR = radius * 0.65;
        const lx = centerX + Math.cos(midAngle) * labelR;
        const ly = centerY + Math.sin(midAngle) * labelR;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, lx, ly);
    });

    // Legend (right side)
    const legendX = width * 0.72;
    let legendY = height * 0.22;

    data.labels.forEach((label, i) => {
        const pct = Math.round((data.values[i] / total) * 100);
        // Color box
        ctx.fillStyle = colors[i];
        ctx.fillRect(legendX, legendY - 6, 14, 14);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY - 6, 14, 14);

        // Label text
        ctx.fillStyle = '#334155';
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const displayLabel = label.length > 15 ? label.slice(0, 14) + '…' : label;
        ctx.fillText(`${displayLabel} (${pct}%)`, legendX + 20, legendY + 1);
        legendY += 26;
    });

    return canvas.toDataURL('image/png');
}

// Parse AI-generated chart data
export function parseChartData(aiResponse: string): ChartData | null {
    try {
        // Try to find JSON in the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.labels && parsed.values) {
                return {
                    labels: parsed.labels,
                    values: parsed.values.map(Number),
                    title: parsed.title || '',
                    colors: parsed.colors,
                };
            }
        }
    } catch {
        // Fallback: try to extract from text patterns
    }
    return null;
}

// Validate chart data against class size
export function validateChartData(
    data: { labels: string[]; values: number[] },
    classSize: string | undefined,
    chartType: 'bar' | 'pie'
): { valid: boolean; message: string } {
    if (!data.labels.length || !data.values.length) {
        return { valid: false, message: 'Chưa có dữ liệu' };
    }
    if (data.labels.length !== data.values.length) {
        return { valid: false, message: 'Số nhãn và giá trị không khớp' };
    }
    if (data.values.some(v => isNaN(v) || v < 0)) {
        return { valid: false, message: 'Giá trị phải là số >= 0' };
    }

    const total = data.values.reduce((a, b) => a + b, 0);

    if (chartType === 'pie') {
        if (Math.abs(total - 100) > 0.5) {
            return { valid: false, message: `Tổng % = ${total.toFixed(1)}% (phải = 100%)` };
        }
        return { valid: true, message: `✓ Tổng = ${total.toFixed(1)}%` };
    }

    // Bar chart
    if (classSize && classSize.trim()) {
        const size = parseInt(classSize);
        if (!isNaN(size) && size > 0) {
            if (total !== size) {
                return { valid: false, message: `Tổng = ${total} (phải = ${size} theo sĩ số lớp)` };
            }
            return { valid: true, message: `✓ Tổng = ${total} = sĩ số lớp` };
        }
    }

    if (total <= 0) {
        return { valid: false, message: 'Tổng giá trị phải > 0' };
    }
    return { valid: true, message: `Tổng = ${total}` };
}
