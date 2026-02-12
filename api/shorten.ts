import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers to allow client-side access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        // Call is.gd API
        const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error(`is.gd returned status ${response.status}`);
        }

        const shortUrl = await response.text();

        // Check if result looks like a URL
        if (shortUrl.startsWith('http')) {
            return res.status(200).json({ shortUrl });
        } else {
            // is.gd might return an error message in plain text
            return res.status(500).json({ error: shortUrl });
        }

    } catch (error) {
        console.error('Shorten API Error:', error);
        return res.status(500).json({
            error: 'Failed to shorten URL',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
