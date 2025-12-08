const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
require('dotenv').config();
const { savePayment, joinChampionship, getChampionshipById } = require('./database');
const { decrypt } = require('./security');

// Initialize Supabase Admin Client (with Service Role Key for admin operations)
let supabaseAdmin = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  console.log('✅ Supabase Admin client initialized');
} else {
  console.warn('⚠️  Supabase Admin credentials not found. User management endpoints will not work.');
}

// Stock names mapping
const STOCK_NAMES = {
    'AAPL': 'Apple Inc.', 'NVDA': 'NVIDIA Corp.', 'MSFT': 'Microsoft Corp.',
    'TSLA': 'Tesla Inc.', 'AMZN': 'Amazon.com Inc.', 'GOOGL': 'Alphabet Inc.',
    'META': 'Meta Platforms', 'JPM': 'JPMorgan Chase & Co.', 'BAC': 'Bank of America Corp.',
    'JNJ': 'Johnson & Johnson', 'LLY': 'Eli Lilly and Company', 'V': 'Visa Inc.',
    'MA': 'Mastercard Incorporated', 'WMT': 'Walmart Inc.', 'PG': 'Procter & Gamble Co.',
    'XOM': 'Exxon Mobil Corporation', 'BRK.B': 'Berkshire Hathaway Inc. Class B',
    'UNH': 'UnitedHealth Group Incorporated', 'HD': 'The Home Depot, Inc.',
    'CVX': 'Chevron Corporation', 'PFE': 'Pfizer Inc.', 'ABBV': 'AbbVie Inc.',
    'COST': 'Costco Wholesale Corporation', 'ORCL': 'Oracle Corporation',
    'CRM': 'Salesforce, Inc.', 'MCD': 'McDonald\'s Corporation', 'KO': 'The Coca-Cola Company',
    'PEP': 'PepsiCo, Inc.', 'CSCO': 'Cisco Systems, Inc.', 'ACN': 'Accenture plc',
    'NFLX': 'Netflix, Inc.', 'ADBE': 'Adobe Inc.', 'NKE': 'NIKE, Inc.',
    'AMD': 'Advanced Micro Devices, Inc.', 'QCOM': 'QUALCOMM Incorporated',
    'T': 'AT&T Inc.', 'TMUS': 'T-Mobile US, Inc.', 'INTC': 'Intel Corporation',
    'GE': 'General Electric Company', 'IBM': 'International Business Machines Corporation',
    'AMGN': 'Amgen Inc.', 'BKNG': 'Booking Holdings Inc.', 'C': 'Citigroup Inc.',
    'GS': 'The Goldman Sachs Group, Inc.', 'BA': 'The Boeing Company',
    'CAT': 'Caterpillar Inc.', 'HON': 'Honeywell International Inc.',
    'LMT': 'Lockheed Martin Corporation', 'RTX': 'RTX Corporation',
    'GD': 'General Dynamics Corporation', 'NOC': 'Northrop Grumman Corporation',
    'DHR': 'Danaher Corporation', 'SYK': 'Stryker Corporation',
    'ISRG': 'Intuitive Surgical, Inc.', 'ABT': 'Abbott Laboratories',
    'TMO': 'Thermo Fisher Scientific Inc.', 'COP': 'ConocoPhillips',
    'EOG': 'EOG Resources, Inc.', 'F': 'Ford Motor Company', 'GM': 'General Motors Company',
    'KMI': 'Kinder Morgan, Inc.', 'EXC': 'Exelon Corporation', 'SO': 'The Southern Company',
    'DUK': 'Duke Energy Corporation', 'AEP': 'American Electric Power Company, Inc.',
    'NEE': 'NextEra Energy, Inc.', 'WFC': 'Wells Fargo & Company',
    'AXP': 'American Express Company', 'MRK': 'Merck & Co., Inc.',
    'PYPL': 'PayPal Holdings, Inc.', 'SBUX': 'Starbucks Corporation',
    'LOW': 'Lowe\'s Companies, Inc.', 'TJX': 'The TJX Companies, Inc.',
    'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', 'BNB-USD': 'Binance Coin',
    'SOL-USD': 'Solana', 'ADA-USD': 'Cardano', 'XRP-USD': 'Ripple',
    'DOGE-USD': 'Dogecoin', 'DOT-USD': 'Polkadot', 'MATIC-USD': 'Polygon',
    'AVAX-USD': 'Avalanche', 'BTCUSD': 'Bitcoin', 'ETHUSD': 'Ethereum',
    'BNBUSD': 'Binance Coin', 'SOLUSD': 'Solana', 'ADAUSD': 'Cardano',
    'XRPUSD': 'Ripple', 'DOGEUSD': 'Dogecoin', 'DOTUSD': 'Polkadot',
    'MATICUSD': 'Polygon', 'AVAXUSD': 'Avalanche'
};

const app = express();
const PORT = process.env.PORT || 3001;

// ===== MARKET DATA CACHE (IN-MEMORY) =====
// Global cache to reduce Alpaca API calls with multiple users
const marketDataCache = {
  data: null,
  timestamp: 0,
  requestedSymbols: [], // Track which symbols were in the cached request
  CACHE_DURATION: 30000 // 30 seconds - same as frontend polling
};

// Helper function to check if cache is valid for requested symbols
function isCacheValid(requestedSymbols) {
  const now = Date.now();
  const cacheAge = now - marketDataCache.timestamp;
  
  // Cache is invalid if:
  // 1. No cached data exists
  // 2. Cache is older than CACHE_DURATION
  // 3. Requested symbols don't match cached symbols (different user needs)
  if (!marketDataCache.data || cacheAge >= marketDataCache.CACHE_DURATION) {
    return false;
  }
  
  // Check if all requested symbols are in the cache
  const cachedSymbolsSet = new Set(marketDataCache.requestedSymbols);
  const allSymbolsCached = requestedSymbols.every(s => cachedSymbolsSet.has(s));
  
  // If requested symbols are a subset of cached symbols, cache is valid
  // This allows serving smaller requests from a larger cached dataset
  return allSymbolsCached;
}

