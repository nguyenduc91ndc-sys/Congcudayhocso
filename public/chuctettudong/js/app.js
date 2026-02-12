// ===== Main Application Logic =====
let currentTemplateId = 1;

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    renderTemplateGrid();
    renderSampleOptions();

    // Check for shared link
    const isShared = loadFromShareLink();

    if (!isShared) {
        // Load default sample text
        loadSampleText(1);
        selectTemplate(1);
    }
});

// ===== Render Template Selector Grid =====
function renderTemplateGrid() {
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = TEMPLATES.map(t => `
    <div class="template-card ${t.id === currentTemplateId ? 'active' : ''}" 
         data-id="${t.id}" 
         onclick="selectTemplate(${t.id})"
         title="${t.desc}">
      <span class="emoji">${t.thumbnail}</span>
      <span class="name">${t.name}</span>
    </div>
  `).join('');
}

// ===== Render Sample Text Options =====
function renderSampleOptions() {
    const select = document.getElementById('sampleSelect');
    SAMPLE_TEXTS.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
}

// ===== Select Template =====
function selectTemplate(id) {
    currentTemplateId = id;

    // Update grid selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.id) === id);
    });

    // Update preview class
    const preview = document.getElementById('cardPreview');
    // Remove all template classes
    for (let i = 1; i <= 8; i++) {
        preview.classList.remove('template-' + i);
    }
    preview.classList.add('template-' + id);

    // Re-render decorations
    renderDecorations();

    // Add transition animation
    preview.style.animation = 'none';
    preview.offsetHeight; // trigger reflow
    preview.style.animation = 'fadeIn 0.5s ease';
}

// ===== Load Sample Text =====
function loadSampleText(id) {
    id = parseInt(id);
    const sample = SAMPLE_TEXTS.find(s => s.id === id);
    if (!sample) return;

    document.getElementById('inputTitle').value = sample.title;
    document.getElementById('inputSubtitle').value = sample.subtitle;
    document.getElementById('inputRecipient').value = sample.recipient;
    document.getElementById('inputPara1').value = sample.paragraphs[0] || '';
    document.getElementById('inputPara2').value = sample.paragraphs[1] || '';
    document.getElementById('inputPara3').value = sample.paragraphs[2] || '';
    document.getElementById('inputPara4').value = sample.paragraphs[3] || '';
    document.getElementById('inputClosing').value = sample.closing;
    document.getElementById('inputSender').value = sample.senderName;

    updatePreview();
}

// ===== Update Preview =====
function updatePreview() {
    const title = document.getElementById('inputTitle').value;
    const subtitle = document.getElementById('inputSubtitle').value;
    const recipient = document.getElementById('inputRecipient').value;
    const para1 = document.getElementById('inputPara1').value;
    const para2 = document.getElementById('inputPara2').value;
    const para3 = document.getElementById('inputPara3').value;
    const para4 = document.getElementById('inputPara4').value;
    const closing = document.getElementById('inputClosing').value;
    const sender = document.getElementById('inputSender').value;

    document.getElementById('previewTitle').textContent = title || 'Tiêu đề';
    document.getElementById('previewSubtitle').textContent = subtitle || '';
    document.getElementById('previewRecipient').textContent = recipient || '';

    // Build content paragraphs
    const contentEl = document.getElementById('previewContent');
    const paras = [para1, para2, para3, para4].filter(p => p.trim());
    if (paras.length > 0) {
        contentEl.innerHTML = paras.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    } else {
        contentEl.innerHTML = '<p style="opacity:0.5;text-align:center;font-style:italic;">Nhập nội dung vào form bên cạnh...</p>';
    }

    document.getElementById('previewClosing').textContent = closing || '';
    document.getElementById('previewSender').textContent = sender || '';
}

// ===== Render SVG Decorations =====
function renderDecorations() {
    const svg = document.getElementById('cardDecorations');
    const preview = document.getElementById('cardPreview');
    const width = preview.offsetWidth || 520;
    const height = preview.offsetHeight || 740;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.innerHTML = getTemplateDecorations(currentTemplateId, width, height);
}

// ===== Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Resize observer for decorations =====
if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
        renderDecorations();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const preview = document.getElementById('cardPreview');
        if (preview) observer.observe(preview);
    });
}
