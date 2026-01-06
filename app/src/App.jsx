import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Detail from './Detail';
import { fetchTokenList, fetchAllData } from './api';

function App() {
  const [allBasicTokens, setAllBasicTokens] = useState([]); // Stores plain list of all tokens
  const [tokenDetails, setTokenDetails] = useState({}); // Stores expanded data: { [alphaId]: { ticker, volumeStats } }

  const [displayedTokens, setDisplayedTokens] = useState([]); // List to pass to Dashboard
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Progress tracking for initial load
  const [initProgress, setInitProgress] = useState(0);
  const [initTotal, setInitTotal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Helper to update store
  const updateStore = (items) => {
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
  };

  // Initial Load: List + Top 20 Details
  const initialLoad = async () => {
    setLoadingInitial(true);
    setInitProgress(0);

    // 1. Fetch Full List
    const list = await fetchTokenList();
    if (list.length === 0) {
      setLoadingInitial(false);
      return;
    }
    setAllBasicTokens(list);
    setInitTotal(20); // Focus on first 20

    // 2. Fetch Details for Top 20 (as default view)
    const initialBatch = list.slice(0, 25); // Fetch a few more to be safe
    let completed = 0;

    const details = await fetchAllData(initialBatch, () => {
      completed++;
      if (completed <= 20) setInitProgress(completed);
    });

    updateStore(details);
    setLoadingInitial(false);
  };

  useEffect(() => {
    initialLoad();
  }, []);

  // Auto Refresh Logic: Refresh displayed tokens every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (displayedTokens.length > 0 && !loadingInitial) {
        const tokensToRefresh = displayedTokens.filter(t => !t._isLoading);
        if (tokensToRefresh.length === 0) return;

        // Silent fetch
        const fetchedData = await fetchAllData(tokensToRefresh); // No progress callback needed for background sync
        updateStore(fetchedData);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [displayedTokens, loadingInitial]);


  // Handler search from Dashboard
  const handleSearch = async (term) => {
    // 1. Filter from basic list
    if (!term.trim()) {
      // If empty, show top 20 (sorted by volume from what we have)
      const allLoaded = Object.keys(tokenDetails).map(id => {
        const basic = allBasicTokens.find(t => t.alphaId === id);
        if (!basic) return null;
        return { ...basic, ...tokenDetails[id] };
      }).filter(Boolean);

      const sorted = allLoaded.sort((a, b) => b.volumeStats.volToday - a.volumeStats.volToday).slice(0, 20);
      setDisplayedTokens(sorted);
      return;
    }

    const lower = term.toLowerCase();
    const textMatches = allBasicTokens.filter(t =>
      t.name?.toLowerCase().includes(lower) ||
      t.symbol?.toLowerCase().includes(lower) ||
      t.alphaId?.toLowerCase().includes(lower)
    );

    // Limit results to 20 for performance
    const results = textMatches.slice(0, 20);

    // 2. Identify which ones need fetching
    const needFetch = results.filter(t => !tokenDetails[t.alphaId]);

    // Update display immediately with what we have
    const tempDisplay = results.map(t => {
      if (tokenDetails[t.alphaId]) {
        return { ...t, ...tokenDetails[t.alphaId] };
      }
      return { ...t, _isLoading: true };
    });
    setDisplayedTokens(tempDisplay);

    if (needFetch.length > 0) {
      // 3. Fetch missing details in background
      const fetchedData = await fetchAllData(needFetch);
      updateStore(fetchedData);
    }
  };

  // React to tokenDetails update to refresh display if we are searching or viewing
  useEffect(() => {
    setDisplayedTokens(prev => {
      return prev.map(t => {
        // Update if we have new details for this token
        if (tokenDetails[t.alphaId]) {
          return { ...t, ...tokenDetails[t.alphaId], _isLoading: false };
        }
        return t;
      });
    });
  }, [tokenDetails]);

  // Initial set for displayedTokens after first load
  useEffect(() => {
    if (!loadingInitial && allBasicTokens.length > 0 && displayedTokens.length === 0) {
      // Default view: Top loaded sorted by volume
      const allLoaded = Object.keys(tokenDetails).map(id => {
        const basic = allBasicTokens.find(t => t.alphaId === id);
        if (!basic) return null;
        return { ...basic, ...tokenDetails[id] };
      }).filter(Boolean);

      const sorted = allLoaded.sort((a, b) => b.volumeStats.volToday - a.volumeStats.volToday).slice(0, 20);
      setDisplayedTokens(sorted);
    }
  }, [loadingInitial, allBasicTokens, tokenDetails]);


  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
