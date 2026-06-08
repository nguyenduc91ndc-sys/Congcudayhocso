function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const to = String(payload.to || '').trim();
    const subject = String(payload.subject || 'Bao cao ket qua hoc tap').trim();
    const text = String(payload.text || '').trim();
    const html = String(payload.html || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse({ ok: false, error: 'Email nhan bao cao khong hop le' }, 400);
    }

    if (!text && !html) {
      return jsonResponse({ ok: false, error: 'Noi dung bao cao trong' }, 400);
    }

    GmailApp.sendEmail(to, subject, text || stripHtml(html), {
      htmlBody: html || text.replace(/\n/g, '<br>'),
      name: 'GiaoVienCN',
    });

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 500);
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'GiaoVienCN result report mailer' }, 200);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
