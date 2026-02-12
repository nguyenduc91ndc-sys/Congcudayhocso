// ===== Export PNG & PDF =====

// Strong, vivid colors for each template
const EXPORT_COLORS = {
    1: { bg: '#fdf6ee', title: '#b91c1c', subtitle: '#b45309', divider: '#92400e', recipient: '#4a0e0e', text: '#1a0505', closing: '#b91c1c', sender: '#4a0e0e', border: '#c0392b' },
    2: { bg: '#fef9f0', title: '#7f1d1d', subtitle: '#92400e', divider: '#7f1d1d', recipient: '#1c1917', text: '#0c0a09', closing: '#7f1d1d', sender: '#1c1917', border: '#8b1a1a' },
    3: { bg: '#edf7ef', title: '#b91c1c', subtitle: '#166534', divider: '#92400e', recipient: '#052e16', text: '#052e16', closing: '#b91c1c', sender: '#052e16', border: '#2ecc71' },
    4: { bg: '#fffdf5', title: '#b91c1c', subtitle: '#dc2626', divider: '#b45309', recipient: '#4a0e0e', text: '#1a0505', closing: '#b91c1c', sender: '#4a0e0e', border: '#e74c3c' },
    5: { bg: '#eef5fb', title: '#1e40af', subtitle: '#92400e', divider: '#0f766e', recipient: '#0c4a6e', text: '#0c4a6e', closing: '#1e40af', sender: '#0c4a6e', border: '#2980b9' },
    6: { bg: '#f5f5ee', title: '#14532d', subtitle: '#166534', divider: '#166534', recipient: '#052e16', text: '#1a2e05', closing: '#14532d', sender: '#052e16', border: '#2c6e49' },
    7: { bg: '#1e0a35', title: '#fbbf24', subtitle: '#f59e0b', divider: '#d97706', recipient: '#fef3c7', text: '#fde68a', closing: '#fbbf24', sender: '#fef3c7', border: '#9b59b6' },
    8: { bg: '#fff0f5', title: '#be185d', subtitle: '#db2777', divider: '#92400e', recipient: '#4a0e2a', text: '#3b0764', closing: '#be185d', sender: '#4a0e2a', border: '#e84393' }
};

/**
 * Capture computed layout styles from an element (dimensions, spacing, font, etc.)
 * This preserves the visual layout even when CSS is disabled.
 */
function captureLayout(el) {
    const cs = window.getComputedStyle(el);
    return {
        width: cs.width,
        height: cs.height,
        minHeight: cs.minHeight,
        padding: cs.padding,
        margin: cs.margin,
        display: cs.display,
        flexDirection: cs.flexDirection,
        alignItems: cs.alignItems,
        justifyContent: cs.justifyContent,
        textAlign: cs.textAlign,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textIndent: cs.textIndent,
        position: cs.position,
        top: cs.top,
        left: cs.left,
        right: cs.right,
        bottom: cs.bottom,
        zIndex: cs.zIndex,
        overflow: cs.overflow,
        boxSizing: cs.boxSizing,
        borderRadius: cs.borderRadius,
        border: cs.border,
        gap: cs.gap,
        flexGrow: cs.flexGrow,
        flexShrink: cs.flexShrink,
        flex: cs.flex,
        maxWidth: cs.maxWidth,
        textTransform: cs.textTransform,
        wordBreak: cs.wordBreak,
        whiteSpace: cs.whiteSpace,
        marginBottom: cs.marginBottom,
        marginTop: cs.marginTop,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
    };
}

/**
 * Apply captured layout as inline styles, then override color with export color
 */
