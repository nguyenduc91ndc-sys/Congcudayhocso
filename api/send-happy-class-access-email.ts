import type { VercelRequest, VercelResponse } from '@vercel/node';

type AccessRecipient = {
    email?: string;
    name?: string;
    school?: string;
};

type SendResult = {
    email: string;
    ok: boolean;
    error?: string;
};

const FIREBASE_API_KEY = process.env.HAPPY_CLASS_FIREBASE_API_KEY || 'AIzaSyAj3V4o8msBNwZi531qpIDcFhnZ7WKY8wA';
const HAPPY_CLASS_ADMIN_EMAILS = new Set([
    'ducnguyen.giaovien@gmail.com',
    'nguyenduc91ndc@gmail.com',
]);
const HAPPY_CLASS_URL = 'https://giaoviencn.io.vn/lop-hanh-phuc';
const MAX_RECIPIENTS = 50;

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isAppsScriptUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && /^script\.google(?:usercontent)?\.com$/i.test(url.hostname);
    } catch {
        return false;
    }
};
const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

async function verifyAdmin(req: VercelRequest) {
    const authorization = String(req.headers.authorization || '');
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!idToken) throw new Error('ADMIN_TOKEN_REQUIRED');

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
    if (!response.ok) throw new Error('ADMIN_TOKEN_INVALID');

    const result = await response.json() as { users?: Array<{ email?: string; emailVerified?: boolean }> };
    const user = result.users?.[0];
    const email = String(user?.email || '').trim().toLowerCase();
    if (!user?.emailVerified || !HAPPY_CLASS_ADMIN_EMAILS.has(email)) throw new Error('ADMIN_REQUIRED');
    return email;
}

function createEmail(recipient: Required<Pick<AccessRecipient, 'email'>> & AccessRecipient) {
    const name = String(recipient.name || '').trim();
    const school = String(recipient.school || '').trim();
    const greeting = name ? `Kính gửi Thầy/Cô ${name},` : 'Kính gửi Thầy/Cô,';
    const schoolLine = school ? `\nĐơn vị: ${school}` : '';
    const text = `${greeting}\n\nTài khoản ${recipient.email} đã được cấp quyền sử dụng ứng dụng Lớp Hạnh Phúc trên GIAOVIENCN.${schoolLine}\n\nMở ứng dụng tại: ${HAPPY_CLASS_URL}\n\nThầy/Cô vui lòng đăng nhập bằng đúng tài khoản Google nhận email này. Mỗi tài khoản được sử dụng tối đa trên 2 thiết bị.\n\nTrân trọng,\nGIAOVIENCN`;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(recipient.email);
    const safeSchool = escapeHtml(school);
    const html = `
        <div style="margin:0;background:#f6f1ff;padding:28px 12px;font-family:Arial,sans-serif;color:#2f1847">
          <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;box-shadow:0 10px 30px rgba(75,27,112,.12)">
            <div style="background:linear-gradient(135deg,#7e22ce,#db2777,#f97316);padding:28px;color:#ffffff">
              <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fde68a">GIAOVIENCN</div>
              <h1 style="margin:8px 0 0;font-size:25px;line-height:1.3">Thầy/Cô đã được cấp quyền Lớp Hạnh Phúc</h1>
            </div>
            <div style="padding:28px;font-size:15px;line-height:1.7">
              <p style="margin-top:0">Kính gửi Thầy/Cô${safeName ? ` <strong>${safeName}</strong>` : ''},</p>
              <p>Tài khoản <strong style="color:#7e22ce">${safeEmail}</strong> đã được cấp quyền sử dụng ứng dụng <strong>Lớp Hạnh Phúc</strong> trên GIAOVIENCN.</p>
              ${safeSchool ? `<p style="margin:0 0 18px;color:#64748b">Đơn vị: ${safeSchool}</p>` : ''}
              <p style="margin:24px 0;text-align:center"><a href="${HAPPY_CLASS_URL}" style="display:inline-block;border-radius:14px;background:linear-gradient(135deg,#7e22ce,#db2777);padding:13px 22px;color:#ffffff;text-decoration:none;font-weight:700">Mở Lớp Hạnh Phúc</a></p>
              <div style="border-radius:14px;background:#fff7ed;padding:14px 16px;color:#9a3412"><strong>Lưu ý:</strong> Hãy đăng nhập bằng đúng tài khoản Google nhận email này. Mỗi tài khoản được sử dụng tối đa trên 2 thiết bị.</div>
              <p style="margin:24px 0 0">Trân trọng,<br><strong>GIAOVIENCN</strong></p>
            </div>
          </div>
        </div>`;

    return {
        subject: 'Bạn đã được cấp quyền sử dụng Lớp Hạnh Phúc',
        text,
        html,
    };
}

