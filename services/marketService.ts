
import { Stock, MarketDataResponse, Source, Holding, Transaction, ScanResult, Strategy, ScanReport, AIResponse } from '../types';
import { decrypt } from './security';
import { generateAIContent } from './aiService';
import { getChampionshipById } from './database';

// --- TICKER VALIDATION FOR CHAMPIONSHIPS ---

/**
 * Validates if a ticker is allowed for a given championship
 * Returns validation result with appropriate error message
 */
export const validateTickerForChampionship = async (
    symbol: string, 
    championshipId: string | null
): Promise<{ isValid: boolean; message?: string }> => {
    // If no championship context (personal trading), all tickers allowed
    if (!championshipId) {
        return { isValid: true };
    }

    try {
        const championship = await getChampionshipById(championshipId);
        
        if (!championship) {
            return { 
                isValid: false, 
                message: "Campionato non trovato" 
            };
        }

        // If ticker restrictions are not enabled, all tickers allowed
        if (!championship.ticker_restriction_enabled) {
            return { isValid: true };
        }

        // Check if ticker is in allowed list
        const allowedTickers = championship.allowed_tickers || [];
        const symbolUpper = symbol.toUpperCase();
        
        if (allowedTickers.includes(symbolUpper)) {
            return { isValid: true };
        }

        // Ticker not in whitelist
        return {
            isValid: false,
            message: `🚫 Il ticker ${symbolUpper} non è consentito in questo campionato. Solo i seguenti ticker sono ammessi: ${allowedTickers.slice(0, 5).join(', ')}${allowedTickers.length > 5 ? ` e altri ${allowedTickers.length - 5}` : ''}.`
        };

    } catch (error) {
        console.error("Error validating ticker:", error);
        return {
            isValid: false,
            message: "Errore durante la validazione del ticker"
        };
    }
};

/**
 * Filters market data to only include allowed tickers for a championship
 */
export const filterAllowedTickers = async (
    stocks: Stock[],
    championshipId: string | null
): Promise<Stock[]> => {
    // If no championship context, return all stocks
    if (!championshipId) {
        return stocks;
    }

    try {
        const championship = await getChampionshipById(championshipId);
        
        if (!championship || !championship.ticker_restriction_enabled) {
            return stocks;
        }

        const allowedTickers = championship.allowed_tickers || [];
        
        // If ticker restrictions are enabled but no tickers are specified,
        // allow all stocks (empty whitelist = no restrictions)
        if (allowedTickers.length === 0) {
            console.log('filterAllowedTickers: Ticker restrictions enabled but whitelist is empty, allowing all stocks');
            return stocks;
        }
        
        const allowedSet = new Set(allowedTickers.map(t => t.toUpperCase()));
        
        return stocks.filter(stock => allowedSet.has(stock.symbol.toUpperCase()));
        
    } catch (error) {
        console.error("Error filtering tickers:", error);
        return stocks;
    }
};

// Expanded list to include major S&P 500 companies across sectors
const SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'BRK.B', 'TSLA', 
    'JPM', 'BAC', 'GS', 'WFC', 'AXP', 
    'JNJ', 'LLY', 'UNH', 'PFE', 'MRK', 'ABBV', 
    'V', 'MA', 'PYPL', 
    'WMT', 'PG', 'MCD', 'KO', 'PEP', 'COST', 'SBUX', 'LOW', 'HD', 'TJX', 
    'XOM', 'CVX', 'COP', 'EOG', 
    'BA', 'CAT', 'HON', 'LMT', 'RTX', 'GD', 'NOC', 
    'DHR', 'SYK', 'ISRG', 'ABT', 'TMO', 
    'CSCO', 'ADBE', 'AMD', 'QCOM', 'TMUS', 
    'INTC', 'GE', 'IBM', 'AMGN', 'BKNG', 'C', 
    'KMI', 'EXC', 'SO', 'DUK', 'AEP', 'NEE' 
];