// CORS Configuration - Dynamic for Railway
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// For webhook endpoint, we need raw body
app.use('/api/webhook', bodyParser.raw({ type: 'application/json' }));

// For all other endpoints, use JSON parser
app.use(bodyParser.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Alpaca Market Data Proxy
 * This endpoint fetches market data from Alpaca API
 * and returns it to the frontend
 */
app.post('/api/market-data', async (req, res) => {
  try {
    const { symbols } = req.body;

    console.log('[Alpaca Proxy] ===== REQUEST START =====');
    console.log('[Alpaca Proxy] Request received for symbols:', symbols);
    console.log('[Alpaca Proxy] Total symbols requested:', symbols?.length);

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid symbols array',
        stocks: []
      });
    }

    // If symbols array is empty, return empty result immediately
    if (symbols.length === 0) {
      console.log('[Alpaca Proxy] No symbols provided, returning empty result');
      return res.json({
        success: true,
        stocks: [],
        provider: 'Alpaca'
      });
    }

    // ===== CHECK CACHE FIRST =====
    if (isCacheValid(symbols)) {
      const now = Date.now();
      const cacheAge = now - marketDataCache.timestamp;
      console.log(`[Alpaca Proxy] 📦 CACHE HIT! Serving cached data (age: ${Math.round(cacheAge/1000)}s)`);
      
      // Filter cached data to return only requested symbols
      const requestedSymbolsSet = new Set(symbols.map(s => s.toUpperCase()));
      const filteredStocks = marketDataCache.data.stocks.filter(stock => 
        requestedSymbolsSet.has(stock.symbol.toUpperCase())
      );
      
      return res.json({
        success: true,
        stocks: filteredStocks,
        provider: 'Alpaca',
        cached: true,
        cacheAge: Math.round(cacheAge/1000) // Return age in seconds
      });
    }

    console.log('[Alpaca Proxy] 🔄 CACHE MISS - Fetching fresh data from Alpaca...');

    // Read Alpaca credentials from environment
    const ALPACA_KEY = process.env.ALPACA_KEY;
    const ALPACA_SECRET = process.env.ALPACA_SECRET;

    console.log('[Alpaca Proxy] Credentials check:', {
      hasKey: !!ALPACA_KEY,
      hasSecret: !!ALPACA_SECRET
    });

    if (!ALPACA_KEY || !ALPACA_SECRET) {
      return res.status(500).json({ 
        success: false,
        error: 'Alpaca credentials not configured on server',
        message: 'Please configure ALPACA_KEY and ALPACA_SECRET environment variables',
        stocks: []
      });
    }

    // Separate stocks and crypto
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'MATIC', 'AVAX'];
    const stockSymbols = [];
    const cryptoRequestSymbols = [];
    const symbolMapping = {}; // Keep track of original symbols
    
    symbols.forEach(symbol => {
      const cleanSymbol = symbol.replace('-', '').toUpperCase();
      const isCrypto = cryptoSymbols.includes(cleanSymbol.replace('USD', ''));
      
      symbolMapping[cleanSymbol] = symbol; // Store original format
      
      if (isCrypto) {
        cryptoRequestSymbols.push(cleanSymbol);
      } else {
        stockSymbols.push(cleanSymbol);
      }
    });

    console.log('[Alpaca Proxy] Categorized symbols:', {
      stocks: stockSymbols,
      crypto: cryptoRequestSymbols
    });

    const allStocks = [];

    // Fetch stocks data
    if (stockSymbols.length > 0) {
      const stocksUrl = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${stockSymbols.join(',')}&feed=iex`;
      
      const stocksResponse = await fetch(stocksUrl, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET,
          'accept': 'application/json'
        }
      });

      if (stocksResponse.ok) {
        const stocksData = await stocksResponse.json();
        
        console.log('[Alpaca Proxy] Stocks response keys:', Object.keys(stocksData));
        
        for (const symbol of stockSymbols) {
          const item = stocksData[symbol];
          if (item) {
            const price = item.latestTrade?.p || item.dailyBar?.c || 0;
            // Use previous day's close for accurate daily change calculation (matches Google Finance)
            const prevClose = item.prevDailyBar?.c || item.dailyBar?.o || price;
            const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
            const vol = item.dailyBar?.v || 0;
            const volStr = vol > 1000000 ? `${(vol/1000000).toFixed(1)}M` : vol > 1000 ? `${(vol/1000).toFixed(1)}K` : vol.toString();

            const originalSymbol = symbolMapping[symbol] || symbol;
            const stockName = STOCK_NAMES[symbol] || STOCK_NAMES[originalSymbol] || `${symbol} Corp`;

            allStocks.push({
              symbol: originalSymbol,
              name: stockName,
              price: price,
              changePercent: parseFloat(changePercent.toFixed(2)),
              marketCap: 'N/A',
              volume: volStr
            });
            
            console.log(`[Alpaca Proxy] Added stock: ${originalSymbol} (${stockName})`);
          } else {
            console.log(`[Alpaca Proxy] No data for stock: ${symbol}`);
          }
        }
      } else {
        console.error('[Alpaca Proxy] Stocks API error:', stocksResponse.status, stocksResponse.statusText);
      }
    }

    // Fetch crypto data with historical data for accurate daily change calculation
    if (cryptoRequestSymbols.length > 0) {
      const cryptoUrlSymbols = cryptoRequestSymbols.map(s => {
        if (s.length > 3 && s.endsWith('USD')) {
          const base = s.substring(0, s.length - 3);
          return `${base}/USD`;
        }
        return s;
      });
      
      // Calculate date range: from yesterday to today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2); // Get 2 days of data to ensure we have yesterday
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      // Fetch historical bars to get previous day's close
      const cryptoHistUrl = `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${cryptoUrlSymbols.join(',')}&timeframe=1Day&start=${startStr}&end=${endStr}`;
      
      const cryptoHistResponse = await fetch(cryptoHistUrl, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET,
          'accept': 'application/json'
        }
      });

      if (cryptoHistResponse.ok) {
        const cryptoHistData = await cryptoHistResponse.json();
        const historicalBars = cryptoHistData.bars || {};
        
        console.log('[Alpaca Proxy] Crypto historical data symbols:', Object.keys(historicalBars));
        
        // Now fetch current prices
        const cryptoUrl = `https://data.alpaca.markets/v1beta3/crypto/us/latest/bars?symbols=${cryptoUrlSymbols.join(',')}`;
        
        const cryptoResponse = await fetch(cryptoUrl, {
          headers: {
            'APCA-API-KEY-ID': ALPACA_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET,
            'accept': 'application/json'
          }
        });

        if (cryptoResponse.ok) {
          const cryptoData = await cryptoResponse.json();
          const currentBars = cryptoData.bars || {};
          
          cryptoUrlSymbols.forEach((symbolWithSlash, index) => {
            const currentBar = currentBars[symbolWithSlash];
            const histBars = historicalBars[symbolWithSlash] || [];
            
            if (currentBar) {
              const originalSymbol = cryptoRequestSymbols[index];
              const mappedSymbol = symbolMapping[originalSymbol] || originalSymbol;
              const price = currentBar.c || 0;
              
              // Get previous day's close from historical data
              let prevClose = currentBar.o; // fallback to current open
              if (histBars.length >= 2) {
                // Get the second-to-last bar (yesterday's close)
                prevClose = histBars[histBars.length - 2].c;
              } else if (histBars.length === 1) {
                // Only have one historical bar, use its close
                prevClose = histBars[0].c;
              }
              
              const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
              const vol = currentBar.v || 0;
              const volStr = vol > 1000000 ? `${(vol/1000000).toFixed(1)}M` : vol > 1000 ? `${(vol/1000).toFixed(1)}K` : vol.toString();

              const cryptoName = STOCK_NAMES[originalSymbol] || STOCK_NAMES[mappedSymbol] || `${originalSymbol.replace('USD', '')} Crypto`;

              allStocks.push({
                symbol: mappedSymbol,
                name: cryptoName,
                price: parseFloat(price.toFixed(2)),
                changePercent: parseFloat(changePercent.toFixed(2)),
                marketCap: 'N/A',
                volume: volStr
              });
              
              console.log(`[Alpaca Proxy] Added crypto: ${mappedSymbol} - Current: $${price}, PrevClose: $${prevClose}, Change: ${changePercent.toFixed(2)}%`);
            } else {
              console.log(`[Alpaca Proxy] No current data for crypto: ${symbolWithSlash}`);
            }
          });
        } else {
          console.error('[Alpaca Proxy] Crypto current API error:', cryptoResponse.status, cryptoResponse.statusText);
        }
      } else {
        console.error('[Alpaca Proxy] Crypto historical API error:', cryptoHistResponse.status, cryptoHistResponse.statusText);
      }
    }

    console.log(`[Alpaca Proxy] ===== SUMMARY =====`);
    console.log(`[Alpaca Proxy] Requested: ${symbols.length} symbols`);
    console.log(`[Alpaca Proxy] Returned: ${allStocks.length} stocks`);
    console.log(`[Alpaca Proxy] Missing: ${symbols.length - allStocks.length} symbols`);
    
    if (symbols.length !== allStocks.length) {
      const returnedSymbols = allStocks.map(s => s.symbol);
      const missingSymbols = symbols.filter(s => !returnedSymbols.includes(s));
      console.log('[Alpaca Proxy] MISSING SYMBOLS:', missingSymbols);
    }
    
    // ===== SAVE TO CACHE =====
    const responseData = {
      success: true,
      stocks: allStocks,
      provider: 'Alpaca'
    };
    
    marketDataCache.data = responseData;
    marketDataCache.timestamp = Date.now();
    marketDataCache.requestedSymbols = symbols.map(s => s.toUpperCase());
    
    console.log('[Alpaca Proxy] ✅ Data cached successfully for 30 seconds');
    console.log('[Alpaca Proxy] ===== REQUEST END =====');
    
    res.json({
      ...responseData,
      cached: false
    });

  } catch (error) {
    console.error('[Alpaca Proxy Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch market data',
      message: error.message 
    });
  }
});

