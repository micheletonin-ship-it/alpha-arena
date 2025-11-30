
import { Holding, Strategy, TradeAction, AgentDecision } from '../types';

/**
 * Analyzes a holding against the current market price and the SELECTED STRATEGY.
 */
export const analyzeHolding = (holding: Holding, currentPrice: number, strategy: Strategy): AgentDecision => {
  const avgPrice = holding.avgPrice;
  // Initialize peakPrice to currentPrice if it doesn't exist, or max of existing and current
  const peakPrice = Math.max(holding.peakPrice || currentPrice, currentPrice);

  let action: TradeAction = 'HOLD';
  let reason = '';
  let tradeQuantity: number | undefined;

  // Generic strategy logic (now applies to all three strategies: Conservative, Balanced, Aggressive)
  // Calculate dropFromPeak for generic strategies
  const dropFromPeak = peakPrice > 0 ? ((peakPrice - currentPrice) / peakPrice) * 100 : 0;

  // 1. Hard Stop Loss
  // strategy.stopLossPercentage is stored as 5 (for 5%), convert to 0.05
  const stopLossDecimal = strategy.stopLossPercentage / 100;
  
  if (currentPrice < avgPrice * (1 - stopLossDecimal)) {
    action = 'SELL';
    tradeQuantity = holding.quantity; // Vendere tutto
    reason = `Stop Loss triggered: Prezzo sceso del ${strategy.stopLossPercentage}% sotto costo medio ($${avgPrice.toFixed(2)}).`;
  }
  else {
      // 2. Check Dynamic Tiers (Sorted by gain threshold descending to catch highest tier first)
      // Sort tiers: highest gain threshold first
      const sortedTiers = [...strategy.takeProfitTiers].sort((a, b) => b.gainThreshold - a.gainThreshold);
      
      for (const tier of sortedTiers) {
          const tierGainDecimal = tier.gainThreshold / 100;
          const tierDropDecimal = tier.trailingDrop / 100;

          const gainPercentFromAvg = ((currentPrice - avgPrice) / avgPrice) * 100; // Recalculate for generic strategy
          
          if (gainPercentFromAvg > tier.gainThreshold && dropFromPeak >= tier.trailingDrop) {
              action = 'SELL';
              tradeQuantity = holding.quantity; // Vendere tutto
              reason = `${strategy.name}: Guadagno > ${tier.gainThreshold}% e prezzo sceso del ${tier.trailingDrop}% da picco ($${peakPrice.toFixed(2)}).`;
              break; // Stop checking lower tiers once a sale is triggered
          }
      }
  }

  return {
    action,
    reason,
    newPeakPrice: peakPrice, // Return updated peak price to save to DB
    tradeQuantity, // Quantità da scambiare (per BUY o SELL)
  };
};