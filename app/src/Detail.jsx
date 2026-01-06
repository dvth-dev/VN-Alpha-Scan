import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchTokenList, fetchTicker, getDailyVolumeStats, fetchKlines } from './api';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Clock, Calendar, Calculator } from 'lucide-react';

const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '$0.00';
    if (num < 0.0001) return `$${num.toFixed(8)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
};

const formatVolume = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatPercent = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

function Detail() {
    const { alphaId } = useParams();
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Custom Volume Calculation State
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [dailyData, setDailyData] = useState([]); // Array of { time, volume }
    const [totalCustomVolume, setTotalCustomVolume] = useState(null);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        const loadDetail = async () => {
            setLoading(true);
            try {
                // 1. Get basic info
                const list = await fetchTokenList();
                const found = list.find(t => t.alphaId === alphaId);

                if (!found) {
                    setLoading(false);
                    return;
                }

                setToken(found);

                // 2. Fetch realtime ticker & extended stats
                const symbol = `${found.alphaId}USDT`;
                const [tickerData, volStats] = await Promise.all([
                    fetchTicker(symbol),
                    getDailyVolumeStats(symbol)
                ]);

                setStats({
                    ticker: tickerData,
                    volumeStats: volStats
                });

                // Set default dates (Today)
                const now = new Date();
                const toLocalISO = (date) => {
                    // Get YYYY-MM-DD in local time
                    const offset = date.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(date - offset)).toISOString().slice(0, 10);
                    return localISOTime;
                };

                const todayStr = toLocalISO(now);
                setFromDate(todayStr); // Start from today
                setToDate(todayStr);   // To today

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (alphaId) {
            loadDetail();
        }
    }, [alphaId]);

    const handleCalculateVolume = async () => {
        if (!fromDate || !toDate || !token) return;
        setCalculating(true);
        setDailyData([]);
        setTotalCustomVolume(null);

        try {
            // Logic: Use 1d interval for daily query
            const startD = new Date(fromDate);
            const endD = new Date(toDate);

            // Start: 00:00:00
            startD.setHours(0, 0, 0, 0);
            const startTs = startD.getTime();

            // End: 23:59:59
            endD.setHours(23, 59, 59, 999);
            const endTs = endD.getTime();

            const symbol = `${token.alphaId}USDT`;

            // Fetch klines 1d
            const klines = await fetchKlines(symbol, '1d', startTs, endTs);

            let totalVol = 0;
            const dailyStats = [];

            if (klines && klines.length > 0) {
                klines.forEach(k => {
                    const openTime = parseInt(k[0]);
                    // Only take candles that started within our range
                    if (openTime >= startTs && openTime <= endTs) {
                        const quoteVol = parseFloat(k[7]);
                        totalVol += quoteVol;
                        dailyStats.push({
                            time: openTime,
                            volume: quoteVol
                        });
                    }
                });
            }

            // Sort new -> old
            dailyStats.sort((a, b) => b.time - a.time);

            setDailyData(dailyStats);
            setTotalCustomVolume(totalVol);

        } catch (error) {
            console.error(error);
            setTotalCustomVolume(0);
        } finally {
            setCalculating(false);
        }
    };

    // Find max volume for progress bar scaling
    const maxDailyVolume = dailyData.length > 0 ? Math.max(...dailyData.map(d => d.volume)) : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="text-slate-400 animate-pulse">Đang tải thông tin chi tiết...</p>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400">
                <p className="text-xl">Không tìm thấy Token hoặc Token không tồn tại.</p>
                <Link to="/" className="mt-4 text-blue-400 hover:text-blue-300">Quay lại trang chủ</Link>
            </div>
        );
    }

    const priceChange = parseFloat(stats?.ticker?.priceChangePercent || 0);
    const isPositive = priceChange >= 0;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors gap-2 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Quay lại Dashboard
                </button>

                {/* Header Section */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                    {token.symbol}
                                </h1>
                                <p className="text-slate-400 text-lg">{token.name}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <div className="text-3xl font-bold font-mono tracking-tight text-white">
                                {stats?.ticker ? formatCurrency(stats.ticker.lastPrice) : '---'}
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-sm font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {formatPercent(priceChange)} (24h)
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* High / Low */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase">24h High / Low</h3>
                            <div className="text-sm text-slate-200 font-mono">
                                H: <span className="text-emerald-400">{formatCurrency(stats?.ticker?.highPrice)}</span>
                            </div>
                            <div className="text-sm text-slate-200 font-mono">
                                L: <span className="text-rose-400">{formatCurrency(stats?.ticker?.lowPrice)}</span>
                            </div>
                        </div>

                        {/* Volume Today */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Vol Hôm nay (7h-Now)
                            </h3>
                            <div className="text-xl font-bold text-emerald-400">
                                {formatVolume(stats?.volumeStats?.volToday)}
                            </div>
                        </div>

                        {/* Volume Yesterday */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Vol Hôm qua
                            </h3>
                            <div className="text-lg font-semibold text-slate-400">
                                {formatVolume(stats?.volumeStats?.volYesterday)}
                            </div>
                        </div>

                        {/* Trades Count */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase">Số lượng giao dịch</h3>
                            <div className="text-lg font-semibold text-slate-300 font-mono">
                                {new Intl.NumberFormat('en-US').format(stats?.ticker?.count || 0)}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Custom Volume Calculator */}
                <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-700/50 space-y-8 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 shadow-inner">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Tra cứu Volume Lịch sử</h3>
                            <p className="text-sm text-slate-400">Xem bảng phân tích volume theo từng ngày</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center bg-slate-900/40 p-2 rounded-2xl border border-slate-800/50">

                        {/* From Date */}
                        <div className="md:col-span-3 relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                <Calendar className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full bg-slate-800/50 hover:bg-slate-800 border-0 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all font-medium appearance-none cursor-pointer"
                            />
                            <div className="absolute -top-2.5 left-4 bg-slate-900 px-2 text-[10px] font-bold text-blue-400 tracking-wider uppercase rounded">Từ ngày</div>
                        </div>

                        <div className="hidden md:flex justify-center text-slate-600">
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                        </div>

                        {/* To Date */}
                        <div className="md:col-span-3 relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                <Calendar className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full bg-slate-800/50 hover:bg-slate-800 border-0 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all font-medium appearance-none cursor-pointer"
                            />
                            <div className="absolute -top-2.5 left-4 bg-slate-900 px-2 text-[10px] font-bold text-blue-400 tracking-wider uppercase rounded">Đến ngày</div>
                        </div>
                    </div>

                    <button
                        onClick={handleCalculateVolume}
                        disabled={calculating || !fromDate || !toDate}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                    >
                        {calculating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Đang xử lý dữ liệu...
                            </>
                        ) : (
                            'Tra cứu ngay'
                        )}
                    </button>

                    {/* Result Display: Table Only */}
                    {totalCustomVolume !== null && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Daily Table */}
                            <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700/50">
                                            <th className="p-4">Ngày</th>
                                            <th className="p-4 text-right">Volume</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {dailyData.map((day, idx) => {
                                            return (
                                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 text-sm font-medium text-slate-200">
                                                        {new Date(day.time).toLocaleDateString('vi-VN', {
                                                            weekday: 'short',
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="p-4 text-right text-sm font-bold text-emerald-400 font-mono">
                                                        {formatVolume(day.volume)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {dailyData.length === 0 && (
                                            <tr>
                                                <td colSpan="2" className="p-8 text-center text-slate-500">
                                                    Không có dữ liệu volume trong khoảng này.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default Detail;
