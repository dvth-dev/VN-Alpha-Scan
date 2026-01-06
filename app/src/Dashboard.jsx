import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TokenIcon from './TokenIcon';
import { Search, Activity } from 'lucide-react';

function Dashboard({ tokens, loading, progress, total, lastUpdated, onRefresh, onSearch }) {
    if (tokens && tokens.length > 0) console.log('First Token Data:', tokens[0]);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearch) {
                onSearch(searchTerm);
            }
        }, 300); // 300ms debounce
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
        if (isNaN(num)) return '$0.00';
        if (num >= 1000000) {
            return `$${(num / 1000000).toFixed(2)}M`;
        } else if (num >= 1000) {
            return `$${(num / 1000).toFixed(2)}K`;
        }
        return `$${num.toFixed(2)}`;
    };

    const handleCardClick = (token) => {
        navigate(`/token/${token.alphaId}`);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-800 rounded-xl shadow-lg shadow-blue-900/10 border border-slate-700/50">
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                                VN - AlphaScan
                            </h1>
                            {lastUpdated &&
                                <p className="text-sm text-slate-500 mt-1">
                                    Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
                                </p>
                            }
                        </div>
                    </div>

                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-4 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Tìm kiếm Token"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <div className="h-7 w-48 bg-slate-800 rounded animate-pulse"></div>
                        </div>

                        {/* Skeleton Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(12)].map((_, i) => (

                                <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 space-y-4 animate-pulse">
                                    {/* Header Skeleton */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="space-y-2">
                                                <div className="h-4 w-16 bg-slate-700 rounded"></div>
                                                <div className="h-3 w-24 bg-slate-700 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="h-5 w-8 bg-slate-700 rounded"></div>
                                    </div>

                                    {/* Price Skeleton */}
                                    <div className="space-y-2 mb-4">
                                        <div className="h-3 w-16 bg-slate-700 rounded"></div>
                                        <div className="h-6 w-32 bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>


                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-slate-300">
                                    {searchTerm ? `Kết quả tìm kiếm` : `Top 20 Volume`}
                                </h2>
                                {loading && <span className="text-sm text-slate-500 animate-pulse">(Đang cập nhật...)</span>}
                            </div>
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                            >
                                {loading ? 'Đang tải...' : 'Làm mới'}
                            </button>
                        </div>

                        {/* Token Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {tokens.map((token, index) => {
                                const isLoading = token._isLoading;

                                if (isLoading) {
                                    return (
                                        <div key={token.alphaId || index} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 space-y-4 animate-pulse">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="h-5 w-16 bg-slate-600 rounded mb-1"></div>
                                                    <div className="h-3 w-24 bg-slate-700 rounded"></div>
                                                </div>
                                                <div className="h-6 w-8 bg-slate-700 rounded"></div>
                                            </div>
                                            <div className="h-8 w-32 bg-slate-700 rounded mt-4"></div>
                                            <div className="h-4 w-20 bg-slate-700 rounded mt-2"></div>
                                        </div>
                                    );
                                }

                                const volToday = token.volumeStats?.volToday || 0;
                                const volYesterday = token.volumeStats?.volYesterday || 0;

                                return (
                                    <div
                                        key={token.alphaId || index}
                                        onClick={() => handleCardClick(token)}
                                        className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 hover:border-blue-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/20 group cursor-pointer"
                                    >
                                        {/* Header: Rank + Symbol */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <TokenIcon
                                                    iconUrl={token.iconUrl}
                                                    symbol={token.symbol}
                                                    size="md"
                                                    className="p-0.5"
                                                />
                                                <div>
                                                    <div className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                                                        {token.symbol || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {token.name || 'Unknown'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                                                #{index + 1}
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-4">
                                            <div className="text-xs text-slate-500 mb-1">Giá hiện tại</div>
                                            <div className="text-lg font-bold text-white">
                                                {formatCurrency(token.ticker?.lastPrice)}
                                            </div>
                                        </div>

                                        {/* Volume Stats */}
                                        <div className="space-y-3 border-t border-slate-700/50 pt-3">

                                            {/* Volume Today */}
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-slate-500">Volume Từ 7h00 đến Now</div>
                                                <div className="text-sm font-bold text-emerald-400">
                                                    {formatVolume(volToday)}
                                                </div>
                                            </div>

                                            {/* Volume Yesterday */}
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-slate-500">Volume Hôm qua</div>
                                                <div className="text-sm font-semibold text-slate-400">
                                                    {formatVolume(volYesterday)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {tokens.length === 0 && !loading && (
                            <div className="text-center py-12">
                                <p className="text-slate-400">Không tìm thấy token nào</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