const FALLBACK_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.35, changePercent: 1.25, marketCap: '2.8T', volume: '54.2M' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 895.40, changePercent: 2.80, marketCap: '2.2T', volume: '48.1M' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.55, changePercent: -0.45, marketCap: '3.1T', volume: '22.5M' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 175.20, changePercent: -1.10, marketCap: '550B', volume: '98.5M' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.15, changePercent: 0.85, marketCap: '1.8T', volume: '35.4M' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.20, changePercent: 0.55, marketCap: '1.7T', volume: '20.1M' },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.10, changePercent: 1.10, marketCap: '560B', volume: '9.2M' }
];

const STOCK_NAMES: Record<string, string> = {
    // Major Stocks
    'AAPL': 'Apple Inc.',
    'NVDA': 'NVIDIA Corp.',
    'MSFT': 'Microsoft Corp.',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'GOOGL': 'Alphabet Inc.',
    'META': 'Meta Platforms',
    'JPM': 'JPMorgan Chase & Co.',
    'BAC': 'Bank of America Corp.',
    'JNJ': 'Johnson & JOhnson',
    'LLY': 'Eli Lilly and Company',
    'V': 'Visa Inc.',
    'MA': 'Mastercard Incorporated',
    'WMT': 'Walmart Inc.',
    'PG': 'Procter & Gamble Co.',
    'XOM': 'Exxon Mobil Corporation',
    'BRK.B': 'Berkshire Hathaway Inc. Class B',
    'UNH': 'UnitedHealth Group Incorporated',
    'HD': 'The Home Depot, Inc.',
    'CVX': 'Chevron Corporation',
    'PFE': 'Pfizer Inc.',
    'ABBV': 'AbbVie Inc.',
    'COST': 'Costco Wholesale Corporation',
    'ORCL': 'Oracle Corporation',
    'CRM': 'Salesforce, Inc.',
    'MCD': 'McDonald\'s Corporation',
    'KO': 'The Coca-Cola Company',
    'PEP': 'PepsiCo, Inc.',
    'CSCO': 'Cisco Systems, Inc.',
    'ACN': 'Accenture plc',
    'NFLX': 'Netflix, Inc.',
    'ADBE': 'Adobe Inc.',
    'NKE': 'NIKE, Inc.',
    'AMD': 'Advanced Micro Devices, Inc.',
    'QCOM': 'QUALCOMM Incorporated',
    'T': 'AT&T Inc.',
    'TMUS': 'T-Mobile US, Inc.',
    'INTC': 'Intel Corporation',
    'GE': 'General Electric Company',
    'IBM': 'International Business Machines Machines Corporation',
    'AMGN': 'Amgen Inc.',
    'BKNG': 'Booking Holdings Inc.',
    'C': 'Citigroup Inc.',
    'GS': 'The Goldman Sachs Group, Inc.',
    'BA': 'The Boeing Company',
    'CAT': 'Caterpillar Inc.',
    'HON': 'Honeywell International Inc.',
    'LMT': 'Lockheed Martin Corporation',
    'RTX': 'RTX Corporation',
    'GD': 'General Dynamics Corporation',
    'NOC': 'Northrop Grumman Corporation',
    'DHR': 'Danaher Corporation',
    'SYK': 'Stryker Corporation',
    'ISRG': 'Intuitive Surgical, Inc.',
    'ABT': 'Abbott Laboratories',
    'TMO': 'Thermo Fisher Scientific Inc.',
    'COP': 'ConocoPhillips',
    'EOG': 'EOG Resources, Inc.',
    'F': 'Ford Motor Company',
    'GM': 'General Motors Company',
    'KMI': 'Kinder Morgan, Inc.',
    'EXC': 'Exelon Corporation',
    'SO': 'The Southern Company',
    'DUK': 'Duke Energy Corporation',
    'AEP': 'American Electric Power Company, Inc.',
    'NEE': 'NextEra Energy, Inc.',
    // Cryptocurrencies (with dash format)
    'BTC-USD': 'Bitcoin',
    'ETH-USD': 'Ethereum',
    'BNB-USD': 'Binance Coin',
    'SOL-USD': 'Solana',
    'ADA-USD': 'Cardano',
    'XRP-USD': 'Ripple',
    'DOGE-USD': 'Dogecoin',
    'DOT-USD': 'Polkadot',
    'MATIC-USD': 'Polygon',
    'AVAX-USD': 'Avalanche',
    // Cryptocurrencies (Alpaca format without dash)
    'BTCUSD': 'Bitcoin',
    'ETHUSD': 'Ethereum',
    'BNBUSD': 'Binance Coin',
    'SOLUSD': 'Solana',
    'ADAUSD': 'Cardano',
    'XRPUSD': 'Ripple',
    'DOGEUSD': 'Dogecoin',
    'DOTUSD': 'Polkadot',
    'MATICUSD': 'Polygon',
    'AVAXUSD': 'Avalanche',
};

