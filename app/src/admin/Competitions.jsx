import React, { useState, useEffect } from 'react';
import { Trophy, Search, Loader2, Trash2, AlertCircle, X, Calendar, Clock } from 'lucide-react';
import { fetchTokenList } from '../api';
import { db } from '../firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

const Competitions = () => {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbCompetitions, setDbCompetitions] = useState({}); // Map of alphaId -> competition data

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedToken, setSelectedToken] = useState(null);
    const [competitionForm, setCompetitionForm] = useState({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: ''
    });

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                // 1. Load from Firestore
                const querySnapshot = await getDocs(collection(db, "competitions"));
                const compMap = {};
                querySnapshot.forEach((doc) => {
                    compMap[doc.id] = doc.data();
                });
                setDbCompetitions(compMap);

                // 2. Load from Binance
                const data = await fetchTokenList();
                setTokens(data);
            } catch (error) {
                console.error("Error loading data:", error);
            }
            setLoading(false);
        };
        loadAllData();
    }, []);

    const handleTokenClick = (token) => {
        setSelectedToken(token);
        const existing = dbCompetitions[token.alphaId];
        if (existing) {
            const start = existing.startTime.toDate();
            const end = existing.endTime.toDate();
            const pad = (n) => n.toString().padStart(2, '0');
            setCompetitionForm({
                startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
                startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
                endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
                endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`
            });
        } else {
            setCompetitionForm({ startDate: '', startTime: '', endDate: '', endTime: '' });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedToken) return;
        try {
            setLoading(true);
            await deleteDoc(doc(db, "competitions", selectedToken.alphaId));

            setDbCompetitions(prev => {
                const next = { ...prev };
                delete next[selectedToken.alphaId];
                return next;
            });

            setShowDeleteConfirm(false);
            setIsModalOpen(false);
            alert(`Deleted competition for ${selectedToken.symbol}`);
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        const { startDate, startTime, endDate, endTime } = competitionForm;
        if (!startDate || !startTime || !endDate || !endTime) {
            alert("Please fill in all date and time fields!");
            return;
        }

        const startTimestamp = new Date(`${startDate}T${startTime}`);
        const endTimestamp = new Date(`${endDate}T${endTime}`);

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
                startTime: Timestamp.fromDate(startTimestamp),
                endTime: Timestamp.fromDate(endTimestamp),
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, "competitions", selectedToken.alphaId), competitionData);

            setDbCompetitions(prev => ({
                ...prev,
                [selectedToken.alphaId]: competitionData
            }));

            alert(`Successfully registered competition for ${selectedToken.symbol}!`);
            setIsModalOpen(false);
            setCompetitionForm({ startDate: '', startTime: '', endDate: '', endTime: '' });
        } catch (error) {
            console.error("Error saving to Firebase:", error);
            alert("Failed to save competition. Please check your Firebase rules.");
        } finally {
            setLoading(false);
        }
    };

    const getCompetitionStatus = (alphaId) => {
        const comp = dbCompetitions[alphaId];
        if (!comp) return { label: 'No Competition', color: 'slate' };

        const now = new Date();
        const start = comp.startTime?.toDate();
        const end = comp.endTime?.toDate();

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
                    <p className="text-slate-400 animate-pulse">Fetching Alpha data from Binance...</p>
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
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Start Date & Time</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative group/input" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white group-focus-within/input:text-indigo-400 pointer-events-none" size={16} />
                                            <input
                                                type="date"
                                                className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all w-full cursor-pointer appearance-none"
                                                value={competitionForm.startDate}
                                                onChange={(e) => setCompetitionForm({ ...competitionForm, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="relative group/input" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-white group-focus-within/input:text-indigo-400 pointer-events-none" size={16} />
                                            <input
                                                type="time"
                                                className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all w-full cursor-pointer appearance-none"
                                                value={competitionForm.startTime}
                                                onChange={(e) => setCompetitionForm({ ...competitionForm, startTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">End Date & Time</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative group/input" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white group-focus-within/input:text-indigo-400 pointer-events-none" size={16} />
                                            <input
                                                type="date"
                                                className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all w-full cursor-pointer appearance-none"
                                                value={competitionForm.endDate}
                                                onChange={(e) => setCompetitionForm({ ...competitionForm, endDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="relative group/input" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-white group-focus-within/input:text-indigo-400 pointer-events-none" size={16} />
                                            <input
                                                type="time"
                                                className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all w-full cursor-pointer appearance-none"
                                                value={competitionForm.endTime}
                                                onChange={(e) => setCompetitionForm({ ...competitionForm, endTime: e.target.value })}
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
        </div>
    );
};

export default Competitions;
