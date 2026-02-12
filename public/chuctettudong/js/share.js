// ===== Chia sẻ qua link =====

/**
 * Rút gọn URL bằng is.gd API (miễn phí, không quảng cáo)
 * Giống cách làm trong shareUtils.ts của game Ong về Tổ
 */
async function shortenUrl(longUrl) {
    try {
        // Call our own API proxy to avoid CORS issues
        const response = await fetch(`/api/shorten?url=${encodeURIComponent(longUrl)}`);

        if (response.ok) {
            const data = await response.json();
            if (data.shortUrl) {
                return data.shortUrl;
            }
        }
        return longUrl; // Fallback to long URL if failed
    } catch (error) {
        console.error('Error shortening URL:', error);
        return longUrl; // Fallback
    }
}

function generateShareLink() {
    const data = {
        t: currentTemplateId,
        title: document.getElementById('inputTitle').value,
        sub: document.getElementById('inputSubtitle').value,
        rcpt: document.getElementById('inputRecipient').value,
        p1: document.getElementById('inputPara1').value,
        p2: document.getElementById('inputPara2').value,
        p3: document.getElementById('inputPara3').value,
        p4: document.getElementById('inputPara4').value,
        cls: document.getElementById('inputClosing').value,
        sndr: document.getElementById('inputSender').value
    };

    const jsonStr = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const url = window.location.origin + window.location.pathname + '?data=' + encoded;
    return url;
}

function loadFromShareLink() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('data');
    if (!encoded) return false;

    try {
        const jsonStr = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(jsonStr);

        // Set template
        if (data.t) {
            currentTemplateId = data.t;
        }

        // Fill form fields after DOM is ready
        setTimeout(() => {
            if (data.title) document.getElementById('inputTitle').value = data.title;
            if (data.sub) document.getElementById('inputSubtitle').value = data.sub;
            if (data.rcpt) document.getElementById('inputRecipient').value = data.rcpt;
            if (data.p1) document.getElementById('inputPara1').value = data.p1;
            if (data.p2) document.getElementById('inputPara2').value = data.p2;
            if (data.p3) document.getElementById('inputPara3').value = data.p3;
            if (data.p4) document.getElementById('inputPara4').value = data.p4;
            if (data.cls) document.getElementById('inputClosing').value = data.cls;
            if (data.sndr) document.getElementById('inputSender').value = data.sndr;

            selectTemplate(currentTemplateId);
            updatePreview();

            // Enter view mode if shared
            document.body.classList.add('view-mode');
        }, 100);

        return true;
    } catch (err) {
        console.error('Error loading share data:', err);
        return false;
    }
}

async function showShareModal() {
    const modal = document.getElementById('shareModal');
    const input = document.getElementById('shareUrlInput');

    // Hiện modal ngay với trạng thái "đang rút gọn"
    input.value = '⏳ Đang rút gọn link...';
    modal.classList.add('active');

    // Tạo link dài
    const longUrl = generateShareLink();

    // Rút gọn bằng is.gd
    const shortUrl = await shortenUrl(longUrl);
    input.value = shortUrl;
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

function copyShareLink() {
    const input = document.getElementById('shareUrlInput');
    const url = input.value;

    // Không copy nếu đang rút gọn
    if (url.startsWith('⏳')) {
        showToast('⏳ Đang rút gọn link, vui lòng chờ...');
        return;
    }

    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(url).then(() => {
        showToast('✅ Đã sao chép link ngắn!');
    }).catch(() => {
        document.execCommand('copy');
        showToast('✅ Đã sao chép link ngắn!');
    });
}

function exitViewMode() {
    document.body.classList.remove('view-mode');
    // Remove data param from URL
    const url = new URL(window.location);
    url.searchParams.delete('data');
    window.history.replaceState({}, '', url);
}