/**
 * Create Payment Intent
 * This endpoint creates a Stripe PaymentIntent for championship enrollment
 */
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, championshipId, stripeSecretKey } = req.body;

    // Validate required fields
    if (!amount || !currency || !championshipId || !stripeSecretKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, currency, championshipId, stripeSecretKey' 
      });
    }

    // Validate amount (must be positive integer in cents)
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 50) { // Stripe minimum is 50 cents
      return res.status(400).json({ 
        error: 'Amount must be at least 0.50 USD' 
      });
    }

    // Initialize Stripe with the admin's secret key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        championshipId: championshipId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('[Stripe API Error]:', error.message);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid Stripe API key',
        message: 'The Stripe secret key provided is invalid or expired.'
      });
    }
    
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        success: false,
        error: 'Card error',
        message: error.message 
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false,
      error: 'Payment processing failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * Confirm Payment
 * This endpoint confirms a payment using the PaymentIntent ID
 */
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, stripeSecretKey } = req.body;

    if (!paymentIntentId || !stripeSecretKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: paymentIntentId, stripeSecretKey' 
      });
    }

    // Initialize Stripe with the admin's secret key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Retrieve the PaymentIntent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      success: true,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

  } catch (error) {
    console.error('[Stripe Confirm Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Payment confirmation failed',
      message: error.message 
    });
  }
});

/**
 * Stripe Webhook Handler
 * This endpoint receives events from Stripe webhooks
 * Remember to configure this URL in your Stripe Dashboard: https://dashboard.stripe.com/webhooks
 */