async function sendEmail(recipient: Required<Pick<AccessRecipient, 'email'>> & AccessRecipient) {
    const content = createEmail(recipient);
    const appsScriptUrl = String(process.env.REPORT_APPS_SCRIPT_URL || '').trim();
    if (appsScriptUrl) {
        if (!isAppsScriptUrl(appsScriptUrl)) throw new Error('Server đang cấu hình sai link Apps Script');
        const response = await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: recipient.email,
                ...content,
                learnerName: recipient.name || 'Giáo viên',
                lessonTitle: 'Lớp Hạnh Phúc',
            }),
        });
        const message = await response.text();
        if (!response.ok) throw new Error(message || 'Không gửi được email qua Apps Script');
        try {
            const result = JSON.parse(message) as { ok?: boolean; error?: string };
            if (result.ok === false) throw new Error(result.error || 'Không gửi được email qua Apps Script');
        } catch (error) {
            if (error instanceof SyntaxError) return;
            throw error;
        }
        return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) throw new Error('Server chưa cấu hình dịch vụ gửi email');
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.REPORT_FROM_EMAIL || 'GiaoVienCN <onboarding@resend.dev>',
            to: recipient.email,
            ...content,
        }),
    });
    if (!response.ok) throw new Error((await response.text()) || 'Không gửi được email');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await verifyAdmin(req);
        const rawRecipients = Array.isArray(req.body?.recipients) ? req.body.recipients as AccessRecipient[] : [];
        if (!rawRecipients.length || rawRecipients.length > MAX_RECIPIENTS) {
            return res.status(400).json({ error: `Mỗi lần gửi cần từ 1 đến ${MAX_RECIPIENTS} email` });
        }

        const uniqueRecipients = new Map<string, Required<Pick<AccessRecipient, 'email'>> & AccessRecipient>();
        for (const recipient of rawRecipients) {
            const email = String(recipient?.email || '').trim().toLowerCase();
            if (!isEmail(email)) return res.status(400).json({ error: `Email không hợp lệ: ${email || '(trống)'}` });
            uniqueRecipients.set(email, {
                email,
                name: String(recipient.name || '').trim().slice(0, 160),
                school: String(recipient.school || '').trim().slice(0, 240),
            });
        }

        const recipients = Array.from(uniqueRecipients.values());
        const results: SendResult[] = [];
        for (let index = 0; index < recipients.length; index += 5) {
            const batch = recipients.slice(index, index + 5);
            const batchResults = await Promise.all(batch.map(async (recipient): Promise<SendResult> => {
                try {
                    await sendEmail(recipient);
                    return { email: recipient.email, ok: true };
                } catch (error) {
                    console.error(`Happy Class access email failed for ${recipient.email}:`, error);
                    return { email: recipient.email, ok: false, error: error instanceof Error ? error.message : 'Không gửi được email' };
                }
            }));
            results.push(...batchResults);
        }

        const failed = results.filter((result) => !result.ok);
        return res.status(failed.length === results.length ? 502 : 200).json({
            ok: failed.length === 0,
            sent: results.length - failed.length,
            failed,
        });
    } catch (error) {
        const code = error instanceof Error ? error.message : '';
        if (code === 'ADMIN_TOKEN_REQUIRED' || code === 'ADMIN_TOKEN_INVALID') return res.status(401).json({ error: 'Phiên đăng nhập Admin không hợp lệ' });
        if (code === 'ADMIN_REQUIRED') return res.status(403).json({ error: 'Chỉ Admin Lớp Hạnh Phúc được gửi thông báo cấp quyền' });
        console.error('Send Happy Class access email error:', error);
        return res.status(500).json({ error: 'Lỗi gửi thông báo cấp quyền' });
    }
}
