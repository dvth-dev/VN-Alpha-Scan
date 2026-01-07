import { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import Detail from './Detail';
import AdminDashboard from './admin/AdminDashboard';
import { fetchTokenList, fetchAllData, fetchBatchDetails } from './api';

function MainContent() {
  const [allBasicTokens, setAllBasicTokens] = useState([]); // Stores plain list of all tokens
  const [tokenDetails, setTokenDetails] = useState({}); // Stores expanded data: { [alphaId]: { ticker, volumeStats } }
  const [dbCompetitions, setDbCompetitions] = useState({}); // Stores competition data from MongoDB
  const [displayedTokens, setDisplayedTokens] = useState([]); // List to pass to Dashboard
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initProgress, setInitProgress] = useState(0);
  const [initTotal, setInitTotal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // Helper to re-calculate display list order (Internal version to avoid dependency loops)
  const sortTokens = (tokensWithDetails, compsMap) => {
    return [...tokensWithDetails].sort((a, b) => {
      const aComp = compsMap[a.alphaId];
      const bComp = compsMap[b.alphaId];
      const now = new Date();
      const aIsActive = aComp && now >= new Date(aComp.startTime) && now <= new Date(aComp.endTime);
      const bIsActive = bComp && now >= new Date(bComp.startTime) && now <= new Date(bComp.endTime);
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      const aVol = a.volumeStats?.volToday || 0;
      const bVol = b.volumeStats?.volToday || 0;
      return bVol - aVol;
    });
  };

  const getSortedDisplayList = useCallback((tokensWithDetails) => {
    return sortTokens(tokensWithDetails, dbCompetitions);
  }, [dbCompetitions]);
  const updateStore = useCallback((items) => {
    setTokenDetails(prev => {
      const next = { ...prev };
      items.forEach(item => {
        if (item) {
          next[item.alphaId] = {
            ticker: item.ticker,
            volumeStats: item.volumeStats
          };
        }
      });
      return next;
    });
    setLastUpdated(new Date());
  }, []);

  // Initial Load: List + Top 20 Details
  const initialLoad = useCallback(async () => {
    setLoadingInitial(true);
    setInitProgress(0);

    const list = await fetchTokenList();
    if (list.length === 0) {
      setLoadingInitial(false);
      return;
    }
    setAllBasicTokens(list);

    // Fetch Competitions
    let compMap = {};
    try {
      const res = await fetch('/api/competitions').then(r => r.json());
      if (res.code === '000000') {
        res.data.forEach(c => compMap[c.alphaId] = c);
        setDbCompetitions(compMap);
      }
    } catch (e) { console.error(e); }

    // If not in admin, show placeholders then batch
    if (isAdmin) {
      setLoadingInitial(false);
      return;
    }

    // Identify Competition Tokens to prioritize
    const compAlphaIds = Object.keys(compMap);
    const compTokens = list.filter(t => compAlphaIds.includes(t.alphaId));
    const nonCompTokens = list.filter(t => !compAlphaIds.includes(t.alphaId));

    // Create a prioritized list for the initial batch (Comp tokens + top Binance tokens)
    // We fetch up to 50 to be safe
    const prioritizedList = [...compTokens, ...nonCompTokens.slice(0, Math.max(0, 50 - compTokens.length))];

    // Show placeholders for the prioritized list
    setDisplayedTokens(prioritizedList.map(t => ({ ...t, _isLoading: true })));

    setInitTotal(prioritizedList.length);
    const batchStats = await fetchBatchDetails(prioritizedList);

    // Convert map to items format with competition data
    const details = Object.keys(batchStats).map(id => {
      const basic = list.find(t => t.alphaId === id);
      return {
        ...basic,
        ...batchStats[id],
        competition: compMap[id],
        _isLoading: false
      };
    });

    // Sort immediately before setting
    setDisplayedTokens(sortTokens(details, compMap));
    updateStore(details);
    setInitProgress(prioritizedList.length);
    setLoadingInitial(false);
  }, [updateStore, isAdmin]);

  // Handler search from Dashboard
  const handleSearch = useCallback(async (term) => {
    if (!term.trim()) {
      const allLoaded = Object.keys(tokenDetails).map(id => {
        const basic = allBasicTokens.find(t => t.alphaId === id);
        if (!basic) return null;
        return { ...basic, ...tokenDetails[id], competition: dbCompetitions[id] };
      }).filter(Boolean);

      setDisplayedTokens(getSortedDisplayList(allLoaded).slice(0, 50));
      return;
    }

    const lower = term.toLowerCase();
    const textMatches = allBasicTokens.filter(t =>
      t.name?.toLowerCase().includes(lower) ||
      t.symbol?.toLowerCase().includes(lower) ||
      t.alphaId?.toLowerCase().includes(lower)
    );

    const results = textMatches.slice(0, 40);
    const tempDisplay = results.map(t => ({
      ...t,
      ...(tokenDetails[t.alphaId] || { _isLoading: true }),
      competition: dbCompetitions[t.alphaId]
    }));
    setDisplayedTokens(sortTokens(tempDisplay, dbCompetitions));

    const needFetch = results.filter(t => !tokenDetails[t.alphaId]);
    if (needFetch.length > 0) {
      const batchStats = await fetchBatchDetails(needFetch);
      const details = Object.keys(batchStats).map(id => {
        const basic = allBasicTokens.find(t => t.alphaId === id);
        return {
          ...basic,
          ...batchStats[id]
        };
      });
      updateStore(details);
    }
  }, [allBasicTokens, tokenDetails, dbCompetitions, updateStore]);

  // Initial Load Trigger
  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  // Auto Refresh Logic
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (displayedTokens.length > 0 && !loadingInitial && !isAdmin) {
        const tokensToRefresh = displayedTokens.filter(t => !t._isLoading);
        if (tokensToRefresh.length === 0) return;

        const fetchedData = await fetchAllData(tokensToRefresh);
        updateStore(fetchedData);
      }
    }, 30000);
    return () => clearInterval(intervalId);
  }, [displayedTokens, loadingInitial, updateStore, isAdmin]);

  // Sync displayedTokens when tokenDetails or competitions update
  useEffect(() => {
    setDisplayedTokens(prev => {
      const next = prev.map(t => {
        if (tokenDetails[t.alphaId] && (!t.ticker || t._isLoading)) {
          return { ...t, ...tokenDetails[t.alphaId], _isLoading: false };
        }
        return { ...t, competition: dbCompetitions[t.alphaId] };
      });
      return getSortedDisplayList(next);
    });
  }, [tokenDetails, dbCompetitions, getSortedDisplayList]);

  return (
    <Routes>
      <Route path="/" element={
        <Dashboard
          tokens={displayedTokens}
          loading={loadingInitial}
          progress={initProgress}
          total={initTotal}
          lastUpdated={lastUpdated}
          onRefresh={initialLoad}
          onSearch={handleSearch}
        />
      } />
      <Route path="/token/:alphaId" element={<Detail />} />
      <Route path="/admin" element={<AdminDashboard tokens={allBasicTokens} />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <MainContent />
    </HashRouter>
  );
}

export default App;