const generateMockData = (symbols: string[]): Stock[] => {
    // Load price cache from localStorage
    const priceCache = JSON.parse(localStorage.getItem('mock_prices_cache') || '{}');
    const updatedCache: Record<string, number> = {};
    
    const stocks = symbols.map(symbol => {
        const existing = FALLBACK_STOCKS.find(s => s.symbol === symbol);
        const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Use realistic base prices for crypto
        let initialBasePrice: number;
        if (symbol === 'BTCUSD' || symbol === 'BTC-USD') {
            initialBasePrice = 95000; // Bitcoin ~$95k
        } else if (symbol === 'ETHUSD' || symbol === 'ETH-USD') {
            initialBasePrice = 3500; // Ethereum ~$3.5k
        } else if (symbol === 'BNBUSD' || symbol === 'BNB-USD') {
            initialBasePrice = 650; // Binance Coin ~$650
        } else if (symbol === 'SOLUSD' || symbol === 'SOL-USD') {
            initialBasePrice = 240; // Solana ~$240
        } else if (symbol === 'ADAUSD' || symbol === 'ADA-USD') {
            initialBasePrice = 1.05; // Cardano ~$1
        } else if (symbol === 'XRPUSD' || symbol === 'XRP-USD') {
            initialBasePrice = 1.40; // Ripple ~$1.4
        } else if (symbol === 'DOGEUSD' || symbol === 'DOGE-USD') {
            initialBasePrice = 0.40; // Dogecoin ~$0.4
        } else if (symbol === 'DOTUSD' || symbol === 'DOT-USD') {
            initialBasePrice = 7.50; // Polkadot ~$7.5
        } else if (symbol === 'MATICUSD' || symbol === 'MATIC-USD') {
            initialBasePrice = 0.95; // Polygon ~$0.95
        } else if (symbol === 'AVAXUSD' || symbol === 'AVAX-USD') {
            initialBasePrice = 42; // Avalanche ~$42
        } else {
            initialBasePrice = existing ? existing.price : (seed % 500) + 50;
        }
        
        const baseName = existing ? existing.name : STOCK_NAMES[symbol] || `${symbol} Corp`;
        
        // Get previous price from cache, or use initial base price
        const previousPrice = priceCache[symbol] || initialBasePrice;
        
        // Apply realistic incremental variation (+/- 3% max)
        const volatility = 0.03; // 3% max variation per update
        const variation = (Math.random() - 0.5) * 2 * volatility; // Range: -3% to +3%
        const newPrice = Math.max(0.01, previousPrice * (1 + variation));
        
        // Calculate actual change percent based on previous price
        const changePercent = ((newPrice - previousPrice) / previousPrice) * 100;
        
        // Store new price in cache
        updatedCache[symbol] = newPrice;
        
        return {
            symbol,
            name: baseName,
            price: parseFloat(newPrice.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            marketCap: existing?.marketCap || '10B',
            volume: existing?.volume || '1.5M'
        };
    });
    
    // Save updated cache to localStorage
    localStorage.setItem('mock_prices_cache', JSON.stringify(updatedCache));
    
    return stocks;
};

export const fetchMarketData = async (additionalSymbols: string[] = [], alpacaKey: string | null, alpacaSecret: string | null): Promise<MarketDataResponse & { provider: 'Alpaca' | 'Google' | 'Mock' }> => {
  const uniqueSymbols = Array.from(new Set([...SYMBOLS, ...additionalSymbols]));
  
  console.log('fetchMarketData: Requested symbols:', uniqueSymbols);

  // Read from environment variables if not provided as parameters
  const effectiveKey = alpacaKey || import.meta.env.VITE_ALPACA_KEY;
  const effectiveSecret = alpacaSecret || import.meta.env.VITE_ALPACA_SECRET;

  // Check if Alpaca credentials are configured
  if (!effectiveKey || !effectiveSecret) {
      const errorMsg = 'Alpaca credentials not configured. Please add VITE_ALPACA_KEY and VITE_ALPACA_SECRET to your .env.local file or environment variables.';
      console.error('fetchMarketData:', errorMsg);
      throw new Error(errorMsg);
  }

  try {
      const alpacaData = await fetchAlpacaData(effectiveKey, effectiveSecret, uniqueSymbols);
      
      if (!alpacaData || alpacaData.length === 0) {
          throw new Error('Alpaca returned no data. Please check your API keys and network connection.');
      }
      
      console.log('fetchMarketData: Alpaca returned', alpacaData.length, 'stocks');
      
      // Check if there are missing symbols (e.g., crypto that Alpaca doesn't support)
      const returnedSymbols = new Set(alpacaData.map(s => s.symbol.toUpperCase()));
      const missingSymbols = uniqueSymbols.filter(s => !returnedSymbols.has(s.toUpperCase()));
      
      if (missingSymbols.length > 0) {
          console.warn('fetchMarketData: Alpaca does not support these symbols:', missingSymbols);
          // Return only the symbols that Alpaca supports
      }
      
      return { stocks: alpacaData, sources: [], provider: 'Alpaca' };
      
  } catch (e: any) {
      const errorMsg = `Alpaca API error: ${e.message || 'Failed to fetch market data'}`;
      console.error('fetchMarketData:', errorMsg);
      throw new Error(errorMsg);
  }
};

// --- STRATEGY RECOMMENDATION AI ---

export const getAIStrategyRecommendation = async (symbol: string): Promise<{ recommendedId: string; reason: string }> => {
    try {
        // Call backend API (uses centralized OpenAI key)
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        
        console.log(`[AI Strategy] Calling backend for ${symbol}...`);
        
        const response = await fetch(`${backendUrl}/api/ai/strategy-suggestion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ symbol })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Backend AI analysis failed');
        }

        const data = await response.json();
        
        console.log(`[AI Strategy] Backend recommendation for ${symbol}:`, data.recommendedId);
        
        return {
            recommendedId: data.recommendedId || 'strat_balanced',
            reason: data.reason || 'AI analysis incomplete, defaulted to Balanced.'
        };

    } catch (e: any) {
        console.error('[AI Strategy] Error:', e.message);
        // Re-throw the error to be handled by TradeModal.tsx
        throw e;
    }
};

// --- AUTOMATED SCANNER LOGIC (AI-first with Heuristic Fallback) ---


const generateHeuristicScanResults = (marketData: Stock[], strategies: Strategy[], allowedTickers?: string[]): ScanResult[] => {
    const heuristicResults: ScanResult[] = [];
    
    // Use championship allowed tickers if provided, otherwise use ALL tickers from marketData
    const scanCandidates = allowedTickers && allowedTickers.length > 0 
        ? allowedTickers 
        : marketData.map(s => s.symbol);

    console.log('=== HEURISTIC SCANNER ===');
    console.log('📊 Scan candidates:', scanCandidates.length, 'tickers');
    console.log('📈 Market data available:', marketData.length, 'stocks');

    // Fix: Use case-insensitive matching for ticker comparison
    const scanCandidatesUpper = scanCandidates.map(s => s.toUpperCase());
    
    // IMPROVED FALLBACK: If market data is empty or insufficient, use mock data
    let availableStocks: Stock[];
    if (marketData.length === 0) {
        console.warn('⚠️ No market data available - generating mock data for scanner');
        availableStocks = generateMockData(scanCandidates);
    } else {
        availableStocks = marketData.filter(s => scanCandidatesUpper.includes(s.symbol.toUpperCase()));
        
        // If filtering resulted in no stocks, use mock data as fallback
        if (availableStocks.length === 0) {
            console.warn('⚠️ No matching stocks after filtering - generating mock data');
            availableStocks = generateMockData(scanCandidates.slice(0, 10)); // Use a subset
        }
    }
    
    console.log('✅ Available stocks for analysis:', availableStocks.length);
    const effectiveStrategies = strategies.length > 0 ? strategies.filter(s => ['strat_conservative', 'strat_balanced', 'strat_aggressive'].includes(s.id)) : [ // Use a minimal set of system strategies if none are provided
        { id: 'strat_conservative', name: 'Conservative Guard', description: '', stopLossPercentage: 3, takeProfitTiers: [] },
        { id: 'strat_balanced', name: 'Balanced Growth', description: '', stopLossPercentage: 5, takeProfitTiers: [] },
        { id: 'strat_aggressive', name: 'Aggressive Runner', description: '', stopLossPercentage: 10, takeProfitTiers: [] },
    ];


    availableStocks.forEach(stock => {
        let categoryId: ScanResult['categoryId'] = 'strat_balanced'; // Default

        // Simple Heuristics:
        // Aggressive: High volatility (high changePercent) and larger market cap (proxy for popular tech)
        if (Math.abs(stock.changePercent) > 3 && (stock.marketCap.includes('T') || parseInt(stock.marketCap) > 100)) {
            categoryId = 'strat_aggressive';
        } 
        // Conservative: Low volatility
        else if (Math.abs(stock.changePercent) < 0.5) {
            categoryId = 'strat_conservative';
        }
        // Balanced: Anything else
        else {
            categoryId = 'strat_balanced';
        }

        // Only add if the strategy actually exists
        if (effectiveStrategies.some(s => s.id === categoryId)) {
            heuristicResults.push({
                symbol: stock.symbol,
                categoryId: categoryId,
                reason: `Heuristic: ${categoryId.replace('strat_', '')} profile based on simple market rules.`
            });
        }
    });

    // Ensure we always return at least some results if possible, even if filtered out
    if (heuristicResults.length === 0 && availableStocks.length > 0) {
        // Fallback to a few default balanced if nothing else matched
        availableStocks.slice(0, 3).forEach(stock => {
            if (effectiveStrategies.some(s => s.id === 'strat_balanced')) {
                heuristicResults.push({
                    symbol: stock.symbol,
                    categoryId: 'strat_balanced',
                    reason: 'Heuristic: Defaulted to Balanced due to no specific match.'
                });
            }
        });
    }

    return heuristicResults;
};

// Fix: Modified `scanMarketOpportunities` to accept and return `championshipId`
export const scanMarketOpportunities = async (marketData: Stock[], strategies: Strategy[], championshipId: string): Promise<ScanReport> => {
    const scanStartTime = Date.now();

    // Get allowed tickers from championship if ticker restrictions are enabled
    let allowedTickers: string[] | undefined = undefined;
    let tickersToAnalyze: string[] = [];
    
    try {
        const championship = await getChampionshipById(championshipId);
        console.log('Scanner: Championship data:', championship);
        console.log('Scanner: ticker_restriction_enabled:', championship?.ticker_restriction_enabled);
        console.log('Scanner: allowed_tickers:', championship?.allowed_tickers);
        
        if (championship?.ticker_restriction_enabled && championship.allowed_tickers) {
            allowedTickers = championship.allowed_tickers;
            tickersToAnalyze = championship.allowed_tickers;
            console.log(`Scanner: Using ${allowedTickers.length} championship-allowed tickers for scan:`, allowedTickers);
        } else {
            console.log('Scanner: No ticker restrictions, using default scan candidates');
            // Use default scan candidates if no championship restrictions
            tickersToAnalyze = marketData.map(s => s.symbol);
        }
    } catch (error) {
        console.error("Scanner: Error fetching championship tickers, using default scan candidates", error);
        tickersToAnalyze = marketData.map(s => s.symbol);
    }

    // NEW: Try backend AI analysis first
    try {
        console.log('🤖 [Scanner] Calling backend AI endpoint...');
        console.log('📍 [Scanner] Backend URL:', import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
        console.log('🎯 [Scanner] Championship ID:', championshipId);
        console.log('📊 [Scanner] Tickers to analyze:', tickersToAnalyze);
        console.log('💹 [Scanner] Market data count:', marketData.length);
        
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const requestBody = {
            championshipId,
            tickers: tickersToAnalyze,
            marketData: marketData.filter(s => tickersToAnalyze.includes(s.symbol))
        };
        
        console.log('📤 [Scanner] Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${backendUrl}/api/scanner/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 [Scanner] Response status:', response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ [Scanner] Backend AI analysis successful!');
            console.log('📋 [Scanner] Results:', data.results?.length || 0, 'opportunities');
            console.log('🎨 [Scanner] Source:', data.source);
            console.log('💾 [Scanner] Cached:', data.cached);
            
            return {
                results: data.results || [],
                source: 'AI',
                timestamp: data.timestamp || Date.now(),
                aiErrorMessage: null,
                lastScanDuration: Date.now() - scanStartTime,
                championshipId: championshipId,
            };
        } else {
            const errorData = await response.json();
            console.error('❌ [Scanner] Backend AI failed:', errorData);
            throw new Error(errorData.message || 'Backend AI analysis failed');
        }
    } catch (aiError: any) {
        console.error('⚠️ [Scanner] AI analysis error, falling back to heuristic:', aiError.message);
        console.error('📚 [Scanner] Error stack:', aiError.stack);
        
        // Fallback to heuristic
        return {
            results: generateHeuristicScanResults(marketData, strategies, allowedTickers),
            source: 'Heuristic',
            timestamp: Date.now(),
            aiErrorMessage: aiError.message || 'AI service unavailable',
            lastScanDuration: Date.now() - scanStartTime,
            championshipId: championshipId,
        };
    }
};


// --- ALPACA IMPLEMENTATION ---

const getAlpacaBaseUrl = (key: string) => {
    return key.startsWith('PK') ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
};

// Helper to identify crypto symbols
const isCryptoSymbol = (symbol: string): boolean => {
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'MATIC', 'AVAX'];
    const cleanSymbol = symbol.replace('-USD', '').replace('USD', '').toUpperCase();
    return cryptoSymbols.includes(cleanSymbol);
};

const fetchAlpacaData = async (key: string, secret: string, symbols: string[]): Promise<Stock[] | null> => {
    // Separate stocks and crypto
    const stockSymbols: string[] = [];
    const cryptoSymbols: string[] = [];
    const symbolMap: Record<string, string> = {};
    
    symbols.forEach(symbol => {
        const alpacaSymbol = symbol.replace('-', '').toUpperCase();
        symbolMap[alpacaSymbol] = symbol;
        
        if (isCryptoSymbol(symbol)) {
            cryptoSymbols.push(alpacaSymbol);
        } else {
            stockSymbols.push(alpacaSymbol);
        }
    });
    
    const allStocks: Stock[] = [];
    
    // Fetch stocks data
    if (stockSymbols.length > 0) {
        try {
            const stocksData = await fetchAlpacaStocks(key, secret, stockSymbols, symbolMap);
            if (stocksData) allStocks.push(...stocksData);
        } catch (e) {
            console.error('Error fetching stocks from Alpaca:', e);
        }
    }
    
    // Fetch crypto data
    if (cryptoSymbols.length > 0) {
        try {
            const cryptoData = await fetchAlpacaCrypto(key, secret, cryptoSymbols, symbolMap);
            if (cryptoData) allStocks.push(...cryptoData);
        } catch (e) {
            console.error('Error fetching crypto from Alpaca:', e);
        }
    }
    
    return allStocks.length > 0 ? allStocks : null;
};

// Fetch stock data using stocks endpoint
const fetchAlpacaStocks = async (
    key: string, 
    secret: string, 
    symbols: string[], 
    symbolMap: Record<string, string>
): Promise<Stock[] | null> => {
    const symbolStr = symbols.join(',');
    const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbolStr}&feed=iex`;

    try {
        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': key,
                'APCA-API-SECRET-KEY': secret,
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Alpaca Stocks API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const stocks: Stock[] = [];

        for (const alpacaSymbol of symbols) {
            const item = data[alpacaSymbol];
            if (item) {
                const originalSymbol = symbolMap[alpacaSymbol];
                const price = item.latestTrade?.p || item.dailyBar?.c || 0;
                const prevClose = item.prevDailyBar?.c || item.dailyBar?.o || price;
                
                let changePercent = 0;
                if (prevClose > 0) {
                    changePercent = ((price - prevClose) / prevClose) * 100;
                }

                const vol = item.dailyBar?.v || 0;
                const volStr = vol > 1000000 ? `${(vol/1000000).toFixed(1)}M` : vol > 1000 ? `${(vol/1000).toFixed(1)}K` : vol.toString();

                stocks.push({
                    symbol: originalSymbol,
                    name: STOCK_NAMES[originalSymbol] || STOCK_NAMES[alpacaSymbol] || originalSymbol,
                    price: price,
                    changePercent: parseFloat(changePercent.toFixed(2)),
                    marketCap: 'N/A',
                    volume: volStr
                });
            }
        }

        return stocks.length > 0 ? stocks : null;
    } catch (e) {
        console.error('Alpaca stocks fetch error:', e);
        return null;
    }
};

// Fetch crypto data using crypto endpoint
const fetchAlpacaCrypto = async (
    key: string, 
    secret: string, 
    symbols: string[], 
    symbolMap: Record<string, string>
): Promise<Stock[] | null> => {
    // Alpaca crypto API requires format BTC/USD not BTCUSD
    const symbolsWithSlash = symbols.map(s => {
        // Convert BTCUSD to BTC/USD
        if (s.length > 3 && s.endsWith('USD')) {
            const base = s.substring(0, s.length - 3);
            return `${base}/USD`;
        }
        return s;
    });
    const symbolStr = symbolsWithSlash.join(',');
    const url = `https://data.alpaca.markets/v1beta3/crypto/us/latest/bars?symbols=${symbolStr}`;

    try {
        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': key,
                'APCA-API-SECRET-KEY': secret,
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Alpaca Crypto API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const stocks: Stock[] = [];

        // Alpaca crypto response structure: { bars: { "BTC/USD": {...}, "ETH/USD": {...} } }
        const bars = data.bars || {};
        
        for (let i = 0; i < symbols.length; i++) {
            const alpacaSymbol = symbols[i];
            const symbolWithSlash = symbolsWithSlash[i];
            const bar = bars[symbolWithSlash];
            if (bar) {
                const originalSymbol = symbolMap[alpacaSymbol];
                const price = bar.c || 0; // close price
                const prevClose = bar.o || price; // open price as previous
                
                let changePercent = 0;
                if (prevClose > 0) {
                    changePercent = ((price - prevClose) / prevClose) * 100;
                }

                const vol = bar.v || 0;
                const volStr = vol > 1000000 ? `${(vol/1000000).toFixed(1)}M` : vol > 1000 ? `${(vol/1000).toFixed(1)}K` : vol.toString();

                stocks.push({
                    symbol: originalSymbol,
                    name: STOCK_NAMES[originalSymbol] || STOCK_NAMES[alpacaSymbol] || originalSymbol,
                    price: parseFloat(price.toFixed(2)),
                    changePercent: parseFloat(changePercent.toFixed(2)),
                    marketCap: 'N/A',
                    volume: volStr
                });
            }
        }

        return stocks.length > 0 ? stocks : null;
    } catch (e) {
        console.error('Alpaca crypto fetch error:', e);
        return null;
    }
};




// --- GENAI FALLBACK IMPLEMENTATION ---

const fetchGenAIMarketData = async (symbols: string[]): Promise<MarketDataResponse> => {
  try {
    const prompt = `
      Get the latest estimated stock market data for the following symbols: ${symbols.join(', ')}.
      
      Return a STRICT JSON array containing an object for each stock with these exact fields:
      - symbol (string)
      - name (string)
      - price (number)
      - changePercent (number)
      - marketCap (string)
      - volume (string)

      Do not use markdown. Return only the raw JSON string.
    `;

    // USE CENTRAL AI SERVICE
    const aiResponse: AIResponse = await generateAIContent(prompt, { jsonMode: true, tools: [{googleSearch: {}}] });

    // generateAIContent now throws an Error if it can't produce content
    let jsonString = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Cleanup broken JSON ends
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    let stocks: Stock[] = [];
    try {
        stocks = JSON.parse(jsonString);
    } catch (e) {
        throw new Error("Failed to parse AI JSON response");
    }

    if (!Array.isArray(stocks)) {
        throw new Error("Invalid JSON structure");
    }
    
    return { stocks, sources: aiResponse.groundingSources };

  } catch (error) {
    throw error;
  }
};
