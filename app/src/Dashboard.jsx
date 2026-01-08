import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TokenIcon from './TokenIcon';
import { Search, Loader2, Activity, RefreshCcw } from 'lucide-react';

function Dashboard({ tokens, loading, progress, total, lastUpdated, onRefresh, onSearch }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearch) {
                onSearch(searchTerm);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const formatCurrency = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '$0.00';
        if (num < 0.01) return `$${num.toFixed(6)}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(num);
    };

    const formatVolume = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '$0';
        return `$${Math.floor(num).toLocaleString('en-US')}`;
    };

    const handleRowClick = (token) => {
        navigate(`/token/${token.alphaId}`, { state: { tokenData: token } });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                                VN - AlphaScan
                            </h1>
                            {lastUpdated && (
                                <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all backdrop-blur-xl"
                                placeholder="Tìm kiếm theo mã Alpha hoặc Tên..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 group"
                        >
                            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            <span className="hidden sm:inline">Làm mới</span>
                        </button>
                    </div>
                </header>

                {/* Table Container */}
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/50 border-b border-slate-800">
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Token</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Giá Hiện Tại</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Vol 7h - Now</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Vol Hôm Qua</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading && tokens.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                                <p className="text-slate-500 font-medium">Đang tải dữ liệu từ sàn...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    tokens.map((token, index) => {
                                        // Show tag nếu token có trong DB competitions (không cần check thời gian)
                                        const hasCompetition = !!token.competition;

                                        return (
                                            <tr
                                                key={token.alphaId || index}
                                                onClick={() => handleRowClick(token)}
                                                className={`group hover:bg-blue-500/5 cursor-pointer transition-colors ${token._isLoading ? 'opacity-50' : ''}`}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <TokenIcon
                                                            iconUrl={token.iconUrl}
                                                            symbol={token.symbol}
                                                            size="md"
                                                        />
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase">
                                                                    {token.symbol || 'N/A'}
                                                                </span>
                                                                {hasCompetition && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 tracking-tighter">
                                                                        GIẢI ĐẤU
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-tight">
                                                                {token.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 text-right font-mono">
                                                    {token._isLoading ? (
                                                        <div className="h-5 w-24 bg-slate-800 rounded animate-pulse ml-auto" />
                                                    ) : formatCurrency(token.ticker?.lastPrice)}
                                                </td>

                                                <td className="px-6 py-5 text-right font-mono text-emerald-400 font-bold">
                                                    {token._isLoading ? (
                                                        <div className="h-5 w-20 bg-slate-800 rounded animate-pulse ml-auto" />
                                                    ) : formatVolume(token.volumeStats?.volToday)}
                                                </td>

                                                <td className="px-6 py-5 text-right font-mono text-slate-400">
                                                    {token._isLoading ? (
                                                        <div className="h-5 w-20 bg-slate-800 rounded animate-pulse ml-auto" />
                                                    ) : formatVolume(token.volumeStats?.volYesterday)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!loading && tokens.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="inline-flex p-6 bg-slate-900 rounded-full text-slate-600">
                            <Activity size={48} />
                        </div>
                        <p className="text-slate-500 text-lg font-medium">Không tìm thấy dữ liệu phù hợp</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
