/**
 * Web app nhận phản hồi từ Cổng phụ huynh và gửi về Gmail giáo viên.
 * Xem HUONG_DAN_GUI_PHAN_HOI_GMAIL.md trước khi triển khai.
 */

function setupParentFeedback() {
  const teacherEmail = Session.getEffectiveUser().getEmail();
  const portalId = ''; // App tự chèn mã cổng khi dùng nút “Sao chép mã đã điền”.

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail)) {
    throw new Error('Không xác định được Gmail chủ sở hữu. Hãy đăng nhập đúng tài khoản Google rồi chạy lại.');
  }

  PropertiesService.getScriptProperties().setProperties({
    TEACHER_EMAIL: teacherEmail,
    PORTAL_ID: portalId,
  });

  // Chạy thử để Google yêu cầu cấp quyền gửi email cho script.
  MailApp.getRemainingDailyQuota();
  Logger.log('Đã lưu cấu hình nhận phản hồi cho ' + teacherEmail);
}

function doGet() {
  return jsonResponse_({ ok: true, service: 'parent-feedback', message: 'Dịch vụ đang hoạt động.' });
}

function doPost(event) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const teacherEmail = properties.getProperty('TEACHER_EMAIL') || Session.getEffectiveUser().getEmail();
    const expectedPortalId = properties.getProperty('PORTAL_ID') || '';
    if (!teacherEmail) throw new Error('Script chưa được cấu hình. Hãy chạy setupParentFeedback trước.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Đã hết hạn mức gửi email trong ngày.');

    const payload = JSON.parse(event && event.postData && event.postData.contents || '{}');
    validateFeedback_(payload, expectedPortalId);

    const cache = CacheService.getScriptCache();
    const rateKey = ('feedback-' + payload.portalId + '-' + payload.studentId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    if (cache.get(rateKey)) throw new Error('Vui lòng đợi trước khi gửi lời nhắn tiếp theo.');
    cache.put(rateKey, '1', 30);

    const sentAt = new Date(payload.sentAt || Date.now());
    const localTime = Utilities.formatDate(sentAt, 'Asia/Ho_Chi_Minh', 'HH:mm, dd/MM/yyyy');
    const subject = '[Phụ huynh lớp ' + safeText_(payload.classCode, 30) + '] '
      + safeText_(payload.categoryLabel, 80) + ' – ' + safeText_(payload.studentName, 120);
    const plainBody = [
      'PHẢN HỒI TỪ CỔNG PHỤ HUYNH',
      '',
      'Lớp: ' + safeText_(payload.classCode, 30),
      'Học sinh: ' + safeText_(payload.studentName, 120),
      'Phụ huynh: ' + safeText_(payload.parentName, 120),
      'Số điện thoại: ' + safeText_(payload.parentPhone || 'Chưa cập nhật', 80),
      'Chủ đề: ' + safeText_(payload.categoryLabel, 80),
      'Thời gian: ' + localTime,
      '',
      safeText_(payload.message, 1200),
    ].join('\n');

    const htmlBody = '<div style="max-width:640px;font-family:Arial,sans-serif;color:#3f2940">'
      + '<div style="padding:20px;border-radius:18px 18px 0 0;background:linear-gradient(135deg,#7c49c7,#dd5198);color:white">'
      + '<div style="font-size:12px;font-weight:700;letter-spacing:1px">NHỊP CẦU GIA ĐÌNH</div>'
      + '<h2 style="margin:6px 0 0">Phản hồi mới từ phụ huynh</h2></div>'
      + '<div style="padding:20px;border:1px solid #ead9e7;border-top:0;border-radius:0 0 18px 18px;background:#fffafd">'
      + infoRow_('Lớp', payload.classCode)
      + infoRow_('Học sinh', payload.studentName)
      + infoRow_('Phụ huynh', payload.parentName)
      + infoRow_('Số điện thoại', payload.parentPhone || 'Chưa cập nhật')
      + infoRow_('Chủ đề', payload.categoryLabel)
      + infoRow_('Thời gian', localTime)
      + '<div style="margin-top:16px;padding:16px;border-radius:14px;background:#fff5d9;line-height:1.65">'
      + escapeHtml_(safeText_(payload.message, 1200)).replace(/\n/g, '<br>') + '</div>'
      + '</div></div>';

    MailApp.sendEmail({
      to: teacherEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: 'Lớp Hạnh Phúc – Cổng phụ huynh',
    });

    return jsonResponse_({ ok: true, message: 'Đã gửi phản hồi.' });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, message: error && error.message || 'Không thể gửi phản hồi.' });
  }
}

function validateFeedback_(payload, expectedPortalId) {
  if (!payload || payload.event !== 'parent_feedback') throw new Error('Yêu cầu không hợp lệ.');
  if (!payload.portalId || String(payload.portalId).length > 100) throw new Error('Thiếu mã cổng phụ huynh.');
  if (expectedPortalId && payload.portalId !== expectedPortalId) throw new Error('Mã cổng phụ huynh không khớp.');
  if (!payload.studentName || String(payload.studentName).length > 120) throw new Error('Thông tin học sinh không hợp lệ.');
  if (!payload.parentName || String(payload.parentName).length > 120) throw new Error('Thông tin phụ huynh không hợp lệ.');
  if (!payload.message || String(payload.message).trim().length < 5 || String(payload.message).length > 1200) throw new Error('Nội dung phản hồi không hợp lệ.');
  if (!['learning', 'attendance', 'support', 'thanks'].includes(payload.category)) throw new Error('Chủ đề phản hồi không hợp lệ.');
}

function safeText_(value, maximumLength) {
  return String(value == null ? '' : value).trim().slice(0, maximumLength);
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

function infoRow_(label, value) {
  return '<div style="display:flex;gap:12px;padding:7px 0;border-bottom:1px solid #f0e6ee">'
    + '<strong style="width:115px;color:#7a4978">' + escapeHtml_(label) + '</strong>'
    + '<span>' + escapeHtml_(safeText_(value, 160)) + '</span></div>';
}

function jsonResponse_(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}