function applyLayoutAndColor(el, layout, color) {
    if (!el) return;
    // Apply layout properties
    for (const [prop, val] of Object.entries(layout)) {
        if (val && val !== 'normal' && val !== 'none' && val !== 'auto' && val !== '0px') {
            try { el.style.setProperty(kebabCase(prop), val, 'important'); } catch (e) { }
        }
    }
    // Override color
    el.style.setProperty('color', color, 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('-webkit-text-fill-color', color, 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
}

function kebabCase(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Core rendering function: capture layout → disable CSS → inject inline → render → restore
 */
async function renderForExport(preview) {
    const templateId = currentTemplateId || 1;
    const colors = EXPORT_COLORS[templateId] || EXPORT_COLORS[1];

    // --- Phase 1: Capture computed layouts WHILE CSS is still active ---
    const layoutData = new Map();
    const savedInlineStyles = new Map();

    // Elements to capture
    const elementMap = {
        title: preview.querySelector('.card-title'),
        subtitle: preview.querySelector('.card-subtitle'),
        divider: preview.querySelector('.card-divider'),
        recipient: preview.querySelector('.card-recipient'),
        closing: preview.querySelector('.card-closing'),
        sender: preview.querySelector('.card-sender'),
    };

    // Capture layout for the card preview
    layoutData.set(preview, captureLayout(preview));
    savedInlineStyles.set(preview, preview.getAttribute('style') || '');

    // Capture layout for card-inner
    const inner = preview.querySelector('.card-inner');
    if (inner) {
        layoutData.set(inner, captureLayout(inner));
        savedInlineStyles.set(inner, inner.getAttribute('style') || '');
    }

    // Capture layout for card-content
    const content = preview.querySelector('.card-content');
    if (content) {
        layoutData.set(content, captureLayout(content));
        savedInlineStyles.set(content, content.getAttribute('style') || '');
    }

    // Capture layout for decorations
    const decor = preview.querySelector('.card-decorations');
    if (decor) {
        layoutData.set(decor, captureLayout(decor));
        savedInlineStyles.set(decor, decor.getAttribute('style') || '');
    }

    // Capture layout for all text elements
    for (const [key, el] of Object.entries(elementMap)) {
        if (el) {
            layoutData.set(el, captureLayout(el));
            savedInlineStyles.set(el, el.getAttribute('style') || '');
        }
    }

    // Capture paragraphs
    const paragraphs = preview.querySelectorAll('.card-content p');
    paragraphs.forEach(p => {
        layoutData.set(p, captureLayout(p));
        savedInlineStyles.set(p, p.getAttribute('style') || '');
    });

    // Capture decoration items (circles, etc.)
    const decorItems = preview.querySelectorAll('.card-decorations > *');
    decorItems.forEach(d => {
        layoutData.set(d, captureLayout(d));
        savedInlineStyles.set(d, d.getAttribute('style') || '');
    });

    // --- Phase 2: Disable ALL CSS stylesheets ---
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style:not(#export-override-style)');
    const disabledSheets = [];
    stylesheets.forEach(s => {
        if (!s.disabled) {
            s.disabled = true;
            disabledSheets.push(s);
        }
    });

    // --- Phase 3: Apply captured layouts + forced colors as inline styles ---

    // Card preview
    const previewLayout = layoutData.get(preview);
    for (const [prop, val] of Object.entries(previewLayout)) {
        if (val && val !== 'normal' && val !== 'auto') {
            try { preview.style.setProperty(kebabCase(prop), val, 'important'); } catch (e) { }
        }
    }
    preview.style.setProperty('background', colors.bg, 'important');
    preview.style.setProperty('border', `3px solid ${colors.border}`, 'important');
    preview.style.setProperty('position', 'relative', 'important');
    preview.style.setProperty('overflow', 'hidden', 'important');

    // Card inner
    if (inner) {
        const innerLayout = layoutData.get(inner);
        for (const [prop, val] of Object.entries(innerLayout)) {
            if (val && val !== 'normal' && val !== 'auto') {
                try { inner.style.setProperty(kebabCase(prop), val, 'important'); } catch (e) { }
            }
        }
        inner.style.setProperty('position', 'relative', 'important');
        inner.style.setProperty('z-index', '10', 'important');
        inner.style.setProperty('opacity', '1', 'important');
    }

    // Card content
    if (content) {
        const contentLayout = layoutData.get(content);
        for (const [prop, val] of Object.entries(contentLayout)) {
            if (val && val !== 'normal' && val !== 'auto') {
                try { content.style.setProperty(kebabCase(prop), val, 'important'); } catch (e) { }
            }
        }
    }

    // Decorations container
    if (decor) {
        const decorLayout = layoutData.get(decor);
        for (const [prop, val] of Object.entries(decorLayout)) {
            if (val && val !== 'normal' && val !== 'auto') {
                try { decor.style.setProperty(kebabCase(prop), val, 'important'); } catch (e) { }
            }
        }
        decor.style.setProperty('z-index', '1', 'important');
        decor.style.setProperty('pointer-events', 'none', 'important');
    }

    // Decoration items
    decorItems.forEach(d => {
        const dLayout = layoutData.get(d);
        if (dLayout) {
            for (const [prop, val] of Object.entries(dLayout)) {
                if (val && val !== 'normal' && val !== 'auto') {
                    try { d.style.setProperty(kebabCase(prop), val, 'important'); } catch (e) { }
                }
            }
        }
    });

    // Text elements with forced colors
    for (const [key, el] of Object.entries(elementMap)) {
        if (el) {
            applyLayoutAndColor(el, layoutData.get(el), colors[key]);
        }
    }

    // Paragraphs with forced text color
    paragraphs.forEach(p => {
        applyLayoutAndColor(p, layoutData.get(p), colors.text);
    });

    // --- Phase 4: Inject minimal CSS for pseudo-element suppression ---
    const exportCSS = document.createElement('style');
    exportCSS.id = 'export-override-style';
    exportCSS.textContent = `
        *::before, *::after {
            display: none !important;
            content: none !important;
            opacity: 0 !important;
        }
    `;
    document.head.appendChild(exportCSS);

    // Small delay for browser to apply inline styles
    await new Promise(r => setTimeout(r, 200));

    try {
        // --- Phase 5: Render with html2canvas ---
        const canvas = await html2canvas(preview, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: colors.bg,
            logging: false
        });
        return canvas;
    } finally {
        // --- Phase 6: Restore everything ---
        exportCSS.remove();

        // Re-enable stylesheets
        disabledSheets.forEach(s => { s.disabled = false; });

        // Restore original inline styles
        savedInlineStyles.forEach((originalStyle, el) => {
            if (originalStyle) {
                el.setAttribute('style', originalStyle);
            } else {
                el.removeAttribute('style');
            }
        });
    }
}

// ===== Export PNG =====
async function exportToPNG() {
    const preview = document.getElementById('cardPreview');
    if (!preview) return;

    const btn = document.getElementById('btnExportPNG');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="btn-icon">⏳</span> Đang xuất...';
        btn.disabled = true;
    }

    try {
        const canvas = await renderForExport(preview);
        const link = document.createElement('a');
        link.download = 'thu-chuc-tet-' + Date.now() + '.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        showToast('✅ Đã tải xuống ảnh PNG thành công!');
    } catch (err) {
        console.error('Export PNG error:', err);
        showToast('❌ Có lỗi khi xuất ảnh: ' + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// ===== Export PDF =====
async function exportToPDF() {
    const preview = document.getElementById('cardPreview');
    if (!preview) return;

    const btn = document.getElementById('btnExportPDF');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="btn-icon">⏳</span> Đang xuất...';
        btn.disabled = true;
    }

    try {
        const canvas = await renderForExport(preview);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        let pdf;
        if (window.jspdf && window.jspdf.jsPDF) {
            pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        } else if (window.jsPDF) {
            pdf = new window.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        } else {
            throw new Error('Thư viện jsPDF chưa được tải. Vui lòng tải lại trang (Ctrl+Shift+R).');
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgRatio = canvas.height / canvas.width;

        let imgWidth = pageWidth - 20;
        let imgHeight = imgWidth * imgRatio;

        if (imgHeight > pageHeight - 20) {
            imgHeight = pageHeight - 20;
            imgWidth = imgHeight / imgRatio;
        }

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        pdf.save('thu-chuc-tet-' + Date.now() + '.pdf');

        showToast('✅ Đã tải xuống PDF thành công!');
    } catch (err) {
        console.error('Export PDF error:', err);
        showToast('❌ Lỗi: ' + (err.message || 'Có lỗi khi xuất PDF.'));
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// ===== Toast =====
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; background: rgba(0,0,0,0.8); color: white; border-radius: 8px; font-size: 14px; z-index: 99999; opacity: 0; transition: opacity 0.3s;';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