app.post('/api/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;

  try {
    // Verify webhook signature
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
      apiVersion: '2023-10-16',
    });
    
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      try {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata;
        
        console.log('[Webhook] PaymentIntent succeeded:', paymentIntent.id);
        console.log('[Webhook] Metadata:', metadata);

        // 1. Save payment to database
        await savePayment({
          id: `payment_${Date.now()}`,
          user_email: metadata.userEmail,
          championship_id: metadata.championshipId,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert cents to dollars
          currency: paymentIntent.currency,
          status: 'succeeded',
          payment_method: paymentIntent.payment_method_types?.[0] || 'card',
        });
        console.log('[Webhook] Payment saved to database');

        // 2. Get championship details and auto-enroll user
        const championship = await getChampionshipById(metadata.championshipId);
        if (championship) {
          await joinChampionship(metadata.userEmail, {
            id: championship.id,
            starting_cash: parseFloat(championship.starting_cash),
          });
          console.log('[Webhook] User enrolled in championship');
        } else {
          console.error('[Webhook] Championship not found:', metadata.championshipId);
        }

        // 3. TODO: Send confirmation email
        // await sendEnrollmentEmail(metadata.userEmail, championship);

      } catch (error) {
        console.error('[Webhook] Error processing succeeded payment:', error);
        // Don't return error to Stripe, we've logged it
      }
      break;

    case 'payment_intent.payment_failed':
      try {
        const failedPayment = event.data.object;
        const metadata = failedPayment.metadata;
        
        console.log('[Webhook] Payment failed:', failedPayment.id);
        console.log('[Webhook] Failure reason:', failedPayment.last_payment_error?.message);

        // Save failed payment to database
        await savePayment({
          id: `payment_${Date.now()}`,
          user_email: metadata.userEmail,
          championship_id: metadata.championshipId,
          stripe_payment_intent_id: failedPayment.id,
          amount: failedPayment.amount / 100,
          currency: failedPayment.currency,
          status: 'failed',
          payment_method: failedPayment.payment_method_types?.[0] || 'card',
        });
        console.log('[Webhook] Failed payment logged to database');

        // TODO: Send failure notification email
        // await sendPaymentFailedEmail(metadata.userEmail, failedPayment.last_payment_error?.message);

      } catch (error) {
        console.error('[Webhook] Error processing failed payment:', error);
      }
      break;

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

// ===== ADMIN USER MANAGEMENT ENDPOINTS =====

/**
 * Get All Users (Admin only)
 * Returns list of all users with their profiles
 */
app.get('/api/admin/users', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase Admin not initialized. Configure SUPABASE_SERVICE_KEY.' 
    });
  }

  try {
    console.log('[Admin] Fetching all users...');

    // Get all auth users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('[Admin] Error fetching users:', authError.message);
      return res.status(500).json({ 
        success: false,
        error: authError.message 
      });
    }

    console.log(`[Admin] Found ${users.length} auth users`);

    // Enrich with user_profiles data
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      try {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('name, is_admin, account_type')
          .eq('email', user.email)
          .single();
        
        return {
          id: user.id,
          email: user.email,
          name: profile?.name || 'N/A',
          is_admin: profile?.is_admin || false,
          account_type: profile?.account_type || 'Basic',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          banned: user.banned_until ? true : false,
          banned_until: user.banned_until || null
        };
      } catch (err) {
        console.error(`[Admin] Error enriching user ${user.email}:`, err.message);
        return {
          id: user.id,
          email: user.email,
          name: 'N/A',
          is_admin: false,
          account_type: 'Basic',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          banned: user.banned_until ? true : false,
          banned_until: user.banned_until || null
        };
      }
    }));

    console.log(`[Admin] Returning ${enrichedUsers.length} enriched users`);
    
    res.json({ 
      success: true,
      users: enrichedUsers 
    });

  } catch (error) {
    console.error('[Admin] Get users error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

/**
 * Disable/Ban User (Admin only)
 * Bans a user for a very long time (effectively permanent)
 */
app.post('/api/admin/users/:id/disable', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase Admin not initialized' 
    });
  }

  try {
    const { id } = req.params;
    console.log(`[Admin] Disabling user: ${id}`);

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { ban_duration: '876000h' } // ~100 years = permanent ban
    );
    
    if (error) {
      console.error('[Admin] Error disabling user:', error.message);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }

    console.log(`[Admin] User ${id} disabled successfully`);
    
    res.json({ 
      success: true,
      message: 'User disabled successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        banned: true
      }
    });

  } catch (error) {
    console.error('[Admin] Disable user error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to disable user',
      message: error.message 
    });
  }
});

/**
 * Enable/Unban User (Admin only)
 * Removes ban from a user
 */
app.post('/api/admin/users/:id/enable', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase Admin not initialized' 
    });
  }

  try {
    const { id } = req.params;
    console.log(`[Admin] Enabling user: ${id}`);

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { ban_duration: 'none' }
    );
    
    if (error) {
      console.error('[Admin] Error enabling user:', error.message);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }

    console.log(`[Admin] User ${id} enabled successfully`);
    
    res.json({ 
      success: true,
      message: 'User enabled successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        banned: false
      }
    });

  } catch (error) {
    console.error('[Admin] Enable user error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to enable user',
      message: error.message 
    });
  }
});

/**
 * Delete User (Admin only)
 * Permanently deletes a user and all associated data
 */
