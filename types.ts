
import React from 'react';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // NEW: Optional avatar URL (Base64 data URL)
  accountType: 'Pro' | 'Basic';
  joinedDate: string;
  autoTradingEnabled?: boolean;
  activeStrategyId?: string;
  
  // Cloud Credentials (Encrypted)
  alpaca_key?: string;
  alpaca_secret?: string;
  alpaca_account_type?: 'paper' | 'live'; // NEW: Type of Alpaca account (paper trading or live)
  alpaca_validated?: boolean; // NEW: Whether keys have been validated
  
  // AI Credentials (Encrypted)
  gemini_key?: string;
  openai_key?: string;
  anthropic_key?: string;
  active_ai_provider?: AIProvider;

  supabaseConfig?: {
      url: string;
      key: string; 
  };
  is_admin?: boolean; // NEW: Admin flag for managing championships
  current_championship_id?: string; // UPDATED: The championship ID the user is currently focused on (undefined if none)
  stripe_public_key?: string; // NEW: Encrypted Stripe publishable key
  stripe_secret_key?: string; // NEW: Encrypted Stripe secret key
  
  // Pro Subscription (Stripe)
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive'; // NEW: Stripe subscription status
  subscriptionId?: string; // NEW: Stripe subscription ID
  subscriptionEndDate?: string; // NEW: Subscription end date
  personalPortfolioEnabled?: boolean; // NEW: Whether user has activated personal portfolio
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: string;
  volume: string;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: string;
}

export type Theme = 'light' | 'dark';

export interface Source {
  title: string;
  uri: string;
}

export interface MarketDataResponse {
  stocks: Stock[];
  sources: Source[];
  provider?: 'Alpaca' | 'Google' | 'Mock';
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  name: string;
  peakPrice?: number; // Highest price seen since holding (for trailing stop)
  strategyId?: string; // The specific strategy assigned to this holding
  // For Value Investor strategy:
  viInitialBuyPrice?: number; // Price of the very first $5000 lot (only set once)
  viLotsPurchased?: number;   // How many $5000 "buy lots" have been added (1 or 2)
  viLotAmount?: number;       // The specific lot amount ($) used for THIS holding's VI strategy
  championshipId: string; // UPDATED: Always associated with a championship
  userId?: string; // ADDED: For local storage compatibility
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'buy' | 'sell';
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  method?: string; // e.g. "Visa **** 4242"
  symbol?: string;    // New field for trade tracking
  quantity?: number;  // New field for trade tracking (Price per share)
  price?: number;     // New field for trade tracking (Price per share)
  championshipId: string; // UPDATED: Always associated with a championship
  userId?: string; // ADDED: For local storage compatibility
}

// New interfaces for AI service and news fetching
export interface AIResponse {
  text: string;
  groundingSources: Source[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  image?: { // NEW: Optional image data for multimodal chat
    data: string; // Base64 string
    mimeType: string;
  };
}

export interface CloudConfig {
  url: string;
  key: string; 
}

// --- STRATEGY TYPES ---

export interface TrailingStopTier {
  gainThreshold: number; // e.g. 5 (for 5%)
  trailingDrop: number;  // e.g. 2 (for 2%)
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  stopLossPercentage: number; // e.g. 5 (for 5%)
  takeProfitTiers: TrailingStopTier[];
  isSystem?: boolean; // Cannot be deleted
  
