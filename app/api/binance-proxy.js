import axios from 'axios';

// Simple in-memory cache for serverless functions
// Note: Vercel might reuse containers, making this cache effective for short periods.
const cache = new Map();
const CACHE_TTL = {
    'token-list': 300 * 1000, // 5 minutes
    'ticker': 5 * 1000,      // 5 seconds
    'klines': 30 * 1000      // 30 seconds
};

export default async function handler(req, res) {
    const { endpoint, ...params } = req.query;

    if (!endpoint) {
        return res.status(400).json({ message: 'Missing endpoint parameter' });
    }

    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const now = Date.now();

    // Check cache
    if (cache.has(cacheKey)) {
        const { timestamp, data } = cache.get(cacheKey);
        if (now - timestamp < (CACHE_TTL[endpoint] || 10000)) {
            return res.status(200).json(data);
        }
    }

    // Mapping endpoints to actual Binance URLs
    const endpoints = {
        'token-list': 'https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list',
        'ticker': 'https://www.binance.com/bapi/defi/v1/public/alpha-trade/ticker',
        'klines': 'https://www.binance.com/bapi/defi/v1/public/alpha-trade/klines'
    };

    const targetUrl = endpoints[endpoint];

    if (!targetUrl) {
        return res.status(400).json({ message: 'Invalid endpoint' });
    }

    try {
        const response = await axios.get(targetUrl, {
            params,
            headers: {
                'Referer': 'https://www.binance.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Store in cache
        cache.set(cacheKey, {
            timestamp: now,
            data: response.data
        });

        // Set Cache-Control for browser
        res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');

        return res.status(200).json(response.data);
    } catch (error) {
        if (error.response?.status === 429) {
            console.error('Binance RATE LIMIT (429) hit!');
            return res.status(429).json({
                message: 'Binance rate limit hit. Too many requests.',
                code: 'RATE_LIMIT'
            });
        }

        console.error('Binance Proxy Error:', error.message);
        return res.status(error.response?.status || 500).json({
            message: 'Error fetching from Binance',
            error: error.message
        });
    }
}