app.delete('/api/admin/users/:id', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase Admin not initialized' 
    });
  }

  try {
    const { id } = req.params;
    console.log(`[Admin] Deleting user: ${id}`);

    // First get user email for cascade deletion
    const { data: user, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (getUserError) {
      console.error('[Admin] Error getting user:', getUserError.message);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userEmail = user.user.email;
    console.log(`[Admin] User email: ${userEmail}`);

    // Delete associated data from database (cascade)
    try {
      // Delete user profile
      await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('email', userEmail);
      console.log(`[Admin] Deleted user_profile for ${userEmail}`);

      // Delete transactions
      await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('user_email', userEmail);
      console.log(`[Admin] Deleted transactions for ${userEmail}`);

      // Delete holdings
      await supabaseAdmin
        .from('holdings')
        .delete()
        .eq('user_email', userEmail);
      console.log(`[Admin] Deleted holdings for ${userEmail}`);

      // Delete championship participations
      await supabaseAdmin
        .from('championship_participation')
        .delete()
        .eq('user_email', userEmail);
      console.log(`[Admin] Deleted championship_participation for ${userEmail}`);

    } catch (dbError) {
      console.error('[Admin] Error deleting user data:', dbError.message);
      // Continue with auth deletion even if DB cleanup fails
    }

    // Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (deleteError) {
      console.error('[Admin] Error deleting auth user:', deleteError.message);
      return res.status(500).json({ 
        success: false,
        error: deleteError.message 
      });
    }

    console.log(`[Admin] User ${id} (${userEmail}) deleted successfully`);
    
    res.json({ 
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('[Admin] Delete user error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user',
      message: error.message 
    });
  }
});

/**
 * Upgrade User to Pro Account (Admin only)
 * Updates user's accountType to 'Pro' in user_profiles
 */
app.post('/api/admin/users/:id/upgrade-pro', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase Admin not initialized' 
    });
  }

  try {
    const { id } = req.params;
    console.log(`[Admin] Upgrading user to Pro: ${id}`);

    // Get user email from auth
    const { data: user, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (getUserError || !user) {
      console.error('[Admin] Error getting user:', getUserError?.message);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userEmail = user.user.email;
    console.log(`[Admin] User email: ${userEmail}`);

    // Update user_profiles to set accountType = 'Pro'
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        account_type: 'Pro',
        personal_portfolio_enabled: false // Default to disabled, user must enable it in Settings
      })
      .eq('email', userEmail)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin] Error updating user profile:', updateError.message);
      return res.status(500).json({ 
        success: false,
        error: updateError.message 
      });
    }

    console.log(`[Admin] User ${userEmail} upgraded to Pro successfully`);
    
    res.json({ 
      success: true,
      message: 'User upgraded to Pro successfully',
      user: {
        id: user.user.id,
        email: userEmail,
        accountType: 'Pro'
      }
    });

  } catch (error) {
    console.error('[Admin] Upgrade user error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upgrade user',
      message: error.message 
    });
  }
});

/**
 * Downgrade User to Basic Account (Admin only)
 * Updates user's accountType to 'Basic' in user_profiles
 */
app.post('/api/admin/users/:id/downgrade-basic', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase Admin not initialized' 
    });
  }

  try {
    const { id } = req.params;
    console.log(`[Admin] Downgrading user to Basic: ${id}`);

    // Get user email from auth
    const { data: user, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (getUserError || !user) {
      console.error('[Admin] Error getting user:', getUserError?.message);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userEmail = user.user.email;
    console.log(`[Admin] User email: ${userEmail}`);

    // Update user_profiles to set accountType = 'Basic'
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        account_type: 'Basic',
        personal_portfolio_enabled: false, // Disable personal portfolio
        alpaca_key: null, // Clear Alpaca keys for security
        alpaca_secret: null,
        alpaca_account_type: null
      })
      .eq('email', userEmail)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin] Error updating user profile:', updateError.message);
      return res.status(500).json({ 
        success: false,
        error: updateError.message 
      });
    }

    console.log(`[Admin] User ${userEmail} downgraded to Basic successfully`);
    
    res.json({ 
      success: true,
      message: 'User downgraded to Basic successfully',
      user: {
        id: user.user.id,
        email: userEmail,
        accountType: 'Basic'
      }
    });

  } catch (error) {
    console.error('[Admin] Downgrade user error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to downgrade user',
      message: error.message 
    });
  }
});

/**
 * Clear Scanner Cache Endpoint
 * Clears the scanner cache for a specific championship or all championships
 */
app.delete('/api/scanner/cache/:championshipId?', async (req, res) => {
  try {
    const { championshipId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ 
        success: false,
        error: 'Supabase Admin not initialized' 
      });
    }

    console.log(`[Scanner Cache] Clearing cache${championshipId ? ` for championship ${championshipId}` : ' for ALL championships'}...`);

    let result;
    if (championshipId) {
      // Clear cache for specific championship
      result = await supabaseAdmin
        .from('scanner_cache')
        .delete()
        .eq('championship_id', championshipId);
    } else {
      // Clear all cache
      result = await supabaseAdmin
        .from('scanner_cache')
        .delete()
        .neq('championship_id', ''); // Delete all records
    }

    if (result.error) {
      console.error('[Scanner Cache] Error clearing cache:', result.error.message);
      return res.status(500).json({
        success: false,
        error: result.error.message
      });
    }

    console.log(`[Scanner Cache] Cache cleared successfully`);

    res.json({
      success: true,
      message: championshipId 
        ? `Cache cleared for championship ${championshipId}` 
        : 'All scanner cache cleared'
    });

  } catch (error) {
    console.error('[Scanner Cache Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear scanner cache',
      message: error.message 
    });
  }
});

/**
 * AI Scanner Endpoint - Centralized Market Analysis
 * Analyzes stocks with AI and caches results per championship for 24h
 */
