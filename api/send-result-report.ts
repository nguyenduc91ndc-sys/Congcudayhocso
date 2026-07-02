import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ReportPayload {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    learnerName?: string;
    lessonTitle?: string;
    appsScriptUrl?: string;
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isAppsScriptUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && /^script\.google(?:usercontent)?\.com$/i.test(url.hostname);
    } catch {
        return false;
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body as ReportPayload;
        const to = String(payload.to || '').trim();
        const subject = String(payload.subject || 'Báo cáo kết quả học tập').trim();
        const text = String(payload.text || '').trim();
        const html = String(payload.html || '').trim();

        if (!to || !isEmail(to)) {
            return res.status(400).json({ error: 'Gmail nhận báo cáo không hợp lệ' });
        }

        if (!text && !html) {
            return res.status(400).json({ error: 'Nội dung báo cáo trống' });
        }

        const payloadAppsScriptUrl = String(payload.appsScriptUrl || '').trim();
        if (payloadAppsScriptUrl && !isAppsScriptUrl(payloadAppsScriptUrl)) {
            return res.status(400).json({ error: 'Link Apps Script không hợp lệ' });
        }

        const configuredAppsScriptUrl = String(process.env.REPORT_APPS_SCRIPT_URL || '').trim();
        const appsScriptUrl = payloadAppsScriptUrl || configuredAppsScriptUrl;
        if (appsScriptUrl && !isAppsScriptUrl(appsScriptUrl)) {
            return res.status(500).json({ error: 'Server đang cấu hình sai link Apps Script' });
        }

        if (appsScriptUrl) {
            const response = await fetch(appsScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, text, html, learnerName: payload.learnerName, lessonTitle: payload.lessonTitle }),
            });

            const message = await response.text();
            if (!response.ok) {
                return res.status(502).json({ error: message || 'Không gửi được báo cáo qua Apps Script' });
            }

            try {
                const result = JSON.parse(message);
                if (result && result.ok === false) {
                    return res.status(502).json({ error: result.error || 'Không gửi được báo cáo qua Apps Script' });
                }
            } catch {
                // Apps Script may return a non-JSON success body depending on deployment settings.
            }

            return res.status(200).json({ ok: true });
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            return res.status(500).json({ error: 'Server chưa cấu hình dịch vụ gửi email' });
        }

        const from = process.env.REPORT_FROM_EMAIL || 'GiaoVienCN <onboarding@resend.dev>';
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to,
                subject,
                text: text || undefined,
                html: html || text.replace(/\n/g, '<br>'),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText || 'Không gửi được báo cáo' });
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Send result report error:', error);
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Lỗi gửi báo cáo' });
    }
}
