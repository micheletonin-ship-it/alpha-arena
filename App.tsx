
import React, { useState, useEffect, useRef, ErrorInfo } from 'react'; // Import ErrorInfo
import { Layout } from './components/Layout';
import { StockCard } from './components/StockCard';
import { Portfolio } from './components/Portfolio';
import { Settings } from './components/Settings';
import { Strategies } from './components/Strategies';
import { AgentMonitor } from './components/AgentMonitor'; 
import { Scanner } from './Scanner'; 
import { ChatBot } from './components/ChatBot';
import { Login } from './components/Login';
import { Welcome } from './components/Welcome';
import { LandingMobile } from './components/LandingMobile';
import { TradeModal } from './components/TradeModal';
import { Activity } from './components/Activity';
import { Statistics } from './components/Statistics';
import { Championships } from './components/Championships';
import { AdminPanel } from './components/AdminPanel';
import * as marketService from './services/marketService';
import { fetchMarketData, scanMarketOpportunities } from './services/marketService';
import { initCloud } from './services/cloud';
import { analyzeHolding } from './services/tradingAgent';
import *as db from './services/database';
import { Stock, Theme, Source, Holding, User, Transaction, Strategy, ScanResult, ScanReport, Championship } from './types';
// Fix: Imported Trophy and Shield icons from lucide-react
import { RefreshCw, Search, Bot, Zap, ExternalLink, Trophy, Shield } from 'lucide-react';
import { APP_CREDENTIALS } from './credentials.config';

// NEW: Trading Limits Constants
const MAX_TRADE_AMOUNT = 10000; // $10,000 per trade