app.post('/api/scanner/analyze', async (req, res) => {
  try {
    const { championshipId, tickers, marketData } = req.body;

    console.log('[Scanner AI] Request received:', {
      championshipId,
      tickersCount: tickers?.length,
      marketDataCount: marketData?.length
    });

    if (!tickers || !championshipId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: tickers, championshipId' 
      });
    }

    // Check cache first (24h validity)
    if (supabaseAdmin) {
      const { data: cached } = await supabaseAdmin
        .from('scanner_cache')
        .select('*')
        .eq('championship_id', championshipId)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (cacheAge < twentyFourHours) {
          console.log(`[Scanner AI] Cache HIT for championship ${championshipId}`);
          return res.json({
            success: true,
            results: cached.results,
            source: 'AI',
            timestamp: cached.timestamp,
            cached: true
          });
        }
      }
    }

    console.log('[Scanner AI] Cache MISS - performing AI analysis');

    // Use OpenAI API
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_KEY) {
      console.error('[Scanner AI] OPENAI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'AI service not configured',
        message: 'Please configure OPENAI_API_KEY environment variable'
      });
    }

    // Dynamic opportunity limit based on ticker count (80% of tickers, max 20)
    const maxOpportunities = Math.min(Math.ceil(tickers.length * 0.8), 20);
    console.log(`[Scanner AI] Dynamic limit: ${maxOpportunities} opportunities (80% of ${tickers.length} tickers)`);

    // Build AI prompt with market data
    const stockList = marketData ? marketData.map(s => 
      `${s.symbol} (${s.name}): $${s.price}, ${s.changePercent > 0 ? '+' : ''}${s.changePercent}%, Vol: ${s.volume}`
    ).join('\n') : tickers.join(', ');

    const prompt = `Sei un analista finanziario esperto. Analizza questi ${tickers.length} titoli e identifica le migliori opportunità di trading.

Stock List:
${stockList}

Classifica i titoli in 3 categorie strategiche:
1. **Conservative** (strat_conservative): Basso rischio, stabilità, titoli difensivi, volatilità bassa
2. **Balanced** (strat_balanced): Rischio/reward moderato, crescita stabile, buon compromesso
3. **Aggressive** (strat_aggressive): Alto rischio, alta crescita potenziale, volatilità elevata

Criteri di valutazione:
- Trend di prezzo recente e momentum
- Volatilità e stabilità storica
- Volume di scambio (interesse del mercato)
- Caratteristiche settoriali (tech = aggressive, utilities = conservative, etc.)
- Risk/reward profile

Seleziona massimo ${maxOpportunities} opportunità TOTALI (distribuite tra le 3 categorie).
Per ogni opportunità, fornisci una ragione dettagliata e convincente (2-3 frasi).

Rispondi SOLO in formato JSON valido:
{
  "results": [
    {
      "symbol": "AAPL",
      "categoryId": "strat_conservative",
      "reason": "Apple mostra stabilità eccellente con volatilità contenuta. Leader tecnologico con business model diversificato e cash flow robusto. Ideale per profilo conservativo."
    }
  ]
}`;

    console.log('[Scanner AI] Calling OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional financial analyst. Always respond in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiText = openaiData.choices[0]?.message?.content || '{}';
    const analysisData = JSON.parse(aiText);
    const results = analysisData.results || [];

    console.log(`[Scanner AI] AI analysis completed: ${results.length} opportunities found`);

    // Cache results for 24h
    if (supabaseAdmin && results.length > 0) {
      const { error: cacheError } = await supabaseAdmin
        .from('scanner_cache')
        .upsert({
          championship_id: championshipId,
          results: results,
          timestamp: new Date().toISOString()
        }, {
          onConflict: 'championship_id'
        });

      if (cacheError) {
        console.error('[Scanner AI] Cache save error:', cacheError.message);
      } else {
        console.log('[Scanner AI] Results cached successfully');
      }
    }

    res.json({
      success: true,
      results: results,
      source: 'AI',
      timestamp: Date.now(),
      cached: false
    });

  } catch (error) {
    console.error('[Scanner AI Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'AI analysis failed',
      message: error.message 
    });
  }
});

/**
 * Run Scanner On-Demand (Admin only)
 * Triggers an immediate AI scan for a championship using admin's OpenAI key
 */
