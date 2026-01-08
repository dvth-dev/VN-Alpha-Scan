import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Eye, Activity, ArrowUpRight, ArrowDownRight, Trophy, Clock, Trash2, AlertCircle, Lock, ShieldAlert, Key, Loader2 } from 'lucide-react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import Competitions from './Competitions';
import { fetchTokenList } from '../api';

const AdminDashboard = ({ tokens = [] }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [recentCompetitions, setRecentCompetitions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedComp, setSelectedComp] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [stats, setStats] = useState([
        { label: 'Total Views', value: '45.2k', change: '+12.5%', trend: 'up', icon: <Eye size={20} className="text-blue-400" />, color: 'blue' },
        { label: 'Saved Tokens', value: '0', change: 'New', trend: 'up', icon: <Trophy size={20} className="text-emerald-400" />, color: 'emerald' },
        { label: 'Live Now', value: '0', change: '0%', trend: 'up', icon: <Activity size={20} className="text-purple-400" />, color: 'purple' },
        { label: 'System Status', value: 'Active', change: '100%', trend: 'up', icon: <TrendingUp size={20} className="text-indigo-400" />, color: 'indigo' },
    ]);
    const [allTokens, setAllTokens] = useState(tokens);
    const [dbCompetitionsMap, setDbCompetitionsMap] = useState({}); // alphaId -> competition data
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

    // Update allTokens if props change
    useEffect(() => {
        if (tokens && tokens.length > 0) {
            setAllTokens(tokens);
        }
    }, [tokens]);

    useEffect(() => {
        const auth = localStorage.getItem('admin_authenticated');
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsVerifying(true);
        try {
            const response = await axios.post('/api/verify-pass', { password });
            if (response.data.authenticated) {
                setIsAuthenticated(true);
                localStorage.setItem('admin_authenticated', 'true');
            }
        } catch (error) {
            setLoginError(error.response?.data?.message || 'Invalid password');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('admin_authenticated');
    };

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const fetchStats = async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            // 1. Fetch from Binance ONLY if not provided via props
            if (allTokens.length === 0) {
                const binanceData = await fetchTokenList();
                setAllTokens(binanceData);
            }

            // 2. Fetch from MongoDB
            const mongoRes = await axios.get('/api/competitions');
            let mongoMap = {};
            if (mongoRes.data && mongoRes.data.code === '000000') {
                mongoRes.data.data.forEach(comp => {
                    mongoMap[comp.alphaId] = comp;
                });
            }

            // 3. Merge & Update Stats
            const liveCount = Object.values(mongoMap).filter(comp => {
                const now = new Date();
                const start = new Date(comp.startTime);
                const end = new Date(comp.endTime);
                return now >= start && now <= end;
            }).length;

            setStats(prev => {
                const newStats = [...prev];
                newStats[1].value = Object.keys(mongoMap).length.toString(); // Số token đã lưu
                newStats[2].value = liveCount.toString(); // Số token đang Live
                return newStats;
            });

            // Lưu toàn bộ map để dùng chung và list hiển thị chân trang
            setDbCompetitionsMap(mongoMap);
            setRecentCompetitions(mongoRes.data.data.slice(-5).reverse());

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchStats();
        }
    }, [isAuthenticated]);

    const handleDelete = async () => {
        if (!selectedComp) return;
        try {
            setLoading(true);
            const response = await axios.delete(`/api/delete-competition?alphaId=${selectedComp.alphaId}`);
            if (response.data && response.data.code === '000000') {
                // Xóa local thay vì call API refresh
                const deletedAlphaId = selectedComp.alphaId;

                // Cập nhật recentCompetitions
                setRecentCompetitions(prev => prev.filter(c => c.alphaId !== deletedAlphaId));

                // Cập nhật dbCompetitionsMap
                setDbCompetitionsMap(prev => {
                    const next = { ...prev };
                    delete next[deletedAlphaId];
                    return next;
                });

                // Cập nhật stats
                setStats(prev => {
                    const newStats = [...prev];
                    const currentSaved = parseInt(newStats[1].value) || 0;
                    newStats[1].value = Math.max(0, currentSaved - 1).toString();
                    return newStats;
                });

                setShowDeleteConfirm(false);
                setNotification({ type: 'success', message: `Successfully deleted ${selectedComp.symbol} tournament!` });
                setSelectedComp(null);
            }
        } catch (error) {
            console.error("Delete error:", error);
            setNotification({ type: 'error', message: "Failed to delete: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    const renderDashboard = () => (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                <p className="text-slate-400 mt-2">Managing your alpha competitions and tracking data.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-[#11121a] border border-slate-800/50 p-6 rounded-2xl hover:border-indigo-500/30 transition-all group">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 group-hover:border-indigo-500/10 transition-all">
                                {stat.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {stat.change}
                                {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
                            <p className="text-2xl font-bold text-white mt-1 uppercase tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registered Tokens Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#11121a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Trophy className="text-amber-500" size={20} />
                                Recent Registered Tokens
                            </h2>
                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
                                {recentCompetitions.length} Total
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-800/20 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                                        <th className="px-6 py-4">Token</th>
                                        <th className="px-6 py-4">Timeline</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40">
                                    {recentCompetitions.length > 0 ? (
                                        recentCompetitions.map((comp) => (
                                            <tr key={comp.alphaId} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                                                            {comp.iconUrl ? (
                                                                <img src={comp.iconUrl} alt={comp.symbol} className="w-full h-full object-cover p-1" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">{comp.symbol?.slice(0, 3)}</div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white uppercase">{comp.symbol}</p>
                                                            <p className="text-[10px] text-slate-500">ID: {comp.alphaId}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            {new Date(comp.startTime).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                                            {new Date(comp.endTime).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedComp(comp);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                        title="Remove Tournament"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-slate-600 italic text-sm">
                                                No tokens registered yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="space-y-6">
                    <div className="bg-[#11121a] border border-slate-800/50 p-6 rounded-2xl">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-400" />
                            System Info
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
                                <span className="text-sm text-slate-400">DB Status</span>
                                <span className="text-sm font-semibold text-emerald-400">Connected</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
                                <span className="text-sm text-slate-400">Total Records</span>
                                <span className="text-sm font-semibold text-white">{recentCompetitions.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-slate-400">Environment</span>
                                <span className="text-sm font-semibold text-amber-400">Production</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                    <div className="bg-[#11121a] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/5">
                                <Lock className="text-indigo-400" size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-white text-center mb-2">Admin Access</h2>
                            <p className="text-slate-400 text-center text-sm mb-8">Please enter your secret password to continue.</p>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative group/input">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" size={18} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter secret password..."
                                            className="w-full bg-[#1c1d26] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    {loginError && (
                                        <div className="flex items-center gap-2 text-rose-400 text-xs mt-2 ml-1 animate-in slide-in-from-top-2">
                                            <ShieldAlert size={14} />
                                            <span>{loginError}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isVerifying}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    {isVerifying ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        "Verify Identity"
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
                                <a href="/" className="text-slate-500 hover:text-white text-sm transition-colors">Return to Homepage</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'competitions' && (
                <Competitions
                    tokens={allTokens}
                    dbCompetitions={dbCompetitionsMap}
                    refreshStats={fetchStats}
                    onDeleteLocal={(deletedAlphaId) => {
                        // Xóa khỏi recentCompetitions
                        setRecentCompetitions(prev => prev.filter(c => c.alphaId !== deletedAlphaId));

                        // Xóa khỏi dbCompetitionsMap
                        setDbCompetitionsMap(prev => {
                            const next = { ...prev };
                            delete next[deletedAlphaId];
                            return next;
                        });

                        // Cập nhật stats
                        setStats(prev => {
                            const newStats = [...prev];
                            const currentSaved = parseInt(newStats[1].value) || 0;
                            newStats[1].value = Math.max(0, currentSaved - 1).toString();
                            return newStats;
                        });
                    }}
                />
            )}
            {activeTab === 'settings' && (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                    Settings page coming soon...
                </div>
            )}

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)}></div>
                    <div className="bg-[#11121a] border border-rose-500/20 rounded-3xl w-full max-w-sm relative z-10 p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="text-rose-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Competition?</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            Are you sure you want to remove <span className="text-white font-bold">{selectedComp?.symbol}</span>?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="py-3 px-4 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="py-3 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all font-mono"
                            >
                                {loading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right-10 duration-300">
                    <div className={`${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'} border backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
                        {notification.type === 'success' ? <Trophy size={18} /> : <AlertCircle size={18} />}
                        <p className="text-sm font-bold tracking-tight">{notification.message}</p>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminDashboard;