// NEW: Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-red-400 p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Oops! Si è verificato un errore.</h1>
          <p className="text-lg mb-4">Qualcosa è andato storto. Prova a ricaricare la pagina.</p>
          <details className="text-sm text-red-200 bg-red-800/20 p-4 rounded-lg overflow-auto max-w-lg">
            <summary className="cursor-pointer">Dettagli dell'errore</summary>
            <pre className="mt-2 text-left whitespace-pre-wrap">
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Mobile Landing State
  const [mobileView, setMobileView] = useState<'landing' | 'login' | 'signup'>('landing');
  const [isMobile, setIsMobile] = useState(false);
  
  // Championship State
  const [currentChampionshipId, setCurrentChampionshipId] = useState<string | undefined>(undefined); // UPDATED: undefined if no championship
  const [currentChampionshipName, setCurrentChampionshipName] = useState<string | undefined>(undefined); // UPDATED: undefined if no championship
  const [currentChampionshipStartingCash, setCurrentChampionshipStartingCash] = useState<number | undefined>(undefined); // UPDATED: undefined if no championship

  // Data State
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // State for transactions (used by Activity, Statistics)
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('portfolio');
  const [dataProvider, setDataProvider] = useState<'Alpaca' | 'Google' | 'Mock'>('Mock');

  // Strategy & Scan State
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null);
  // Scanner-specific states
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanSource, setScanSource] = useState<'AI' | 'Heuristic' | null>('Heuristic'); // Default to Heuristic
  const [scanAiErrorMessage, setScanAiErrorMessage] = useState<string | null>(null);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(Date.now()); // Default to now
  const [isScanning, setIsScanning] = useState(false); // Flag for live scan process
  
  // Search & Watched Symbols
  const [searchQuery, setSearchQuery] = useState('');
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>([]);

  // Trade State (Global)
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedStock, setSelectedStock] = useState<Stock | Holding | null>(null);
  const [tradeDefaultStrategyId, setTradeDefaultStrategyId] = useState<string | undefined>(undefined);
  
  // Financial State
  const [buyingPower, setBuyingPower] = useState<number>(0); // User's available buying power
  // totalEquity will now always be calculated internally, as Alpaca account data is not fetched.
  const [totalEquity, setTotalEquity] = useState<number | undefined>(undefined); // Placeholder, will be calculated from internal holdings
  const [dailyBuyCount, setDailyBuyCount] = useState<number>(0); // NEW: Track daily buy transactions

  // Refs for Interval Access (Fixes Infinite Loop)
  const holdingsRef = useRef(holdings);
  const watchedSymbolsRef = useRef(watchedSymbols);
  const isFetchingRef = useRef(false);
  const isScanningGlobalRef = useRef(false); // To prevent multiple simultaneous global background scans
  const currentUserRef = useRef(currentUser); // NEW: Ref for currentUser
  const currentChampionshipIdRef = useRef(currentChampionshipId); // NEW: Ref for currentChampionshipId

  // Sync refs with state
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { watchedSymbolsRef.current = watchedSymbols; }, [watchedSymbols]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]); // NEW
  useEffect(() => { currentChampionshipIdRef.current = currentChampionshipId; }, [currentChampionshipId]); // NEW

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize simulated DB & Auto-Login
  useEffect(() => {
    const initApp = async () => {
        setIsLoadingAuth(true); // Start loading state immediately
        try {
            db.initDatabase();
            
            // 1. One-time Migration to Reset V3 DB for user (now V4)
            const hasMigrated = localStorage.getItem('alphaarena_v4_migrated');
            if (!hasMigrated) {
                console.log("Migration: Resetting DB for clean slate (V4)...");
                localStorage.setItem('alphaarena_v4_migrated', 'true');
            }

            // 2. GLOBAL CLOUD INIT
            if (APP_CREDENTIALS.SUPABASE_URL && APP_CREDENTIALS.SUPABASE_ANON_KEY) {
                initCloud({ 
                    url: APP_CREDENTIALS.SUPABASE_URL, 
                    key: APP_CREDENTIALS.SUPABASE_ANON_KEY 
                });
                console.log("App Init: Global Cloud Connection Established.");
            } else {
                console.warn("App Init: No global Supabase config found in credentials.config.ts");
            }

            // 3. Auto-Login Logic
            const lastUser = await db.getLastActiveUser();
            if (lastUser) {
                console.log("App Init: Auto-login found for", lastUser.email);
                await handleLogin(lastUser.email, lastUser.name, true);
            } else {
                // If no last user, ensure loading state is explicitly false so Login component renders
                setIsLoadingAuth(false);
            }

            // 4. BACKGROUND SCANNER LOGIC
            // This is now triggered on login and getData, not global init
        } catch (error) {
            console.error("Critical error during app initialization:", error);
            // Even if init fails, ensure loading state is reset so user can interact with login
            setIsLoadingAuth(false);
            // Optionally, set an app-wide error message here if needed
        }
    };
    initApp();
  }, []);

  /**
   * Runs the global background scan for market opportunities.
   * This function ensures the scanner runs once daily around 8 AM local time.
   * It checks for existing cached results to avoid redundant scans and handles error recovery.
   * 
   * @param currentStrategies The list of available trading strategies.
   * @param currentMarketData The latest market data for potential scan candidates.
   * @param championshipId The ID of the championship context. MANDATORY.
   */
  const runGlobalBackgroundScan = async (currentStrategies: Strategy[], currentMarketData: Stock[], championshipId: string) => { // UPDATED: championshipId mandatory
      console.log('=== GLOBAL BACKGROUND SCAN START ===');
      console.log('Strategies count:', currentStrategies.length);
      console.log('Market data count:', currentMarketData.length);
      console.log('Championship ID:', championshipId);
      console.log('Is already scanning:', isScanningGlobalRef.current);
      
      // Don't run if market data or strategies aren't loaded, or if a scan is already in progress
      if (currentStrategies.length === 0 || isScanningGlobalRef.current || currentMarketData.length === 0) {
          console.log('SCAN ABORTED - Missing data or already scanning');
          return;
      }

      isScanningGlobalRef.current = true; // Set flag to prevent multiple simultaneous scans
      setIsScanning(true); // Update UI state
      
      const now = new Date();
      const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const scanHour = 8; // 8 AM local time
      const isPastScanTime = now.getHours() >= scanHour;

      let newScanResults: ScanResult[] = [];
      let newScanSource: 'AI' | 'Heuristic' | null = null;
      let newScanAiErrorMessage: string | null = null;
      let newScanTimestamp: number | null = null;

      try {
          const cachedScan = await db.getGlobalScanReport(championshipId); // Pass championshipId
          const cachedScanDate = cachedScan ? new Date(cachedScan.timestamp).toISOString().slice(0, 10) : null;

          // Conditions for a new scan:
          // 1. No cached scan exists.
          // 2. Cached scan is from a different day.
          // 3. Cached scan is from today, but it ran BEFORE the target scan hour (e.g., 8 AM) 
          //    and it's now past that hour.
          // 4. Cached scan from today (past target scan hour) returned no results or had an AI error 
          //    (forcing a re-attempt to recover from previous failure).
          const shouldRunNewScan = 
              !cachedScan || 
              cachedScanDate !== today ||
              (cachedScanDate === today && new Date(cachedScan.timestamp).getHours() < scanHour && isPastScanTime) ||
              (isPastScanTime && (cachedScan.results.length === 0 || cachedScan.aiErrorMessage));


          if (shouldRunNewScan && isPastScanTime) {
              console.log(`Global Background Scanner: Initiating daily market scan...`);
              // Fix: `scanMarketOpportunities` now returns a complete `ScanReport`
              const scanReport: ScanReport = await scanMarketOpportunities(currentMarketData, currentStrategies, championshipId);
              
              newScanResults = scanReport.results;
              newScanSource = scanReport.source;
              newScanAiErrorMessage = scanReport.aiErrorMessage;
              newScanTimestamp = scanReport.timestamp;

              // Always save the report, even if it has errors or no results, to record the attempt and timestamp
              await db.saveGlobalScanReport(scanReport, championshipId); // Pass championshipId
              console.log(`Global Background Scanner: Found ${newScanResults.length} opportunities. Source: ${newScanSource}.`);
              
          } else {
              // If already scanned today past 8 AM, or it's before 8 AM, just load cached results
              newScanResults = cachedScan?.results || [];
              newScanSource = cachedScan?.source || 'Heuristic'; 
              newScanAiErrorMessage = cachedScan?.aiErrorMessage || null;
              newScanTimestamp = cachedScan?.timestamp || Date.now();
              console.log("Global Background Scanner: Loaded cached results for today (or waiting for 8 AM).");
          }
      } catch (e: any) {
          console.error("Global background scanner daily check error", e);
          newScanAiErrorMessage = e.message || "Unknown error during global background scan.";
          
          // Attempt to load any existing cached results even on error
          const cachedScan = await db.getGlobalScanReport(championshipId); // Pass championshipId
          if (cachedScan) {
              newScanResults = cachedScan.results;
              newScanSource = cachedScan.source;
              newScanTimestamp = cachedScan.timestamp;
              if (newScanAiErrorMessage) {
                 // Update cached scan with current error to indicate it failed if re-attempted
                 cachedScan.aiErrorMessage = newScanAiErrorMessage; 
                 await db.saveGlobalScanReport(cachedScan, championshipId); // Save updated cached scan
              }
          } else {
              // If no cached results and an error occurred, set to empty/default
              newScanResults = [];
              newScanSource = 'Heuristic'; // Default to heuristic if no actual scan or cached data
              newScanTimestamp = Date.now();
          }
      } finally {
          setScanResults(newScanResults);
          setScanSource(newScanSource);
          setScanAiErrorMessage(newScanAiErrorMessage);
          setLastScanTimestamp(newScanTimestamp);
          isScanningGlobalRef.current = false; // Reset flag
          setIsScanning(false); // Update UI state
      }
  };


  // Auth state
  const handleLogin = async (email: string, name: string, isAutoLogin = false) => {
    setIsLoadingAuth(true);
    try {
        let user = await db.getUserByEmail(email);
        
        if (!user) {
            user = await db.createUser(email, name);
        }
        
        // Ensure V4 Reset happens for this specific user if not done
        const userMigratedKey = `alphaarena_v4_reset_${user.id}`;
        if (!localStorage.getItem(userMigratedKey)) {
            // UPDATED: resetUserAccount now requires a championshipId.
            // This is problematic if we are resetting a user with no current champ.
            // For now, we will skip this V4 reset on login if no championship is set,
            // or assume user account reset happens *within* a championship context.
            // Since we're removing personal portfolio, this reset implies deleting
            // all user's data in ALL championships. Let's simplify and make reset explicit.
            // For now, if no championship is set, this reset call needs to be carefully reconsidered.
            // Let's remove this global reset on auto-login for now and ensure reset is done per champ.
            // await db.resetUserAccount(user.id);
            // localStorage.setItem(userMigratedKey, 'true');
            // console.log("User V4 Reset Complete");
        }

        // NEW: Promote mtonin@live.it to admin and set accountType to 'Pro'
        if (user.email === 'mtonin@live.it' && (!user.is_admin || user.accountType !== 'Pro')) {
            console.log("Promoting mtonin@live.it to admin and Pro account type.");
            // Fix: Explicitly type updatedAdminUser to User to ensure type compatibility
            const updatedAdminUser: User = { ...user, is_admin: true, accountType: 'Pro' };
            await db.updateUser(updatedAdminUser);
            user = updatedAdminUser; // Use the updated user object
        }
        
        await db.setLastActiveUser(user);
        setCurrentUser(user);
        
        // Initialize championship context from user profile
        if (user.current_championship_id) {
            const champ = await db.getChampionshipById(user.current_championship_id);
            if (champ) {
                setCurrentChampionshipId(champ.id);
                setCurrentChampionshipName(champ.name);
                setCurrentChampionshipStartingCash(champ.starting_cash);
                setActiveTab('portfolio'); // Open portfolio directly when user has a championship
                // Load strategies after user and championship context are set
                const loadedStrategies = await loadStrategyData(user.activeStrategyId);
                await refreshUserData(user.id, champ.id); // UPDATED: Pass champ.id directly
            } else {
                // If championship not found, clear user's current_championship_id and redirect to championships tab
                const updatedUser = { ...user, current_championship_id: undefined }; // UPDATED: undefined
                await db.updateUser(updatedUser);
                setCurrentUser(updatedUser); // Update state with the cleaned user
                setCurrentChampionshipId(undefined); // UPDATED: undefined
                setCurrentChampionshipName(undefined); // UPDATED: undefined
                setCurrentChampionshipStartingCash(undefined); // UPDATED: undefined
                setActiveTab('championships'); // Force user to select/join a championship
            }
        } else {
            // No championship in user profile, force user to select/join
            setCurrentChampionshipId(undefined); // UPDATED: undefined
            setCurrentChampionshipName(undefined); // UPDATED: undefined
            setCurrentChampionshipStartingCash(undefined); // UPDATED: undefined
            setActiveTab('championships'); // Force user to select/join a championship
        }
        
        // If a user logs in and lands on championships, strategies still need to be loaded for general use.
        const loadedStrategies = await loadStrategyData(user.activeStrategyId); // Get strategies here
        
    } catch (error) {
        console.error("Login error", error);
        if (!isAutoLogin) alert("Login failed. Please check your connection.");
    } finally {
        setIsLoadingAuth(false);
    }
  };

  const loadStrategyData = async (activeId?: string): Promise<Strategy[]> => {
      const allStrategies = await db.getStrategies();
      setStrategies(allStrategies);
      
      const selectedId = activeId || 'strat_balanced';
      const selected = allStrategies.find(s => s.id === selectedId) || allStrategies[0];
      setActiveStrategy(selected);
      return allStrategies; // Return strategies
  };

  const handleLogout = () => {
    // Set logout flag first to prevent intermediate renders
    setIsLoggingOut(true);
    
    // Clear localStorage synchronously
    localStorage.removeItem('db_active_user');
    console.log("Logging out. Session keys cleared.");
    
    // Batch all state updates in the next tick to prevent React reconciliation errors
    // This allows the isLoggingOut flag to propagate before clearing other state
    requestAnimationFrame(() => {
      // Clear user-related state first
      setCurrentUser(null);
      
      // Then clear all other state in a single batch
      setCurrentChampionshipId(undefined);
      setCurrentChampionshipName(undefined);
      setCurrentChampionshipStartingCash(undefined);
      setHoldings([]);
      setTransactions([]);
      setStocks([]);
      setSources([]);
      setLastUpdated(new Date());
      setDataProvider('Mock');
      setStrategies([]);
      setActiveStrategy(null);
      setScanResults([]);
      setScanSource('Heuristic');
      setScanAiErrorMessage(null);
      setLastScanTimestamp(Date.now());
      setIsScanning(false);
      setBuyingPower(0);
      setTotalEquity(undefined);
      setDailyBuyCount(0);
      
      // Reset logout flag after state is cleared
      setIsLoggingOut(false);
    });
  };

  // UPDATED: refreshUserData now requires championshipId
  const refreshUserData = async (userId: string, champId: string | undefined = undefined) => { // Accept undefined
      // ADMIN BLOCK: Admins don't have portfolios, skip all user data refresh
      if (currentUserRef.current?.is_admin) {
          setHoldings([]);
          setTransactions([]);
          setBuyingPower(0);
          setTotalEquity(0);
          setDailyBuyCount(0);
          return;
      }
      
      if (!currentUserRef.current || !champId) { // UPDATED: skip if no champId
          setHoldings([]);
          setTransactions([]);
          setBuyingPower(0);
          setTotalEquity(0);
          setDailyBuyCount(0); // NEW: Reset daily buy count
          return; 
      }

      // 1. Fetch holdings and transactions from internal DB, filtered by championshipId
      const userHoldings = await db.getHoldings(userId, champId); // Pass mandatory championshipId
      setHoldings(userHoldings);

      const txs = await db.getTransactions(userId, champId); // Pass mandatory championshipId
      setTransactions(txs); 
      
      // 2. Calculate buying power from transactions
      // The `starting_cash` for a championship is provided as an initial 'deposit' transaction.
      // So, we should start `calcBuyingPower` from 0 and process all transactions.
      let calcBuyingPower = 0; // Initialize to 0, starting cash is covered by the initial deposit transaction.
      txs.forEach(tx => {
          const amt = Number(tx.amount);
          if (tx.type === 'deposit' || tx.type === 'sell') {
              calcBuyingPower += amt;
          } else { // withdrawal or buy
              calcBuyingPower -= amt;
          }
      });
      
      setBuyingPower(calcBuyingPower);

      // 3. Calculate total asset value from holdings and current market data
      let totalAssetValue = 0;
      userHoldings.forEach(holding => {
        const liveStock = stocks.find(s => s.symbol === holding.symbol);
        const currentPrice = liveStock ? liveStock.price : holding.avgPrice; // Fallback to avgPrice if live data not available
        totalAssetValue += currentPrice * holding.quantity;
      });
      
      // Set total equity as sum of asset value and buying power
      setTotalEquity(totalAssetValue + calcBuyingPower);

      // NEW: Calculate daily buy count
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const currentDayBuys = txs.filter(tx => tx.type === 'buy' && tx.date.startsWith(today)).length;
      setDailyBuyCount(currentDayBuys);
  };

  // Effect to ensure balance is fresh whenever we switch tabs, user, or championship context
  useEffect(() => {
    if (currentUser) {
        refreshUserData(currentUser.id, currentChampionshipId); 
    } else {
        // If no user, clear all related data
        setHoldings([]);
        setTransactions([]);
        setBuyingPower(0);
        setTotalEquity(0);
        setDailyBuyCount(0); // NEW: Reset daily buy count
    }
  }, [activeTab, currentUser, stocks, currentChampionshipId, currentChampionshipStartingCash]); // Add championship context as dependency

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);

      const currentHoldings = holdingsRef.current;
      const currentWatched = watchedSymbolsRef.current;

      const portfolioSymbols = currentHoldings.map(h => h.symbol);
      
      // Check if championship has ticker restrictions
      let championshipTickers: string[] = [];
      let hasTickerRestrictions = false;
      
      if (currentChampionshipIdRef.current) {
        try {
          const championship = await db.getChampionshipById(currentChampionshipIdRef.current);
          if (championship?.ticker_restriction_enabled && championship.allowed_tickers && championship.allowed_tickers.length > 0) {
            championshipTickers = championship.allowed_tickers;
            hasTickerRestrictions = true;
          }
        } catch (error) {
          console.error("Error fetching championship tickers:", error);
        }
      }
      
      // If championship has ticker restrictions, ONLY fetch those tickers
      // Otherwise, fetch portfolio + watched + championship tickers
      const allDynamicSymbols = hasTickerRestrictions 
        ? championshipTickers 
        : Array.from(new Set([...portfolioSymbols, ...currentWatched, ...championshipTickers]));
      
      // Use backend proxy for Alpaca data
      const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      console.log('=== FETCHING MARKET DATA VIA BACKEND PROXY ===');
      console.log('Backend URL:', BACKEND_URL);
      console.log('Symbols:', allDynamicSymbols.length);
      
      const response = await fetch(`${BACKEND_URL}/api/market-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols: allDynamicSymbols }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch market data from backend');
      }

      const data = await response.json();
      
      console.log('Backend response:', data);
      
      if (!data.success || !data.stocks) {
        throw new Error(data.message || 'Backend returned invalid data');
      }
      
      setDataProvider(data.provider || 'Alpaca');

      if (data.stocks && data.stocks.length > 0) {
        // No need to filter again - we already requested only allowed tickers
        const sortedStocks = data.stocks.sort((a, b) => {
             const aWatched = currentWatched.includes(a.symbol) || portfolioSymbols.includes(a.symbol);
             const bWatched = currentWatched.includes(b.symbol) || portfolioSymbols.includes(b.symbol);
             if (aWatched && !bWatched) return -1;
             if (!aWatched && bWatched) return 1;
             return 0;
        });
        setStocks(sortedStocks);
      }
      if (data.sources && data.sources.length > 0) {
        setSources(data.sources);
      }
      setLastUpdated(new Date());

      if (currentUserRef.current) { // Always refresh user data after market data fetch for consistency
          await refreshUserData(currentUser.id, currentChampionshipIdRef.current); // UPDATED: Pass currentChampionshipIdRef
          // runGlobalBackgroundScan will be called from the dedicated useEffect below
          // once market data and strategies are fully loaded.
      }

    } catch (error: any) {
      console.error("Failed to fetch market data:", error);
      
      // Show user-friendly error message
      const errorMessage = error.message || "Failed to connect to Alpaca API";
      
      // If credentials are missing, show a specific message
      if (errorMessage.includes('not configured')) {
        alert("⚠️ Alpaca API non configurata\n\nPer vedere i dati live:\n1. Crea un account su alpaca.markets\n2. Ottieni le tue API keys (Paper Trading)\n3. Aggiungi VITE_ALPACA_KEY e VITE_ALPACA_SECRET al file .env.local\n4. Riavvia l'applicazione");
      } else {
        alert(`❌ Errore connessione Alpaca:\n${errorMessage}\n\nVerifica le tue credenziali e la connessione internet.`);
      }
      
      setStocks([]); // Clear stocks on error
      setDataProvider('Mock'); // Indicate error state
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Effect to manage initial data fetching and polling interval
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const startPolling = async () => {
        if (!currentUser || !currentChampionshipId) { // UPDATED: Only poll if user and championship are active
            // If no active championship, clear interval and do not fetch data.
            if (intervalId) clearInterval(intervalId);
            return;
        }
        
        // Initial fetch
        getData(); 
        
        // Get Alpaca keys from shared config - used for determining polling interval
        const alpacaKey = APP_CREDENTIALS.ALPACA_KEY || null;
        const alpacaSecret = APP_CREDENTIALS.ALPACA_SECRET || null;
        const hasAlpaca = !!alpacaKey && !!alpacaSecret; 
        const intervalTime = hasAlpaca ? 120000 : 300000; // Rilassato: 2 min con Alpaca, 5 min senza

        intervalId = setInterval(getData, intervalTime); 
    };

    startPolling();

    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser, currentChampionshipId]); // Dependencies for getData() are handled by its internal logic and refs, add championshipId

  // --- AI TRADING AGENT LOOP ---
  useEffect(() => {
      const runTradingAgent = async () => {
          if (!currentUserRef.current || !currentUserRef.current.autoTradingEnabled || !currentChampionshipIdRef.current || stocks.length === 0) return; // UPDATED: require currentChampionshipId
          
          const currentUserId = currentUserRef.current.id;
          const currentChampId = currentChampionshipIdRef.current; // Use ref for latest championship ID

          // Refresh holdings to get the latest state (e.g., after previous agent action)
          await refreshUserData(currentUserId, currentChampId); // This updates `holdings` state

          for (const holding of holdingsRef.current) { // Use ref for latest holdings
              // holding.championshipId is now always a string, no need for conditional check.
              if (holding.championshipId !== currentChampId) continue; // Only process holdings for the current championship context

              const stockData = stocks.find(s => s.symbol === holding.symbol);
              
              const specificStrategy = strategies.find(s => s.id === holding.strategyId) || activeStrategy;

              if (stockData && specificStrategy) {
                  const decision = analyzeHolding(holding, stockData.price, specificStrategy);
                  
                  // Always update peak price if it changed
                  if (decision.newPeakPrice !== holding.peakPrice) {
                      await db.saveHolding(currentUserId, { ...holding, peakPrice: decision.newPeakPrice }, currentChampId);
                  }

                  if (decision.action === 'SELL' && decision.tradeQuantity && decision.tradeQuantity > 0) {
                      console.log(`[AI AGENT] Selling ${decision.tradeQuantity.toFixed(2)} shares of ${holding.symbol}. Strategy: ${specificStrategy.name}. Reason: ${decision.reason}`);
                      
                      await db.addAgentLog(currentUserId, {
                          id: `log_${Date.now()}`,
                          date: new Date().toISOString(),
                          symbol: holding.symbol,
                          action: 'SELL',
                          price: stockData.price,
                          trigger: decision.reason.split(':')[0], 
                          strategyName: specificStrategy.name,
                          details: decision.reason,
                          championshipId: currentChampId, // UPDATED: now string
                      }, currentChampId); // Pass championship ID to agent log

                      try {
                        await executeTrade(holding, decision.tradeQuantity, 'sell', stockData.price, undefined, undefined, currentChampId);
                        console.log("AI Auto-Sell Executed Successfully");
                      } catch (e) {
                          console.error("AI Auto-Sell failed", e);
                      }
                  } 
              }
          }
      };

      // Run agent every 15 seconds (can be adjusted)
      const agentInterval = setInterval(runTradingAgent, 15000); 
      return () => clearInterval(agentInterval);

  }, [stocks, strategies, activeStrategy, currentUser, currentChampionshipId]); // Add currentChampionshipId as dependency

  // --- Scanner Global Background Scan Trigger ---
  // This useEffect sets up a daily timer to trigger the global market scanner at 8 AM.
  // It runs an initial scan when dependencies are loaded and then schedules subsequent daily scans.
  useEffect(() => {
    if (currentUser && strategies.length > 0 && stocks.length > 0 && currentChampionshipId) { // UPDATED: require currentChampionshipId
      // Run initial scan (will use cached if recent and valid, otherwise a new one)
      runGlobalBackgroundScan(strategies, stocks, currentChampionshipId); // Pass mandatory championship ID
    } else {
        // If no currentChampionshipId, clear previous scan results and stop scan
        setScanResults([]);
        setScanSource('Heuristic');
        setScanAiErrorMessage(null);
        setLastScanTimestamp(Date.now());
        setIsScanning(false);
    }
    
    // Set up a daily timer to re-check after 8 AM local time.
    const now = new Date();
    const targetHour = 8; // 8 AM
    let delayUntilNextCheck = 0;

    if (now.getHours() < targetHour) {
      // If current time is before 8 AM, schedule for 8 AM today
      const eightAmToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, 0, 0, 0);
      delayUntilNextCheck = eightAmToday.getTime() - now.getTime();
    } else {
      // If current time is after 8 AM, schedule for 8 AM tomorrow
      const eightAmTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, targetHour, 0, 0, 0);
      delayUntilNextCheck = eightAmTomorrow.getTime() - now.getTime();
    }

    // Add a small buffer (5 seconds) to ensure it runs slightly after the target hour.
    delayUntilNextCheck += 5000; 

    const dailyTimer = setTimeout(() => {
        // Only run if there's an active championship
        if (currentUser && strategies.length > 0 && stocks.length > 0 && currentChampionshipId) {
            // Trigger a re-run of the check at the scheduled time.
            // This call will determine if a new scan is needed based on cache, errors, and time.
            runGlobalBackgroundScan(strategies, stocks, currentChampionshipId); // Pass mandatory championship ID
            // Then, set up a recurring interval for every 24 hours thereafter.
            const intervalId = setInterval(() => runGlobalBackgroundScan(strategies, stocks, currentChampionshipId), 24 * 60 * 60 * 1000); // Every 24 hours
            return () => clearInterval(intervalId); // Cleanup interval on component unmount
        }
    }, delayUntilNextCheck);

    return () => clearTimeout(dailyTimer); // Cleanup timeout on component unmount or dependency change

  }, [currentUser, strategies, stocks, currentChampionshipId]); // Trigger when these dependencies are loaded/updated


  const handleSearch = async () => {
      if (!searchQuery.trim() || !currentChampionshipId) return; // UPDATED: require currentChampionshipId
      
      const symbol = searchQuery.toUpperCase().trim();
      
      // Validate ticker is allowed in championship
      const validation = await marketService.validateTickerForChampionship(symbol, currentChampionshipId);
      if (!validation.isValid) {
          alert(validation.message || 'Ticker non consentito in questo campionato');
          setSearchQuery('');
          return;
      }
      
      if (!watchedSymbols.includes(symbol)) {
          setWatchedSymbols(prev => [symbol, ...prev]);
      }
      
      setSearchQuery('');
      setLoading(true);
      
      try {
          const portfolioSymbols = holdingsRef.current.map(h => h.symbol);
          const allDynamicSymbols = Array.from(new Set([...portfolioSymbols, ...watchedSymbolsRef.current, symbol]));
          
          const alpacaKeys = currentUserRef.current ? await db.getAlpacaCredentials(currentUserRef.current.id) : { key: null, secret: null };
          const data = await fetchMarketData(allDynamicSymbols, alpacaKeys.key, alpacaKeys.secret);
          setDataProvider(data.provider);
          
          if (data.stocks.length > 0) {
              // Apply championship ticker filtering
              let filteredStocks = data.stocks;
              if (currentChampionshipId) {
                  filteredStocks = await marketService.filterAllowedTickers(
                      data.stocks,
                      currentChampionshipId
                  );
              }
              setStocks(filteredStocks);
          }
      } catch (e) {
          console.error("Search failed", e);
      } finally {
          setLoading(false);
      }
  };

  const handleOpenTradeModal = async (stock: Stock | Holding, type: 'buy' | 'sell', strategyId?: string) => {
      if (!currentUser || !currentChampionshipId) { // UPDATED: require currentChampionshipId
        alert("Please select a championship to perform trades.");
        return;
      }
      await refreshUserData(currentUser.id, currentChampionshipId); // Refresh balance in context
      setSelectedStock(stock);
      setTradeType(type);
      setTradeDefaultStrategyId(strategyId || currentUser.activeStrategyId);
      setIsTradeModalOpen(true);
  };

  // UPDATED: executeTrade now requires championshipId
  const executeTrade = async (stock: Stock | Holding, quantity: number, type: 'buy' | 'sell', price: number, strategyId?: string, viLotAmountOverride?: number, champId: string | undefined = undefined) => { // Accept undefined for champId but expect it to be passed
      if (!currentUser || !champId) { // UPDATED: require champId
          console.error("Cannot execute trade: User or Championship ID not available.");
          throw new Error("User or Championship context missing for trade execution.");
      }
      
      const totalValue = quantity * price;
      const transactionId = `tx_${Date.now()}`;

      const newTx: Transaction = {
          id: transactionId,
          type: type,
          amount: totalValue,
          date: new Date().toISOString(),
          status: 'completed',
          method: 'Trade Platform', // No longer Alpaca API, as all trades are internal
          symbol: stock.symbol,
          quantity: quantity,
          price: price,
          championshipId: champId, // UPDATED: now string
      };

      try {
          // Local Simulation Logic (always executed)
          await db.addTransaction(currentUser.id, newTx, champId); // Pass mandatory championshipId to transaction

          const currentHolding = holdings.find(h => h.symbol === stock.symbol && h.championshipId === champId); // Filter by championshipId
          let newHolding: Holding;

          if (type === 'buy') {
              const currentQty = currentHolding ? currentHolding.quantity : 0;
              const currentAvg = currentHolding ? currentHolding.avgPrice : 0;
              
              const totalCost = (currentQty * currentAvg) + (quantity * price);
              const newQty = currentQty + quantity;
              const newAvg = totalCost / newQty;

              newHolding = {
                  symbol: stock.symbol,
                  name: stock.name,
                  quantity: newQty,
                  avgPrice: newAvg,
                  peakPrice: price,
                  strategyId: strategyId || currentHolding?.strategyId || currentUser.activeStrategyId,
                  // Value Investor State Update: No longer directly used by AI agent but kept for completeness
                  viInitialBuyPrice: currentHolding?.viInitialBuyPrice || price, // Set initial buy price on first purchase
                  viLotsPurchased: currentHolding?.viLotsPurchased === undefined ? 1 : (currentHolding.viLotsPurchased + 1), // Increment lot count
                  viLotAmount: viLotAmountOverride || currentHolding?.viLotAmount, // NEW: Save configured lot amount
                  championshipId: champId, // UPDATED: now string
              };
          } else { // type === 'sell'
              if (!currentHolding) throw new Error("Holding not found for sell");
              newHolding = {
                  ...currentHolding,
                  quantity: currentHolding.quantity - quantity,
                  // If quantity becomes 0, clear Value Investor state (position closed) - kept for completeness
                  viInitialBuyPrice: (currentHolding.quantity - quantity) <= 0 ? undefined : currentHolding.viInitialBuyPrice,
                  viLotsPurchased: (currentHolding.quantity - quantity) <= 0 ? undefined : currentHolding.viLotsPurchased,
                  viLotAmount: (currentHolding.quantity - quantity) <= 0 ? undefined : currentHolding.viLotAmount, // NEW: Clear if position closed
                  championshipId: champId, // UPDATED: now string
              };
          }

          await db.saveHolding(currentUser.id, newHolding, champId); // Pass mandatory championshipId to holding
          await refreshUserData(currentUser.id, champId); // Refresh with championship context

      } catch (error: any) {
          console.error("Trade execution failed", error);
          throw error;
      }
  }

  const handleConfirmTrade = async (quantity: number, strategyId?: string) => {
      if (!currentUser || !selectedStock || !currentChampionshipId) return; // UPDATED: require currentChampionshipId

      const liveStock = stocks.find(s => s.symbol === selectedStock.symbol);
      const executionPrice = liveStock ? liveStock.price : (selectedStock as any).avgPrice || (selectedStock as Stock).price;

      if (!executionPrice) {
          alert("Could not determine market price.");
          return;
      }

      const totalValue = quantity * executionPrice;

      // NEW: Apply trade limits for 'buy' operations
      if (tradeType === 'buy') {
          if (totalValue > MAX_TRADE_AMOUNT) {
              alert(`Acquisto fallito: Il valore del trade (${totalValue.toLocaleString(undefined, {style: 'currency', currency: 'USD'})}) supera il limite massimo di ${MAX_TRADE_AMOUNT.toLocaleString(undefined, {style: 'currency', currency: 'USD'})} per trade.`);
              return;
          }
          // Daily buy limit removed - unlimited purchases allowed
      }

      try {
          // If it's a 'Value Investor' strategy buy, pass the configured lot amount
          // This logic is now mostly vestigial if strat_value is removed, but for a new custom VI strategy,
          // it could still be used if implemented.
          let viLotAmount: number | undefined;
          if (tradeType === 'buy' && strategyId === 'strat_value') { // Keep check for 'strat_value' for robustness
              const viStrategy = strategies.find(s => s.id === 'strat_value');
              viLotAmount = viStrategy?.valueInvestorConfig?.lotAmount || 5000; // Default if not configured
          }

          await executeTrade(selectedStock, quantity, tradeType, executionPrice, strategyId, viLotAmount, currentChampionshipId); // Pass mandatory championshipId
          setIsTradeModalOpen(false);
          alert(`Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${selectedStock.symbol}`);
      } catch (error: any) {
           alert(`Trade failed: ${error.message || "Unknown error"}`);
      }
  };

  const getSelectedStockQuantity = () => {
      if (!selectedStock || !currentChampionshipId) return 0; // UPDATED: require currentChampionshipId
      const h = holdings.find(item => item.symbol === selectedStock.symbol && item.championshipId === currentChampionshipId); // Filter by championshipId
      return h ? h.quantity : 0;
  };

  const getSelectedStockPrice = () => {
      if (!selectedStock) return 0;
      const live = stocks.find(s => s.symbol === selectedStock.symbol);
      return live ? live.price : (selectedStock as any).avgPrice || 0;
  };

  // Handler to navigate to settings, passed to Scanner component
  const handleNavigateToSettings = () => {
      setActiveTab('settings');
  };

  // NEW: Handler for Welcome Page - Join Free Championship
  const handleJoinFreeChampionship = async () => {
    if (!currentUser) return;
    
    try {
      // Get or create the permanent Welcome Cup
      const welcomeCup = await db.getOrCreateWelcomeCup();
      
      // Set it as the user's active championship
      await handleSetChampionshipContext(welcomeCup);
      
      // Hide welcome page and show portfolio
      setShowWelcome(false);
      setActiveTab('portfolio');
      
    } catch (error) {
      console.error("Error joining Welcome Cup:", error);
      alert("Errore durante l'iscrizione al campionato gratuito. Riprova.");
    }
  };

  // NEW: Handler for Welcome Page - Go to Dashboard
  const handleGoToDashboard = () => {
    setShowWelcome(false);
    setActiveTab('portfolio');
  };

  // NEW: Handler to set championship context
  // UPDATED: Now accepts Championship or undefined (to clear context)
  const handleSetChampionshipContext = async (champ: Championship | null) => {
    if (currentUser) {
        if (champ) {
            setCurrentChampionshipId(champ.id);
            setCurrentChampionshipName(champ.name);
            setCurrentChampionshipStartingCash(champ.starting_cash);
            const updatedUser = { ...currentUser, current_championship_id: champ.id };
            await db.updateUser(updatedUser);
            setCurrentUser(updatedUser); // Update global user state
            await db.joinChampionship(currentUser.id, champ); // Ensure user is joined and has initial cash
            await refreshUserData(currentUser.id, champ.id); // Refresh data with new context
            // Stay on championships tab to let user see the updated championship context
        } else {
            // User explicitly wants to clear championship context (e.g., deleted champ or forced switch)
            setCurrentChampionshipId(undefined); // UPDATED: undefined
            setCurrentChampionshipName(undefined); // UPDATED: undefined
            setCurrentChampionshipStartingCash(undefined); // UPDATED: undefined
            const updatedUser = { ...currentUser, current_championship_id: undefined }; // UPDATED: undefined
            await db.updateUser(updatedUser);
            setCurrentUser(updatedUser); // Update global user state
            setHoldings([]); // Clear holdings
            setTransactions([]); // Clear transactions
            setBuyingPower(0); // Reset buying power
            setTotalEquity(0); // Reset total equity
            setDailyBuyCount(0); // NEW: Reset daily buy count
            setActiveTab('championships'); // Force user back to championships selection
        }
    }
  };

  // Check if we should show the Welcome Page
  useEffect(() => {
    // Check URL parameters for email confirmation
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const emailConfirmed = urlParams.get('email_confirmed');
    
    // If user just confirmed email via Supabase link, show welcome page
    if (currentUser && type === 'signup' && !currentChampionshipId) {
      setShowWelcome(true);
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Also check sessionStorage for welcome flag (set by email confirmation)
    const showWelcomeFlag = sessionStorage.getItem('show_welcome');
    if (currentUser && showWelcomeFlag === 'true' && !currentChampionshipId) {
      setShowWelcome(true);
      sessionStorage.removeItem('show_welcome');
    }
  }, [currentUser, currentChampionshipId]);

  if (!currentUser) {
    // Don't render Login during logout transition to prevent React reconciliation errors
    if (isLoggingOut) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#121212]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neonGreen border-t-transparent"></div>
        </div>
      );
    }
    
    // Mobile: Show Landing → Login/Signup flow
    if (isMobile) {
      if (mobileView === 'landing') {
        return (
          <LandingMobile
            theme={theme}
            onSignUp={() => setMobileView('signup')}
            onLogin={() => setMobileView('login')}
          />
        );
      }
      // Show Login component for both login and signup (it handles switching internally)
      return <Login onLogin={handleLogin} theme={theme} isLoading={isLoadingAuth} />;
    }
    
    // Desktop: Show normal Login with split view
    return <Login onLogin={handleLogin} theme={theme} isLoading={isLoadingAuth} />;
  }

  // Show Welcome Page if flag is set
  if (showWelcome && !currentChampionshipId) {
    return (
      <Welcome
        theme={theme}
        user={currentUser}
        onJoinFreeChampionship={handleJoinFreeChampionship}
        onGoToDashboard={handleGoToDashboard}
      />
    );
  }

  // UPDATED: Render specific tabs only if a championship is active, or if on 'championships' tab
  const renderContent = () => {
      // ADMIN ACCESS CONTROL: Block admin from accessing trading tabs
      // Note: 'strategies' is NOT included here as admins need access to manage strategies
      const tradingTabs = ['portfolio', 'market', 'scanner', 'activity', 'statistics', 'agent-monitor'];
      if (currentUser?.is_admin && tradingTabs.includes(activeTab)) {
          // Redirect admin to admin-panel if they try to access trading tabs
          setActiveTab('admin-panel');
          return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-gray-500 animate-in fade-in">
                <Shield size={64} className="mb-4 text-gray-700 opacity-30"/>
                <h3 className="text-xl font-bold mb-2">Accesso Amministratore</h3>
                <p className="mb-4">Come admin, puoi solo gestire i campionati.</p>
                <button 
                    onClick={() => setActiveTab('admin-panel')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                    <Shield size={18}/> Vai all'Admin Panel
                </button>
            </div>
          );
      }
      
      if (activeTab === 'championships') {
          return (
            <Championships
                theme={theme}
                currentUser={currentUser}
                onSetChampionshipContext={handleSetChampionshipContext}
                currentChampionshipId={currentChampionshipId}
                marketData={stocks}
                onNavigateToSettings={handleNavigateToSettings} // Pass the navigation handler
            />
          );
      }
      
      // Admin Panel doesn't require a championship context
      if (activeTab === 'admin-panel') {
          return (
            <AdminPanel 
                theme={theme} 
                currentUser={currentUser}
                marketData={stocks}
            />
          );
      }
      
      // Settings doesn't require a championship context
      if (activeTab === 'settings') {
          return (
            <Settings 
                theme={theme} 
                toggleTheme={toggleTheme} 
                user={currentUser} 
                onLogout={handleLogout} 
                onRefreshData={async () => {
                    await getData();
                    if(currentUser) {
                        const u = await db.getUserByEmail(currentUser.email);
                        if(u) setCurrentUser(u); 
                        await refreshUserData(currentUser.id, currentChampionshipId);
                    }
                }}
            />
          );
      }
      
      if (!currentChampionshipId) {
          // If no championship is selected and not on the championships tab,
          // redirect or show a message.
          return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-gray-500 animate-in fade-in">
                {/* Fix: Trophy icon is now imported */}
                <Trophy size={64} className="mb-4 text-gray-700 opacity-30"/>
                <h3 className="text-xl font-bold mb-2">Nessun Campionato Selezionato</h3>
                <p className="mb-4">Per iniziare, unisciti o crea un campionato.</p>
                <button 
                    onClick={() => setActiveTab('championships')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                    {/* Fix: Trophy icon is now imported */}
                    <Trophy size={18}/> Vai ai Campionati
                </button>
            </div>
          );
      }

      // If a championship is selected, render the active tab content
      switch (activeTab) {
          case 'market':
              return (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                     <div className={`relative overflow-hidden rounded-2xl p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        <p className="text-sm text-gray-400">Total Volume</p>
                        <h3 className={`mt-2 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {stocks.length > 0 ? stocks[0].volume : '--'}
                        </h3>
                        <span className="text-xs text-neonGreen">Real-time Data</span>
                     </div>
                     <div className={`relative overflow-hidden rounded-2xl p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        <p className="text-sm text-gray-400">Buying Power</p>
                        <h3 className={`mt-2 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                           ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-neonGreen">Available for Trade</span>
                     </div>
                     <div className={`relative overflow-hidden rounded-2xl p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-400">Updates</p>
                                <h3 className={`mt-2 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Live</h3>
                            </div>
                            {currentUser.autoTradingEnabled && activeStrategy && (
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-400 border border-purple-500/30">
                                        <Bot size={12}/> AI Agent Active
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1">{activeStrategy.name}</span>
                                </div>
                            )}
                        </div>
                        <span className="text-xs flex items-center gap-1 font-medium text-neonGreen mt-1">
                           {dataProvider === 'Alpaca' ? <Zap size={10} fill="currentColor"/> : <Search size={10}/>}
                           {dataProvider === 'Alpaca' ? 'Alpaca Data Feed' : 'Google Search Grounding'}
                        </span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className={`flex items-center gap-2 rounded-xl p-2 border transition-colors focus-within:border-neonGreen ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                      <Search className="ml-2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search ticker (e.g. KO)" 
                        className={`bg-transparent text-sm outline-none placeholder:text-gray-500 w-32 md:w-64 text-inherit`}
                      />
                      <button 
                        onClick={handleSearch}
                        className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                          Enter
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-gray-500 sm:block">
                        Updated: {lastUpdated.toLocaleTimeString()} (Every {dataProvider === 'Alpaca' ? '30s' : '60s'})
                      </span>
                      <button 
                        onClick={getData} 
                        disabled={loading}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-neonGreen/10 text-neonGreen hover:bg-neonGreen/20' : 'bg-black text-white hover:bg-gray-800'}`}
                      >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
                        <span className="hidden sm:inline">{loading ? 'Updating...' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>

                  {stocks.length === 0 && loading ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-4">
                       <div className="h-8 w-8 animate-spin rounded-full border-4 border-neonGreen border-t-transparent"></div>
                       <p className="text-sm text-gray-400">Fetching real-time market data...</p>
                    </div>
                  ) : (
                    <div className={`flex flex-col gap-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                       <div className="hidden px-4 text-xs font-semibold uppercase tracking-wider opacity-50 sm:grid sm:grid-cols-[140px_1fr_100px_120px] gap-4">
                          <span>Ticker</span>
                          <span className="text-center">Trend (24h)</span>
                          <span className="text-right">Price</span>
                          <span className="text-center">Actions</span>
                       </div>
                       
                      {stocks.map((stock) => (
                        <StockCard 
                            key={stock.symbol} 
                            stock={stock} 
                            theme={theme}
                            onTrade={handleOpenTradeModal}
                        />
                      ))}
                    </div>
                  )}

                  {sources.length > 0 && (
                    <div className={`mt-8 rounded-xl border p-4 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Data Sources (Powered by Google Search)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-xs hover:underline ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                          >
                            {source.title} <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
          case 'portfolio':
              return (
                <Portfolio 
                    marketData={stocks} 
                    theme={theme} 
                    holdings={holdings} 
                    onTrade={handleOpenTradeModal}
                    userBalance={buyingPower} 
                    externalTotalEquity={totalEquity}
                    championshipId={currentChampionshipId} // UPDATED: now string
                />
              );
          case 'scanner':
              return (
                <Scanner 
                    theme={theme}
                    marketData={stocks}
                    strategies={strategies}
                    onTrade={(s, t, stratId) => handleOpenTradeModal(s, t, stratId)}
                    scanResults={scanResults}
                    scanSource={scanSource}
                    scanAiErrorMessage={scanAiErrorMessage}
                    lastScanTimestamp={lastScanTimestamp}
                    isScanning={isScanning}
                    onNavigateToSettings={handleNavigateToSettings}
                    championshipId={currentChampionshipId} // UPDATED: now string
                />
              );
          case 'activity':
              return (
                <Activity 
                    theme={theme}
                    user={currentUser}
                    championshipId={currentChampionshipId} // UPDATED: now string
                />
              );
          case 'statistics':
              return (
                <Statistics
                    theme={theme}
                    user={currentUser}
                    holdings={holdings}
                    marketData={stocks}
                    transactions={transactions}
                    championshipId={currentChampionshipId} // UPDATED: now string
                />
              );
          case 'strategies':
              return (
                <Strategies 
                    theme={theme}
                    user={currentUser}
                    onStrategyChange={() => {
                        db.getUserByEmail(currentUser.email).then(u => {
                            if (u) {
                                setCurrentUser(u);
                                loadStrategyData(u.activeStrategyId);
                            }
                        });
                    }}
                />
              );
          case 'agent-monitor':
              return (
                <AgentMonitor 
                    theme={theme}
                    user={currentUser}
                    strategies={strategies}
                    activeStrategy={activeStrategy}
                    holdings={holdings}
                    marketData={stocks}
                    championshipId={currentChampionshipId} // UPDATED: now string
                />
              );
          case 'settings':
              return (
                <Settings 
                    theme={theme} 
                    toggleTheme={toggleTheme} 
                    user={currentUser} 
                    onLogout={handleLogout} 
                    onRefreshData={async () => {
                        await getData();
                        if(currentUser) {
                            const u = await db.getUserByEmail(currentUser.email);
                            if(u) setCurrentUser(u); 
                            await refreshUserData(currentUser.id, currentChampionshipId);
                        }
                    }}
                />
              );
          case 'admin-panel':
              return (
                <AdminPanel 
                    theme={theme} 
                    currentUser={currentUser}
                    marketData={stocks}
                />
              );
          default:
              return null;
      }
  };


  return (
    <Layout 
        theme={theme} 
        toggleTheme={toggleTheme} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userBalance={buyingPower} 
        currentUser={currentUser}
        currentChampionshipName={currentChampionshipName} // UPDATED: now string
        // Removed onSwitchToPersonalPortfolio
    >
      
      {renderContent()}

      {currentUser && currentChampionshipId && ( // UPDATED: Only show chatbot if championship is active
          <ChatBot theme={theme} marketData={stocks} holdings={holdings} user={currentUser} championshipId={currentChampionshipId} />
      )}

      <TradeModal 
         isOpen={isTradeModalOpen}
         onClose={() => setIsTradeModalOpen(false)}
         type={tradeType}
         stock={selectedStock}
         currentPrice={getSelectedStockPrice()}
         theme={theme}
         onConfirm={handleConfirmTrade}
         userBalance={buyingPower}
         userHoldingQuantity={getSelectedStockQuantity()}
         onRefreshBalance={() => refreshUserData(currentUser.id, currentChampionshipId)}
         strategies={strategies}
         defaultStrategyId={tradeDefaultStrategyId || (currentUser ? currentUser.activeStrategyId : undefined)}
         championshipId={currentChampionshipId} // UPDATED: now string
         maxTradeAmount={MAX_TRADE_AMOUNT}
      />

    </Layout>
  );
};

// Wrap the main AppContent with the ErrorBoundary
const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
