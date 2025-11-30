
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
    'NEE': 'NextEra Energy, Inc.'
};

const generateMockData = (symbols: string[]): Stock[] => {
    return symbols.map(symbol => {
        const existing = FALLBACK_STOCKS.find(s => s.symbol === symbol);
        const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const basePrice = existing ? existing.price : (seed % 500) + 50; 
        const baseName = existing ? existing.name : STOCK_NAMES[symbol] || `${symbol} Corp`;
        const volatility = 1.5; 
        const changePercent = (Math.random() * volatility * 2) - volatility; 
        const newPrice = Math.max(0.01, basePrice * (1 + (changePercent / 100)));
        
        return {
            symbol,
            name: baseName,
            price: newPrice,
            changePercent: parseFloat(changePercent.toFixed(2)),
            marketCap: existing?.marketCap || '10B',
            volume: existing?.volume || '1.5M'
        };
    });
};

export const fetchMarketData = async (additionalSymbols: string[] = [], alpacaKey: string | null, alpacaSecret: string | null): Promise<MarketDataResponse & { provider: 'Alpaca' | 'Google' | 'Mock' }> => {
  const uniqueSymbols = Array.from(new Set([...SYMBOLS, ...additionalSymbols]));

  if (alpacaKey && alpacaSecret) {
      try {
          const alpacaData = await fetchAlpacaData(alpacaKey, alpacaSecret, uniqueSymbols);
          if (alpacaData) {
              return { stocks: alpacaData, sources: [], provider: 'Alpaca' };
          }
      } catch (e) {
          // Silent catch for Alpaca - it falls back to GenAI/Mock
          // console.warn("Alpaca fetch failed, falling back.");
      }
  }

  // 2. Fallback to GenAI (Uses Central AI Service)
  try {
      const genAiData = await fetchGenAIMarketData(uniqueSymbols);
      return { ...genAiData, provider: 'Google' };
  } catch (error) {
      // Graceful fallback to Mock data without noise
      return { stocks: generateMockData(uniqueSymbols), sources: [], provider: 'Mock' };
  }
};

// --- STRATEGY RECOMMENDATION AI ---

export const getAIStrategyRecommendation = async (symbol: string): Promise<{ recommendedId: string; reason: string }> => {
    try {
        const prompt = `
            Analyze the stock "${symbol}". Based on its historical volatility, beta, momentum, and sector, recommend the best trading strategy from this list:
            
            1. 'strat_conservative' (Low volatility, defensive stocks. Tight stops.)
            2. 'strat_balanced' (Standard growth stocks. Medium stops.)
            3. 'strat_aggressive' (High volatility/crypto/tech. Wide stops.)

            Return a JSON object with:
            - recommendedId: string (one of the IDs above)
            - reason: string (max 15 words explaining why)
        `;

        // USE CENTRAL AI SERVICE
        const aiResponse: AIResponse = await generateAIContent(prompt, { jsonMode: true, tools: [{googleSearch: {}}] });
        
        // generateAIContent now throws an Error if it can't produce content
        let jsonString = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonString);
        
        return {
            recommendedId: result.recommendedId || 'strat_balanced',
            reason: result.reason || 'AI analysis incomplete, defaulted to Balanced.'
        };

    } catch (e: any) {
        // No silent fallback here. Re-throw the error to be handled by TradeModal.tsx
        throw e;
    }
};

// --- AUTOMATED SCANNER LOGIC (AI-first with Heuristic Fallback) ---


const generateHeuristicScanResults = (marketData: Stock[], strategies: Strategy[]): ScanResult[] => {
    const heuristicResults: ScanResult[] = [];
    const scanCandidates = [
        'NVDA', 'AMD', 'TSLA', 'MSTR', 'COIN', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 
        'JPM', 'BAC', 'GS', 'UNH', 'LLY', 
        'WMT', 'PG', 'KO', 'PEP', 'COST', 
        'XOM', 'CVX', 'BRK.B', 'JNJ', 'HD', 
        'SBUX', 'NKE', 'PYPL', 'CRM', 'CSCO' 
    ];

    const availableStocks = marketData.length > 0 ? marketData.filter(s => scanCandidates.includes(s.symbol)) : generateMockData(scanCandidates);
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

    // The scanner will now ALWAYS run in heuristic mode.
    // AI-powered analysis is explicitly disabled for this feature.
    return {
        results: generateHeuristicScanResults(marketData, strategies),
        source: 'Heuristic', // Always 'Heuristic'
        timestamp: Date.now(),
        aiErrorMessage: null, // No AI error as AI is not attempted
        lastScanDuration: Date.now() - scanStartTime,
        championshipId: championshipId, // ADDED: Include championshipId in the returned ScanReport
    };
};


// --- ALPACA IMPLEMENTATION ---

const getAlpacaBaseUrl = (key: string) => {
    return key.startsWith('PK') ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
};

const fetchAlpacaData = async (key: string, secret: string, symbols: string[]): Promise<Stock[] | null> => {
    const symbolStr = symbols.map(s => s.toUpperCase()).join(',');
    const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbolStr}&feed=iex`;

    try {
        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': key,
                'APCA-API-SECRET-KEY': secret,
                'accept': 'application/json'
            }
        });

        if (response.status === 401 || response.status === 403) {
            // console.warn("Alpaca Market Data: Unauthorized. Check keys.");
            return null;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            // If unauthorized/forbidden occurs but wasn't caught by status check (rare but possible with gateways)
            if (err.message?.toLowerCase().includes('unauthorized')) return null;

            throw new Error(`Alpaca API Error: ${err.message || response.statusText}`);
        }

        const data = await response.json();
        const stocks: Stock[] = [];

        for (const symbol of symbols) {
            const item = data[symbol];
            if (item) {
                const price = item.latestTrade?.p || item.dailyBar?.c || 0;
                const prevClose = item.prevDailyBar?.c || item.dailyBar?.o || price;
                
                let changePercent = 0;
                if (prevClose > 0) {
                    changePercent = ((price - prevClose) / prevClose) * 100;
                }

                const vol = item.dailyBar?.v || 0;
                const volStr = vol > 1000000 ? `${(vol/1000000).toFixed(1)}M` : vol > 1000 ? `${(vol/1000).toFixed(1)}K` : vol.toString();

                stocks.push({
                    symbol: symbol,
                    name: STOCK_NAMES[symbol] || symbol,
                    price: price,
                    changePercent: parseFloat(changePercent.toFixed(2)),
                    marketCap: 'N/A',
                    volume: volStr
                });
            }
        }

        return stocks.length > 0 ? stocks : null;
    } catch (e) {
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