app.post('/api/scanner/run/:championshipId', async (req, res) => {
  try {
    const { championshipId } = req.params;
    const { adminUserId } = req.body;

    console.log(`[Scanner Run] Admin ${adminUserId} requesting scan for championship ${championshipId}`);

    if (!adminUserId || !championshipId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: adminUserId, championshipId' 
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ 
        success: false,
        error: 'Supabase Admin not initialized' 
      });
    }

    // Get admin's OpenAI key from user_profiles
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('openai_key')
      .eq('email', adminUserId)
      .single();

    if (profileError || !adminProfile || !adminProfile.openai_key) {
      console.error('[Scanner Run] Admin OpenAI key not found');
      return res.status(400).json({
        success: false,
        error: 'OpenAI key not configured',
        message: 'Please configure your OpenAI API key in Settings before running a scan.'
      });
    }

    // Decrypt the admin's OpenAI key (it's stored encrypted in the DB)
    const encryptedKey = adminProfile.openai_key;
    const openaiKey = decrypt(encryptedKey);

    if (!openaiKey || !openaiKey.startsWith('sk-')) {
      console.error('[Scanner Run] Invalid OpenAI key after decryption');
      return res.status(400).json({
        success: false,
        error: 'Invalid OpenAI key',
        message: 'The decrypted OpenAI key appears to be invalid. Please reconfigure your key in Settings.'
      });
    }

    console.log('[Scanner Run] Admin OpenAI key decrypted successfully, starting scan...');

    // Get championship details to get allowed tickers
    const { data: championship, error: champError } = await supabaseAdmin
      .from('championships')
      .select('name, allowed_tickers')
      .eq('id', championshipId)
      .single();

    if (champError || !championship) {
      return res.status(404).json({
        success: false,
        error: 'Championship not found'
      });
    }

    const tickers = championship.allowed_tickers || [];
    
    if (tickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tickers configured for this championship'
      });
    }

    console.log(`[Scanner Run] Championship "${championship.name}" has ${tickers.length} tickers`);

    // Dynamic opportunity limit based on ticker count (80% of tickers, max 20)
    const maxOpportunities = Math.min(Math.ceil(tickers.length * 0.8), 20);
    console.log(`[Scanner Run] Dynamic limit: ${maxOpportunities} opportunities (80% of ${tickers.length} tickers)`);

    // Build AI prompt
    const prompt = `Sei un analista finanziario esperto. Analizza questi ${tickers.length} titoli e identifica le migliori opportunità di trading.

Stock List:
${tickers.join(', ')}

Classifica i titoli in 3 categorie strategiche:
1. **Conservative** (strat_conservative): Basso rischio, stabilità, titoli difensivi, volatilità bassa
2. **Balanced** (strat_balanced): Rischio/reward moderato, crescita stabile, buon compromesso
3. **Aggressive** (strat_aggressive): Alto rischio, alta crescita potenziale, volatilità elevata

Criteri di valutazione:
- Trend di prezzo recente e momentum
- Volatilità e stabilità storica
- Volume di scambio (interesse del mercato)
- Caratteristiche settoriali (tech = aggressive, utilities = conservative, etc.)
- Risk/reward profile

Seleziona massimo ${maxOpportunities} opportunità TOTALI (distribuite tra le 3 categorie).
Per ogni opportunità, fornisci una ragione dettagliata e convincente (2-3 frasi).

Rispondi SOLO in formato JSON valido:
{
  "results": [
    {
      "symbol": "AAPL",
      "categoryId": "strat_conservative",
      "reason": "Apple mostra stabilità eccellente con volatilità contenuta. Leader tecnologico con business model diversificato e cash flow robusto. Ideale per profilo conservativo."
    }
  ]
}`;

    console.log('[Scanner Run] Calling OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional financial analyst. Always respond in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('[Scanner Run] OpenAI error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiText = openaiData.choices[0]?.message?.content || '{}';
    const analysisData = JSON.parse(aiText);
    const results = analysisData.results || [];

    console.log(`[Scanner Run] AI analysis completed: ${results.length} opportunities found`);

    // Cache results for 24h
    if (results.length > 0) {
      const { error: cacheError } = await supabaseAdmin
        .from('scanner_cache')
        .upsert({
          championship_id: championshipId,
          results: results,
          timestamp: new Date().toISOString(),
          source: 'AI'
        }, {
          onConflict: 'championship_id'
        });

      if (cacheError) {
        console.error('[Scanner Run] Cache save error:', cacheError.message);
      } else {
        console.log('[Scanner Run] Results cached successfully');
      }
    }

    res.json({
      success: true,
      opportunitiesCount: results.length,
      source: 'AI',
      timestamp: new Date().toISOString(),
      results: results
    });

  } catch (error) {
    console.error('[Scanner Run Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Scanner run failed',
      message: error.message 
    });
  }
});

// ===== AI STRATEGY SUGGESTION ENDPOINT =====

/**
 * Crypto Historical Bars Endpoint
 * Fetches 1-minute candlestick data for crypto technical analysis
 */
app.post('/api/crypto/bars', async (req, res) => {
  try {
    const { symbols, timeframe, limit } = req.body;

    console.log('[Crypto Bars] Request:', { symbols, timeframe, limit });

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid symbols array' 
      });
    }

    // Read Alpaca credentials from environment
    const ALPACA_KEY = process.env.ALPACA_KEY;
    const ALPACA_SECRET = process.env.ALPACA_SECRET;

    if (!ALPACA_KEY || !ALPACA_SECRET) {
      return res.status(500).json({ 
        success: false,
        error: 'Alpaca credentials not configured on server',
        message: 'Please configure ALPACA_KEY and ALPACA_SECRET environment variables'
      });
    }

    // Convert symbols to Alpaca format (e.g., BTCUSD -> BTC/USD)
    const alpacaSymbols = symbols.map(s => {
      const clean = s.replace('-', '').toUpperCase();
      if (clean.length > 3 && clean.endsWith('USD')) {
        const base = clean.substring(0, clean.length - 3);
        return `${base}/USD`;
      }
      return clean;
    });

    // Calculate time range (last 2 hours for 1-min bars = 120 candles)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const tf = timeframe || '1Min';
    const limitParam = limit || 120;

    const barsUrl = `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${alpacaSymbols.join(',')}&timeframe=${tf}&start=${startStr}&end=${endStr}&limit=${limitParam}`;

    console.log('[Crypto Bars] Fetching from Alpaca:', barsUrl);

    const response = await fetch(barsUrl, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Crypto Bars] Alpaca error:', response.status, errorText);
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    const data = await response.json();
    const bars = data.bars || {};

    // Transform to our format
    const result = {};
    alpacaSymbols.forEach((alpacaSymbol, index) => {
      const originalSymbol = symbols[index];
      const symbolBars = bars[alpacaSymbol] || [];
      
      result[originalSymbol] = symbolBars.map(bar => ({
        timestamp: new Date(bar.t).getTime(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));

      console.log(`[Crypto Bars] ${originalSymbol}: ${result[originalSymbol].length} bars`);
    });

    res.json({
      success: true,
      data: result,
      provider: 'Alpaca'
    });

  } catch (error) {
    console.error('[Crypto Bars Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch crypto bars',
      message: error.message 
    });
  }
});

/**
 * AI Strategy Suggestion
 * Analyzes a stock symbol and recommends the best trading strategy
 */
app.post('/api/ai/strategy-suggestion', async (req, res) => {
  try {
    const { symbol } = req.body;

    console.log(`[AI Strategy] Request for symbol: ${symbol}`);

    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required field: symbol' 
      });
    }

    // Use OpenAI API
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_KEY) {
      console.error('[AI Strategy] OPENAI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'AI service not configured',
        message: 'Please configure OPENAI_API_KEY environment variable'
      });
    }

    const prompt = `Analyze the stock "${symbol}". Based on its historical volatility, beta, momentum, and sector, recommend the best trading strategy from this list:

1. 'strat_conservative' (Low volatility, defensive stocks. Tight stops.)
2. 'strat_balanced' (Standard growth stocks. Medium stops.)
3. 'strat_aggressive' (High volatility/crypto/tech. Wide stops.)

Return a JSON object with:
- recommendedId: string (one of the IDs above)
- reason: string (max 15 words explaining why)`;

    console.log('[AI Strategy] Calling OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional financial analyst. Always respond in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 256,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiText = openaiData.choices[0]?.message?.content || '{}';
    const result = JSON.parse(aiText);

    console.log(`[AI Strategy] Recommendation for ${symbol}: ${result.recommendedId}`);

    res.json({
      success: true,
      recommendedId: result.recommendedId || 'strat_balanced',
      reason: result.reason || 'AI analysis incomplete, defaulted to Balanced.'
    });

  } catch (error) {
    console.error('[AI Strategy Error]:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'AI analysis failed',
      message: error.message 
    });
  }
});

