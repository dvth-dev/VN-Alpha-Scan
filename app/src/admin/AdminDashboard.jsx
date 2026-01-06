import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Eye, Activity, ArrowUpRight, ArrowDownRight, Trophy, Clock, Trash2, AlertCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import Competitions from './Competitions';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

const AdminDashboard = () => {
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

    const fetchStats = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "competitions"), orderBy("updatedAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setRecentCompetitions(data);

            const now = new Date();
            const liveCount = data.filter(c => {
                const start = c.startTime.toDate();
                const end = c.endTime.toDate();
                return now >= start && now <= end;
            }).length;

            setStats(prev => {
                const newStats = [...prev];
                newStats[1].value = data.length.toString();
                newStats[2].value = liveCount.toString();
                return newStats;
            });
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab]);

    const handleDelete = async () => {
        if (!selectedComp) return;
        try {
            setLoading(true);
            await deleteDoc(doc(db, "competitions", selectedComp.id));
            setShowDeleteConfirm(false);
            setSelectedComp(null);
            fetchStats();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete competition.");
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
                {/* Real Data Table */}
                <div className="lg:col-span-2 bg-[#11121a] border border-slate-800/50 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                    <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-800/10">
                        <h2 className="text-lg font-bold text-white">Saved Competitions</h2>
                        <button onClick={() => setActiveTab('competitions')} className="text-indigo-400 text-sm font-medium hover:underline">Add New</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800/50 text-slate-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold text-[10px]">Token</th>
                                    <th className="px-6 py-4 font-semibold text-[10px]">Start Date</th>
                                    <th className="px-6 py-4 font-semibold text-[10px]">End Date</th>
                                    <th className="px-6 py-4 font-semibold text-right text-[10px]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {recentCompetitions.length > 0 ? (
                                    recentCompetitions.map((comp) => {
                                        const now = new Date();
                                        const start = comp.startTime.toDate();
                                        const end = comp.endTime.toDate();
                                        let status = { label: 'Upcoming', color: 'blue' };
                                        if (now >= start && now <= end) status = { label: 'Live', color: 'emerald' };
                                        else if (now > end) status = { label: 'Ended', color: 'rose' };

                                        return (
                                            <tr
                                                key={comp.id}
                                                onClick={() => { setSelectedComp(comp); setShowDeleteConfirm(true); }}
                                                className="hover:bg-rose-500/5 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-rose-500/30">
                                                            {comp.iconUrl ? <img src={comp.iconUrl} className="p-1" /> : <span className="text-[10px]">{comp.symbol.substring(0, 2)}</span>}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-rose-400">{comp.symbol}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium">{comp.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400">
                                                    {start.toLocaleDateString()} <span className="text-slate-600 block">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400">
                                                    {end.toLocaleDateString()} <span className="text-slate-600 block">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-${status.color}-500/10 text-${status.color}-400 border border-${status.color}-500/20`}>
                                                            {status.label}
                                                        </span>
                                                        <Trash2 size={16} className="text-slate-600 group-hover:text-rose-500 transition-colors" />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm">No competitions found. Add one in the Competitions tab.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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

    return (
        <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'competitions' && <Competitions />}
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
        </AdminLayout>
    );
};

export default AdminDashboard;
