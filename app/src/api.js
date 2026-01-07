import axios from 'axios';

// Proxy endpoint on our own server to bypass CORS
const PROXY_URL = '/api/binance-proxy';

export const fetchTokenList = async () => {
    try {
        const response = await axios.get(PROXY_URL, {
            params: { endpoint: 'token-list' }
        });
        if (response.data && response.data.code === '000000') {
            return response.data.data || [];
        }
        return [];
    } catch (error) {
        console.error("Error fetching token list from proxy:", error);
        return [];
    }
};

export const fetchTicker = async (symbol) => {
    try {
        const response = await axios.get(PROXY_URL, {
            params: {
                endpoint: 'ticker',
                symbol: symbol
            }
        });
        if (response.data && response.data.code === '000000') {
            return response.data.data;
        }
        return null;
    } catch (error) {
        return null;
    }
};

export const fetchKlines = async (symbol, interval, startTime, endTime) => {
    try {
        const params = {
            endpoint: 'klines',
            symbol: symbol,
            interval: interval,
            limit: 100 // Reduced from 1000 to save bandwidth and rate limit
        };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;

        const response = await axios.get(PROXY_URL, { params });
        if (response.data && response.data.code === '000000') {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error(`Error fetching klines for ${symbol} via proxy:`, error);
        return [];
    }
};

// Fetch tickers with concurrency control and small delay
async function limitConcurrency(tasks, limit) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = task().then(async result => {
            executing.splice(executing.indexOf(p), 1);
            // Add a tiny 50ms sleep after each task to be gentle to the API
            await new Promise(r => setTimeout(r, 50));
            return result;
        });
        results.push(p);
        executing.push(p);
        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

export const getDailyVolumeStats = async (symbol) => {
    // Fetch 1d klines. The last one is "Today" (from 00:00 UTC), 
    // the one before is "Yesterday" (full 24h).
    const klines = await fetchKlines(symbol, '1d', null, null);

    let volToday = 0;
    let volYesterday = 0;

    if (klines && klines.length >= 1) {
        // Today's kline is the last one
        const todayKline = klines[klines.length - 1];
        volToday = parseFloat(todayKline[7]); // Quote Asset Volume

        // Yesterday's kline is the previous one (if exists)
        if (klines.length >= 2) {
            const yesterdayKline = klines[klines.length - 2];
            volYesterday = parseFloat(yesterdayKline[7]);
        }
    }

    return { volToday, volYesterday };
};

export const fetchBatchDetails = async (tokens) => {
    const symbols = tokens.map(t => `${t.alphaId}USDT`);
    try {
        const response = await axios.post('/api/token-details-batch', { symbols });
        return response.data; // Map of alphaId -> { ticker, volumeStats }
    } catch (error) {
        console.error("Error fetching batch details:", error);
        return {};
    }
};

export const fetchAllData = async (tokens, onProgress) => {
    const tasks = tokens.map(token => async () => {
        const symbol = `${token.alphaId}USDT`;

        const [ticker, volumeStats] = await Promise.all([
            fetchTicker(symbol),
            getDailyVolumeStats(symbol)
        ]);

        if (onProgress) onProgress();

        if (ticker) {
            return {
                ...token,
                ticker: ticker,
                volumeStats: volumeStats
            };
        }
        return null;
    });

    const results = await limitConcurrency(tasks, 3);
    return results.filter(item => item !== null);
};
