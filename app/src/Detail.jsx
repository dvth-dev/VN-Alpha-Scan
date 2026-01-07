import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchTokenList, fetchTicker, getDailyVolumeStats, fetchKlines } from './api';
import TokenIcon from './TokenIcon';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Clock, Calendar, Calculator, Trophy, Target, Users } from 'lucide-react';

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
    const location = useLocation();
    const passedData = location.state?.tokenData;

    const [token, setToken] = useState(passedData || null);
    const [competition, setCompetition] = useState(passedData?.competition || null);
    const [stats, setStats] = useState(passedData ? {
        ticker: passedData.ticker,
        volumeStats: passedData.volumeStats
    } : null);
    const [loading, setLoading] = useState(!passedData);

    // Custom Volume Calculation State
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [dailyData, setDailyData] = useState([]); // Array of { time, volume }
    const [totalCustomVolume, setTotalCustomVolume] = useState(null);
    const [calculating, setCalculating] = useState(false);

    const [compDailyData, setCompDailyData] = useState([]);
    const [compTotalVol, setCompTotalVol] = useState(0);
    const [compLoading, setCompLoading] = useState(false);

    // Prediction State
    const [topRank, setTopRank] = useState(500);
    const [prediction, setPrediction] = useState(null);

    // Update topRank when competition data loads
    useEffect(() => {
        if (competition && competition.winningSpots) {
            setTopRank(competition.winningSpots);
        }
    }, [competition]);

    useEffect(() => {
        if (compTotalVol > 0 && compDailyData.length > 0 && competition) {
            const oneDay = 24 * 60 * 60 * 1000;
            const totalDuration = Math.max(1, Math.ceil((new Date(competition.endTime) - new Date(competition.startTime)) / oneDay));

            // Số ngày thực tế đã chạy có dữ liệu (Days Elapsed)
            const daysRun = Math.max(1, compDailyData.length);

            // Volume trung bình/ngày thực tế
            const avgVol = compTotalVol / daysRun;

            // Dự phóng đến cuối giải
            // Nếu competition chưa kết thúc, cộng thêm volume dự kiến của các ngày còn lại
            // Nếu time hiện tại > endTime, coi như đã kết thúc, projected = actual
            const isEnded = new Date() > new Date(competition.endTime);
            let projectedTotal = compTotalVol;

            if (!isEnded && daysRun < totalDuration) {
                const daysRemaining = totalDuration - daysRun;
                projectedTotal += (avgVol * daysRemaining);
            }

            // Pareto Logic: Top group (assume defined by topRank) holds ~80% of volume (or adjusted ratio)
            // Tuy nhiên, Top Rank Count là con số cụ thể, ko phải % user. 
            // Giả định: Nhóm thắng cuộc (Winners Pool) nắm 80% Volume.
            const winnersPool = projectedTotal * 0.8;

            // Average per winner - sử dụng topRank từ competition.winningSpots
            const avgPerWinner = winnersPool / Math.max(1, topRank);

            // Dùng hệ số trượt (Tail Ratio) để tính Cutoff
            // Min (Dễ thở): 0.25 * Avg
            // Max (An toàn): 0.4 * Avg
            const minEst = avgPerWinner * 0.25;
            const maxEst = avgPerWinner * 0.4;

            setPrediction({ min: minEst, max: maxEst, projectedTotal });
        }
    }, [compTotalVol, compDailyData, competition, topRank]);

    useEffect(() => {
        const loadDetail = async () => {
            if (passedData) {
                // Pre-populate dates even if we have data
                const now = new Date();
                const toLocalISO = (d) => {
                    const offset = d.getTimezoneOffset() * 60000;
                    return (new Date(d - offset)).toISOString().slice(0, 10);
                };
                const todayStr = toLocalISO(now);
                setFromDate(todayStr);
                setToDate(todayStr);
                return;
            }

            setLoading(true);
            try {
                // 1. Get basic info & Competition if missing
                const [list, compRes] = await Promise.all([
                    fetchTokenList(),
                    fetch('/api/competitions').then(r => r.json())
                ]);

                const found = list.find(t => t.alphaId === alphaId);
                if (!found) {
                    setLoading(false);
                    return;
                }
                setToken(found);

                if (compRes.code === '000000') {
                    const foundComp = compRes.data.find(c => c.alphaId === alphaId);
                    if (foundComp) setCompetition(foundComp);
                }

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
                const toLocalISO = (d) => {
                    const offset = d.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(d - offset)).toISOString().slice(0, 10);
                    return localISOTime;
                };

                const todayStr = toLocalISO(now);
                setFromDate(todayStr);
                setToDate(todayStr);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (alphaId) {
            loadDetail();
        }
    }, [alphaId, passedData]);

    // Fetch Competition Volume automatically
    useEffect(() => {
        if (competition && token) {
            const fetchCompVolume = async () => {
                setCompLoading(true);
                try {
                    const startTs = new Date(competition.startTime).getTime();
                    const endTs = new Date(competition.endTime).getTime();
                    const symbol = `${token.alphaId}USDT`;

                    const klines = await fetchKlines(symbol, '1d', startTs, endTs);

                    let total = 0;
                    const stats = [];
                    if (klines && Array.isArray(klines)) {
                        klines.forEach(k => {
                            const t = parseInt(k[0]);
                            // Ensure we only count correctly if needed, but fetchKlines usually filters well
                            const v = parseFloat(k[7]);
                            total += v;
                            stats.push({ time: t, volume: v });
                        });
                    }
                    stats.sort((a, b) => b.time - a.time);
                    setCompDailyData(stats);
                    setCompTotalVol(total);
                } catch (err) {
                    console.error("Error fetching competition volume:", err);
                } finally {
                    setCompLoading(false);
                }
            };
            fetchCompVolume();
        }
    }, [competition, token]);

    const handleCalculateVolume = async () => {
        if (!fromDate || !toDate || !token) return;
        setCalculating(true);
        setDailyData([]);
        setTotalCustomVolume(null);

        try {
            const startD = new Date(fromDate);
            const endD = new Date(toDate);
            startD.setHours(0, 0, 0, 0);
            const startTs = startD.getTime();
            endD.setHours(23, 59, 59, 999);
            const endTs = endD.getTime();

            const symbol = `${token.alphaId}USDT`;
            const klines = await fetchKlines(symbol, '1d', startTs, endTs);

            let totalVol = 0;
            const dailyStats = [];

            if (klines && klines.length > 0) {
                klines.forEach(k => {
                    const openTime = parseInt(k[0]);
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
                            <TokenIcon
                                iconUrl={token.iconUrl}
                                symbol={token.symbol}
                                size="lg"
                                className="p-1 shadow-2xl shadow-blue-500/10"
                            />
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                    {token.symbol}
                                    {competition && (
                                        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-black text-amber-500 tracking-widest uppercase">
                                            Giải đấu
                                        </span>
                                    )}
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

                    <div className="mt-8 pt-6 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Vol Hôm nay (7h-Now)
                            </h3>
                            <div className="text-xl font-bold text-emerald-400">
                                {formatVolume(stats?.volumeStats?.volToday)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Vol Hôm qua
                            </h3>
                            <div className="text-lg font-semibold text-slate-400">
                                {formatVolume(stats?.volumeStats?.volYesterday)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-medium text-slate-500 uppercase">Số lượng giao dịch</h3>
                            <div className="text-lg font-semibold text-slate-300 font-mono">
                                {new Intl.NumberFormat('en-US').format(stats?.ticker?.count || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Competition Schedule Banner */}
                {competition && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 shadow-xl shadow-amber-900/5">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-500 shadow-inner">
                                <Trophy className="w-8 h-8" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-xl font-black text-amber-500 tracking-tight uppercase">Thông tin Giải đấu</h3>
                                    <p className="text-sm text-amber-500/60 font-medium">Lưu ý: Volume tính trong khoảng thời gian này</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-900/40 p-4 rounded-xl border border-amber-500/10">
                                        <div className="text-[10px] font-bold text-amber-500/40 uppercase tracking-widest mb-1">Thời gian bắt đầu</div>
                                        <div className="text-lg font-mono font-bold text-slate-200">
                                            {new Date(competition.startTime).toLocaleString('vi-VN', {
                                                year: 'numeric', month: '2-digit', day: '2-digit',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/40 p-4 rounded-xl border border-amber-500/10">
                                        <div className="text-[10px] font-bold text-amber-500/40 uppercase tracking-widest mb-1">Thời gian kết thúc</div>
                                        <div className="text-lg font-mono font-bold text-slate-200">
                                            {new Date(competition.endTime).toLocaleString('vi-VN', {
                                                year: 'numeric', month: '2-digit', day: '2-digit',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Competition Volume Stats */}
                                {(compLoading || compDailyData.length > 0) && (
                                    <div className="mt-6 pt-6 border-t border-amber-500/10 animate-in fade-in slide-in-from-bottom-2">
                                        <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            Thống kê Volume giải đấu
                                        </h4>

                                        {compLoading ? (
                                            <div className="bg-slate-900/40 rounded-xl border border-amber-500/10 p-8 flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                                                <p className="text-xs text-amber-500/50 uppercase tracking-wider font-bold animate-pulse">Đang tải dữ liệu...</p>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-900/40 rounded-xl border border-amber-500/10 overflow-hidden">
                                                <div className="grid grid-cols-2 gap-4 p-4 border-b border-amber-500/10 bg-amber-500/5">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest">Tổng Volume</div>
                                                        <div className="text-xl font-mono font-bold text-amber-400">
                                                            {formatVolume(compTotalVol)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest">Tiến độ (Ngày)</div>
                                                        <div className="text-xl font-mono font-bold text-amber-400">
                                                            {compDailyData.length}/{Math.ceil((new Date(competition.endTime) - new Date(competition.startTime)) / (1000 * 60 * 60 * 24))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                    <table className="w-full text-left">
                                                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                                                            <tr className="text-[10px] uppercase text-amber-500/50 font-bold border-b border-amber-500/5">
                                                                <th className="p-3 pl-4">Thời gian</th>
                                                                <th className="p-3 pr-4 text-right">Volume</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-amber-500/5">
                                                            {compDailyData.map((d, i) => (
                                                                <tr key={i} className="hover:bg-amber-500/5 transition-colors">
                                                                    <td className="p-3 pl-4 text-xs font-mono text-amber-200/80">
                                                                        {new Date(d.time).toLocaleDateString('vi-VN', {
                                                                            weekday: 'short',
                                                                            year: 'numeric',
                                                                            month: '2-digit',
                                                                            day: '2-digit'
                                                                        })}
                                                                    </td>
                                                                    <td className="p-3 pr-4 text-right text-xs font-mono font-bold text-amber-400">
                                                                        {formatVolume(d.volume)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Prediction Section */}
                                {prediction && (
                                    <div className="mt-4 pt-4 border-t border-amber-500/10 animate-in fade-in slide-in-from-bottom-3">
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Dự tính Volume lọt Top: {topRank}
                                            </h4>
                                        </div>

                                        <div className="bg-gradient-to-r from-slate-900/60 to-slate-800/60 rounded-xl border border-amber-500/10 p-4 grid grid-cols-2 gap-6 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>

                                            <div className="relative z-10">
                                                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Cạnh tranh thấp</div>
                                                <div className="text-lg font-mono font-bold text-slate-300">
                                                    {formatVolume(prediction.min)}
                                                </div>
                                            </div>

                                            <div className="relative z-10 text-right">
                                                <div className="text-[10px] uppercase text-amber-500 font-bold tracking-widest mb-1">Mức an toàn</div>
                                                <div className="text-2xl font-mono font-black text-amber-400 drop-shadow-sm">
                                                    {formatVolume(prediction.max)}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
                        <div className="md:col-span-3 relative group" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}>
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

                        <div className="md:col-span-3 relative group" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}>
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

                    {totalCustomVolume !== null && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700/50">
                                            <th className="p-4">Ngày</th>
                                            <th className="p-4 text-right">Volume</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {dailyData.map((day, idx) => (
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
                                        ))}
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