// ===== AUTOMATED DAILY SCANNER =====

/**
 * Run daily scanner for all active championships
 * Called by cron scheduler at 08:00 every day
 */
async function runDailyScanner() {
  console.log('\n🤖 [Daily Scanner] ===== STARTING AUTOMATED SCAN =====');
  console.log(`[Daily Scanner] Timestamp: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);

  if (!supabaseAdmin) {
    console.error('[Daily Scanner] Supabase Admin not initialized. Cannot run scanner.');
    return;
  }

  try {
    // Get all active championships
    const { data: championships, error } = await supabaseAdmin
      .from('championships')
      .select('id, name, allowed_tickers')
      .eq('status', 'active');

    if (error) {
      console.error('[Daily Scanner] Error fetching championships:', error.message);
      return;
    }

    if (!championships || championships.length === 0) {
      console.log('[Daily Scanner] No active championships found. Nothing to scan.');
      return;
    }

    console.log(`[Daily Scanner] Found ${championships.length} active championship(s)`);

    // Run scanner for each championship
    for (const championship of championships) {
      try {
        console.log(`\n[Daily Scanner] Processing: ${championship.name} (ID: ${championship.id})`);

        const tickers = championship.allowed_tickers || [];
        if (tickers.length === 0) {
          console.log(`[Daily Scanner] Skip: ${championship.name} - No tickers configured`);
          continue;
        }

        console.log(`[Daily Scanner] Analyzing ${tickers.length} tickers...`);

        // Dynamic opportunity limit
        const maxOpportunities = Math.min(Math.ceil(tickers.length * 0.8), 20);

        // Build AI prompt
        const prompt = `Sei un analista finanziario esperto. Analizza questi ${tickers.length} titoli e identifica le migliori opportunità di trading.

Stock List:
${tickers.join(', ')}

Classifica i titoli in 3 categorie strategiche:
1. **Conservative** (strat_conservative): Basso rischio, stabilità, titoli difensivi, volatilità bassa
2. **Balanced** (strat_balanced): Rischio/reward moderato, crescita stabile, buon compromesso
3. **Aggressive** (strat_aggressive): Alto rischio, alta crescita potenziale, volatilità elevata

Criteri di valutazione:
- Trend di prezzo recente e momentum
- Volatilità e stabilità storica
- Volume di scambio (interesse del mercato)
- Caratteristiche settoriali (tech = aggressive, utilities = conservative, etc.)
- Risk/reward profile

Seleziona massimo ${maxOpportunities} opportunità TOTALI (distribuite tra le 3 categorie).
Per ogni opportunità, fornisci una ragione dettagliata e convincente (2-3 frasi).

Rispondi SOLO in formato JSON valido:
{
  "results": [
    {
      "symbol": "AAPL",
      "categoryId": "strat_conservative",
      "reason": "Apple mostra stabilità eccellente con volatilità contenuta. Leader tecnologico con business model diversificato e cash flow robusto. Ideale per profilo conservativo."
    }
  ]
}`;

        // Use OpenAI API
        const OPENAI_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_KEY) {
          console.error(`[Daily Scanner] OPENAI_API_KEY not configured. Skipping ${championship.name}`);
          continue;
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a professional financial analyst. Always respond in valid JSON format.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2048,
            temperature: 0.7
          })
        });

        if (!openaiResponse.ok) {
          const error = await openaiResponse.json();
          console.error(`[Daily Scanner] OpenAI error for ${championship.name}:`, error.error?.message);
          continue;
        }

        const openaiData = await openaiResponse.json();
        const aiText = openaiData.choices[0]?.message?.content || '{}';
        const analysisData = JSON.parse(aiText);
        const results = analysisData.results || [];

        console.log(`[Daily Scanner] ✅ Found ${results.length} opportunities for ${championship.name}`);

        // Cache results
        if (results.length > 0) {
          const { error: cacheError } = await supabaseAdmin
            .from('scanner_cache')
            .upsert({
              championship_id: championship.id,
              results: results,
              timestamp: new Date().toISOString(),
              source: 'AI'
            }, {
              onConflict: 'championship_id'
            });

          if (cacheError) {
            console.error(`[Daily Scanner] Cache save error for ${championship.name}:`, cacheError.message);
          } else {
            console.log(`[Daily Scanner] ✅ Cached results for ${championship.name}`);
          }
        }

      } catch (champError) {
        console.error(`[Daily Scanner] Error processing ${championship.name}:`, champError.message);
      }
    }

    console.log('\n🤖 [Daily Scanner] ===== SCAN COMPLETED =====\n');

  } catch (error) {
    console.error('[Daily Scanner] Fatal error:', error.message);
  }
}

// Schedule daily scanner at 08:00 AM (Europe/Rome timezone)
cron.schedule('0 8 * * *', runDailyScanner, {
  timezone: 'Europe/Rome',
  scheduled: true
});

console.log('⏰ Daily scanner scheduled: Every day at 08:00 AM (Europe/Rome)');

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Alpha Arena Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/create-payment-intent`);
  console.log(`🔔 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`🤖 AI Scanner endpoint: http://localhost:${PORT}/api/scanner/analyze`);
  console.log(`🚀 Run Scanner endpoint: http://localhost:${PORT}/api/scanner/run/:championshipId`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
