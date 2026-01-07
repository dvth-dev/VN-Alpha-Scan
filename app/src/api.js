import axios from 'axios';

// Using direct Binance URLs instead of relative proxy paths
const BINANCE_BASE_URL = 'https://www.binance.com';
const TOKEN_LIST_URL = `${BINANCE_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list`;
const TICKER_URL = `${BINANCE_BASE_URL}/bapi/defi/v1/public/alpha-trade/ticker`;
const KLINES_URL = `${BINANCE_BASE_URL}/bapi/defi/v1/public/alpha-trade/klines`;

export const fetchTokenList = async () => {
    try {
        const response = await axios.get(TOKEN_LIST_URL);
        if (response.data && response.data.code === '000000') {
            return response.data.data || [];
        }
        return [];
    } catch (error) {
        console.error("Error fetching token list from Binance:", error);
        return [];
    }
};

export const fetchTicker = async (symbol) => {
    try {
        const response = await axios.get(TICKER_URL, {
            params: { symbol: symbol }
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
            symbol: symbol,
            interval: interval,
            limit: 1000 // Ensure we get enough candles
        };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;

        const response = await axios.get(KLINES_URL, { params });
        if (response.data && response.data.code === '000000') {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error(`Error fetching klines for ${symbol}:`, error);
        return [];
    }
};

// Fetch tickers with concurrency control
async function limitConcurrency(tasks, limit) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = task().then(result => {
            executing.splice(executing.indexOf(p), 1);
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
    // Calculate 7:00 AM VN (which is 00:00 UTC)
    const now = new Date();

    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();

    // Today's start (00:00 UTC today)
    const todayStart = Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0);
    // Yesterday's start (00:00 UTC yesterday)
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    // Fetch klines. We can use 1h interval.
    // We need data from yesterday 00:00 UTC to now.
    // Interval 1h is good enough approximation or 15m for better precision. 
    // Let's use 1h to save data size.
    const klines = await fetchKlines(symbol, '1h', yesterdayStart);

    let volToday = 0;
    let volYesterday = 0;

    if (klines && klines.length > 0) {
        for (const k of klines) {
            const openTime = parseInt(k[0]);
            const quoteVol = parseFloat(k[7]); // Index 7 is Quote Asset Volume

            if (openTime >= todayStart) {
                volToday += quoteVol;
            } else if (openTime >= yesterdayStart && openTime < todayStart) {
                volYesterday += quoteVol;
            }
        }
    }

    return { volToday, volYesterday };
};

export const fetchAllData = async (tokens, onProgress) => {
    const tasks = tokens.map(token => async () => {
        const symbol = `${token.alphaId}USDT`;

        // Parallel fetch ticker and volume stats
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

    const results = await limitConcurrency(tasks, 5);
    return results.filter(item => item !== null);
};
