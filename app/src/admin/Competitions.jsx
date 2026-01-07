import React, { useState, useEffect } from 'react';
import { Trophy, Search, Loader2, Trash2, AlertCircle, X, Calendar, Clock } from 'lucide-react';
import { fetchTokenList } from '../api';
import axios from 'axios';

const Competitions = ({ tokens = [], dbCompetitions = {}, refreshStats }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedToken, setSelectedToken] = useState(null);
    const [competitionForm, setCompetitionForm] = useState({
        startDateTime: '',
        endDateTime: ''
    });

    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

    // Dữ liệu đã được fetch từ component cha AdminDashboard
    // Không cần fetch lại ở đây

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleTokenClick = (token) => {
        setSelectedToken(token);
        const existing = dbCompetitions[token.alphaId];
        if (existing) {
            const start = new Date(existing.startTime);
            const end = new Date(existing.endTime);
            const pad = (n) => n.toString().padStart(2, '0');
            const formatForInput = (date) => {
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
            };
            setCompetitionForm({
                startDateTime: formatForInput(start),
                endDateTime: formatForInput(end)
            });
        } else {
            setCompetitionForm({ startDateTime: '', endDateTime: '' });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedToken) return;
        try {
            setLoading(true);
            const response = await axios.delete(`/api/delete-competition?alphaId=${selectedToken.alphaId}`);

            if (response.data && response.data.code === '000000') {
                setShowDeleteConfirm(false);
                setIsModalOpen(false);
                setNotification({ type: 'success', message: `Deleted competition for ${selectedToken.symbol}` });

                // Cập nhật lại stats ở Dashboard cha
                if (refreshStats) refreshStats();
            }
        } catch (error) {
            console.error("Delete error:", error);
            setNotification({ type: 'error', message: "Failed to delete: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        const { startDateTime, endDateTime } = competitionForm;
        if (!startDateTime || !endDateTime) {
            alert("Please fill in both start and end date-time!");
            return;
        }

        const startTimestamp = new Date(startDateTime);
        const endTimestamp = new Date(endDateTime);

        if (endTimestamp <= startTimestamp) {
            alert("End time must be after start time!");
            return;
        }

        try {
            setLoading(true);
            const competitionData = {
                alphaId: selectedToken.alphaId,
                symbol: selectedToken.symbol,
                name: selectedToken.name,
                iconUrl: selectedToken.iconUrl || '',
                startTime: startTimestamp,
                endTime: endTimestamp,
                updatedAt: new Date()
            };

            // Determine which API to call
            const endpoint = dbCompetitions[selectedToken.alphaId]
                ? '/api/update-competition'
                : '/api/save-competition';

            const response = await axios.post(endpoint, competitionData);

            if (response.data && response.data.code === '000000') {
                setNotification({ type: 'success', message: `Successfully registered competition for ${selectedToken.symbol}!` });
                setIsModalOpen(false);
                setCompetitionForm({ startDateTime: '', endDateTime: '' });

                // Cập nhật lại stats ở Dashboard cha
                if (refreshStats) refreshStats();
            } else {
                throw new Error(response.data.message || 'Failed to save');
            }
        } catch (error) {
            console.error("Error saving competition:", error);
            setNotification({ type: 'error', message: "Failed to save competition: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    const getCompetitionStatus = (alphaId) => {
        const comp = dbCompetitions[alphaId];
        if (!comp) return { label: 'No Competition', color: 'slate' };

        const now = new Date();
        const start = comp.startTime ? new Date(comp.startTime) : null;
        const end = comp.endTime ? new Date(comp.endTime) : null;

        if (!start || !end) return { label: 'Error', color: 'rose' };

        if (now < start) return { label: 'Upcoming', color: 'blue' };
        if (now >= start && now <= end) return { label: 'Live', color: 'emerald' };
        return { label: 'Ended', color: 'rose' };
    };

    const filteredTokens = tokens.filter(t =>
        t.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        Alpha Competitions
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time Binance Alpha token listing and competition tracking.</p>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search tokens..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#11121a] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 w-full md:w-80 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 text-white"
                    />
                </div>
            </div>

            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center bg-[#11121a] border border-slate-800/50 rounded-2xl">
                    <Loader2 className="text-indigo-500 animate-spin mb-4" size={40} />
                    <p className="text-slate-400 animate-pulse">Fetching Alpha data and status...</p>
                </div>
            ) : (
                <div className="bg-[#11121a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800/20 border-b border-slate-800/50 text-slate-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-5 font-semibold">Token</th>
                                    <th className="px-6 py-5 font-semibold">ID</th>
                                    <th className="px-6 py-5 font-semibold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredTokens.length > 0 ? (
                                    filteredTokens.map((token, index) => (
                                        <tr
                                            key={token.alphaId}
                                            onClick={() => handleTokenClick(token)}
                                            className="hover:bg-indigo-500/[0.05] cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-indigo-500/50 transition-all overflow-hidden relative shadow-inner">
                                                        {token.iconUrl ? (
                                                            <img
                                                                src={token.iconUrl}
                                                                alt={token.symbol}
                                                                className="w-full h-full object-cover p-1"
                                                            />
                                                        ) : null}
                                                        <div className={`w-full h-full flex items-center justify-center bg-indigo-500/10 ${token.iconUrl ? 'hidden' : 'flex'}`}>
                                                            <span className="text-[10px] font-bold text-indigo-400">{token.symbol?.substring(0, 3)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{token.symbol}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium">{token.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 group-hover:text-slate-300">
                                                {token.alphaId}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(() => {
                                                    const status = getCompetitionStatus(token.alphaId);
                                                    return (
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${status.color}-500/10 text-${status.color}-400 border border-${status.color}-500/20`}>
                                                            {status.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-20 text-center text-slate-500 italic">
                                            No tokens matching "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Check-in Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

                    <div className="bg-[#11121a] border border-slate-800 rounded-3xl w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                    <Trophy className="text-indigo-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white uppercase tracking-tight">Create Competition</h3>
                                    <p className="text-xs text-slate-400 font-medium">{selectedToken?.symbol} - {selectedToken?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Competition Timeline</label>

                                    <div className="space-y-4">
                                        <div className="relative group/input" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <Calendar className="text-white group-focus-within/input:text-emerald-400 transition-colors" size={16} />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Start</span>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                className="bg-slate-900 border border-slate-800 rounded-2xl pl-24 pr-4 py-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all w-full cursor-pointer appearance-none"
                                                value={competitionForm.startDateTime}
                                                onChange={(e) => setCompetitionForm({ ...competitionForm, startDateTime: e.target.value })}
                                            />
                                        </div>

                                        <div className="relative group/input" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <Calendar className="text-white group-focus-within/input:text-rose-400 transition-colors" size={16} />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">End</span>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                className="bg-slate-900 border border-slate-800 rounded-2xl pl-24 pr-4 py-4 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all w-full cursor-pointer appearance-none"
                                                value={competitionForm.endDateTime}
                                                onChange={(e) => setCompetitionForm({ ...competitionForm, endDateTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl">
                                <p className="text-xs text-indigo-300 leading-relaxed">
                                    <span className="font-bold mr-1">Note:</span>
                                    This will register a new alpha competition for this token on your tracking website.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-800/10 border-t border-slate-800 flex gap-3">
                            {dbCompetitions[selectedToken?.alphaId] && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-3 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-all"
                                    title="Delete Competition"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-[2] py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                            >
                                {dbCompetitions[selectedToken?.alphaId] ? 'Update' : 'Confirm Check-in'}
                            </button>
                        </div>
                    </div>
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
                            Are you sure you want to remove <span className="text-white font-bold">{selectedToken?.symbol}</span> from the competition list? This action cannot be undone.
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
                                className="py-3 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all"
                            >
                                Yes, Delete
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
        </div>
    );
};

export default Competitions;