  // NEW: Specific config for Value Investor strategy
  valueInvestorConfig?: {
      lotAmount: number; // e.g. 5000 for $5000 per lot
      firstDipBuyPercent: number; // e.g. 5 (for 5% drop from initial to buy 2nd lot)
      recoveryTakeProfitPercent: number; // e.g. 5 (for 5% gain from initial to take profit)
      secondLotStopLossPercent?: number; // e.g. 5 (for 5% drop from avg after 2 lots)
      singleLotStopLossPercent?: number; // NEW: e.g. 15 (for 15% drop from initial if only 1 lot)
  }
}

// --- AGENT MONITOR TYPES ---

export interface AgentLog {
  id: string;
  date: string;
  symbol: string;
  action: 'SELL' | 'HOLD' | 'BUY';
  price: number;
  trigger: string; // e.g. "Stop Loss", "Trailing Tier 1"
  strategyName: string;
  details: string; // Full reasoning string
  championshipId: string; // UPDATED: Always associated with a championship
}

// --- SCANNER TYPES ---

export interface ScanResult {
  symbol: string;
  categoryId: 'strat_conservative' | 'strat_balanced' | 'strat_aggressive';
  reason: string;
}

export interface ScanReport {
  results: ScanResult[];
  source: 'AI' | 'Heuristic';
  timestamp: number;
  aiErrorMessage: string | null;
  lastScanDuration?: number; // Optional: duration of the last scan in ms
  championshipId: string; // UPDATED: Always associated with a championship
}

export type TradeAction = 'HOLD' | 'SELL' | 'BUY';

export interface AgentDecision {
  action: TradeAction;
  reason: string;
  newPeakPrice: number;
  tradeQuantity?: number; // Specific quantity to BUY or SELL
}

// --- CHAMPIONSHIP TYPES ---
export interface Championship {
  id: string;
  name: string;
  description?: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  starting_cash: number;
  enrollment_fee?: number; // NEW: Optional enrollment fee
  stripe_payment_link?: string; // NEW: Optional Stripe payment link
  status: 'pending' | 'active' | 'finished' | 'archived';
  admin_user_id: string; // User email
  created_at: string; // ISO string
  participant_emails?: string[]; // Not stored in DB but useful for UI
  
  // PRIZE POOL SYSTEM
  rake_percentage?: number; // Calculated based on participants (0.08 - 0.20)
  prize_pool?: number; // enrollment_fee × participants × (1 - rake)
  platform_commission?: number; // enrollment_fee × participants × rake
  participants_count?: number; // Real-time counter
  prize_distribution?: PrizeDistribution[]; // Breakdown of prizes
  payment_status?: 'pending' | 'collecting' | 'distributed';
  
  // TICKER WHITELIST SYSTEM
  ticker_restriction_enabled?: boolean; // Enable/disable ticker restrictions
  allowed_tickers?: string[]; // Array of allowed ticker symbols
}

// Prize distribution for championship winners
export interface PrizeDistribution {
  rank: number; // 1, 2, 3, etc.
  user_email: string | null; // null until championship ends and winners are determined
  user_name?: string; // For display purposes
  percentage: number; // Percentage of prize pool (e.g., 0.40 for 40%)
  amount: number; // Dollar amount
  paid: boolean; // Whether the prize has been paid out
  payment_date?: string; // ISO string when paid
}

// Prize pool calculation result
export interface PrizePoolInfo {
  total_collected: number; // enrollment_fee × participants_count
  rake_percentage: number; // Current rake based on participants
  platform_commission: number; // Amount going to platform
  prize_pool: number; // Amount distributed to winners
  participants_count: number;
  prize_distribution: PrizeDistribution[];
}

// NEW: Leaderboard Entry for Championships
export interface LeaderboardEntry {
  user_email: string;
  user_name: string;
  totalNetWorth: number;
  rank: number;
  // NEW Performance Indicators
  totalReturn: number; // totalNetWorth - starting_cash
  returnPercentage: number; // (totalReturn / starting_cash) * 100
  totalAssetValue: number; // Sum of current value of holdings
  totalTrades: number; // Count of buy/sell transactions
}

// --- PERSONAL PORTFOLIO & ALPACA TRADING TYPES ---

// Trading context type - determines where user is operating
export type TradingContextType = 'championship' | 'personal-portfolio';

export interface TradingContext {
  type: TradingContextType;
  id: string; // Championship ID or 'personal-portfolio'
  name: string; // Display name
}

// Alpaca Order for real trading
export interface AlpacaOrder {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  client_order_id?: string;
}

// Alpaca Position (real holding from Alpaca API)
export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  avg_entry_price: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

// Alpaca Account Info
export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}

// Alpaca Order Response
export interface AlpacaOrderResponse {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: string | null;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: 'new' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace';
  extended_hours: boolean;
  legs: any | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

// Validation result for Alpaca credentials
export interface AlpacaCredentialsValidation {
  valid: boolean;
  accountType: 'paper' | 'live';
  accountInfo?: AlpacaAccount;
  error?: string;
}
