import { RSI, ATR } from 'technicalindicators';

export interface CryptoSignal {
  symbol: string;
  score: number; // 0-4, quante condizioni sono soddisfatte
  conditions: {
    momentum: boolean; // +5% in 60 min
    volume: boolean; // 2x media
    lowVolatility: boolean; // ATR sotto controllo
    rsiOk: boolean; // RSI < 80
  };
  details: {
    momentumPercent: number;
    volumeRatio: number;
    atrValue: number;
    rsiValue: number;
  };
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL';
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Analizza una crypto e determina se soddisfa le condizioni Overdrive
 */
export async function analyzeCryptoOverdrive(
  symbol: string,
  historicalData: CandleData[]
): Promise<CryptoSignal> {
  // Verifica di avere dati sufficienti
  if (historicalData.length < 60) {
    return {
      symbol,
      score: 0,
      conditions: {
        momentum: false,
        volume: false,
        lowVolatility: false,
        rsiOk: false,
      },
      details: {
        momentumPercent: 0,
        volumeRatio: 0,
        atrValue: 0,
        rsiValue: 0,
      },
      recommendation: 'NEUTRAL',
    };
  }

  const currentPrice = historicalData[historicalData.length - 1].close;
  const price60MinAgo = historicalData[historicalData.length - 60].close;
  
  // 1. MOMENTUM: +5% nelle ultime 60 candele (60 min se 1-min candles)
  const momentumPercent = ((currentPrice - price60MinAgo) / price60MinAgo) * 100;
  const momentumCondition = momentumPercent >= 5;

  // 2. VOLUME: almeno 2x la media degli ultimi 20 periodi
  const recentVolumes = historicalData.slice(-20).map(c => c.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const currentVolume = historicalData[historicalData.length - 1].volume;
  const volumeRatio = currentVolume / avgVolume;
  const volumeCondition = volumeRatio >= 2.0;

  // 3. ATR (Average True Range) - Volatilità sotto controllo
  // ATR più basso = meno volatilità = trend più pulito
  const highs = historicalData.slice(-14).map(c => c.high);
  const lows = historicalData.slice(-14).map(c => c.low);
  const closes = historicalData.slice(-14).map(c => c.close);
  
  const atrResult = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  
  const atrValue = atrResult.length > 0 ? atrResult[atrResult.length - 1] : 0;
  const atrPercentage = (atrValue / currentPrice) * 100;
  // Consideriamo "sotto controllo" se ATR < 5% del prezzo
  const lowVolatilityCondition = atrPercentage < 5;

  // 4. RSI (Relative Strength Index) - Non in ipercomprato
  const closePrices = historicalData.slice(-14).map(c => c.close);
  const rsiResult = RSI.calculate({
    values: closePrices,
    period: 14,
  });
  
  const rsiValue = rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : 50;
  const rsiCondition = rsiValue < 80;

  // Calcola score (0-4)
  const score = [
    momentumCondition,
    volumeCondition,
    lowVolatilityCondition,
    rsiCondition,
  ].filter(Boolean).length;

  // Determina raccomandazione
  let recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' = 'NEUTRAL';
  if (score === 4) recommendation = 'STRONG_BUY';
  else if (score >= 3) recommendation = 'BUY';

  return {
    symbol,
    score,
    conditions: {
      momentum: momentumCondition,
      volume: volumeCondition,
      lowVolatility: lowVolatilityCondition,
      rsiOk: rsiCondition,
    },
    details: {
      momentumPercent,
      volumeRatio,
      atrValue: atrPercentage,
      rsiValue,
    },
    recommendation,
  };
}

/**
 * Fetches real candlestick data from Alpaca via backend
 */
export async function fetchCryptoCandles(symbols: string[]): Promise<Record<string, CandleData[]>> {
  try {
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    console.log('[Crypto Signals] Fetching candles for:', symbols);
    
    const response = await fetch(`${BACKEND_URL}/api/crypto/bars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols,
        timeframe: '1Min',
        limit: 120, // 2 hours of data
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch crypto candles');
    }

    const result = await response.json();
    
    console.log('[Crypto Signals] Received candles:', Object.keys(result.data).map(sym => 
      `${sym}: ${result.data[sym].length} bars`
    ));
    
    return result.data;
    
  } catch (error) {
    console.error('[Crypto Signals] Error fetching candles:', error);
    // Return empty data on error
    return symbols.reduce((acc, symbol) => {
      acc[symbol] = [];
      return acc;
    }, {} as Record<string, CandleData[]>);
  }
}

/**
 * Genera dati mock per testing (fallback quando Alpaca non disponibile)
 */
export function generateMockCandleData(symbol: string): CandleData[] {
  const candles: CandleData[] = [];
  const basePrice = symbol === 'BTCUSD' ? 45000 : symbol === 'ETHUSD' ? 2500 : 100;
  let currentPrice = basePrice;

  for (let i = 0; i < 100; i++) {
    const change = (Math.random() - 0.48) * (basePrice * 0.01); // Slight upward bias
    currentPrice += change;
    
    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * (basePrice * 0.005);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.003);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.003);
    const volume = 1000000 + Math.random() * 2000000;

    candles.push({
      timestamp: Date.now() - (100 - i) * 60000, // 1 min intervals
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}
