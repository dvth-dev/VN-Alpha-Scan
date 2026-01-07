import axios from 'axios';

// Cache for batch results (30 seconds)
const batchCache = new Map();
const CACHE_TTL = 30 * 1000;

const BINANCE_BASE = 'https://www.binance.com/bapi/defi/v1/public/alpha-trade';

async function fetchTokenDetails(symbol) {
    try {
        const [tickerRes, klinesRes] = await Promise.all([
            axios.get(`${BINANCE_BASE}/ticker?symbol=${symbol}`),
            axios.get(`${BINANCE_BASE}/klines?symbol=${symbol}&interval=1d&limit=2`)
        ]);

        const ticker = tickerRes.data?.data;
        const klines = klinesRes.data?.data;

        let volToday = 0;
        let volYesterday = 0;

        if (klines && klines.length >= 1) {
            volToday = parseFloat(klines[klines.length - 1][7]);
            if (klines.length >= 2) {
                volYesterday = parseFloat(klines[klines.length - 2][7]);
            }
        }

        return {
            symbol,
            ticker,
            volumeStats: { volToday, volYesterday }
        };
    } catch (e) {
        console.error(`Error for ${symbol}:`, e.message);
        return { symbol, error: true };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { symbols } = req.body; // Expecting array of "ALPHA_XXXUSDT"

    if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ message: 'Symbols array required' });
    }

    // Limit to 20 per batch to avoid timeouts
    const batch = symbols.slice(0, 20);

    try {
        // Fetch all in parallel on server
        const results = await Promise.all(batch.map(s => fetchTokenDetails(s)));

        const dataMap = {};
        results.forEach(r => {
            if (!r.error) {
                const alphaId = r.symbol.replace('USDT', '');
                dataMap[alphaId] = {
                    ticker: r.ticker,
                    volumeStats: r.volumeStats
                };
            }
        });

        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
        return res.status(200).json(dataMap);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
