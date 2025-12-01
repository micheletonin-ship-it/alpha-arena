const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
require('dotenv').config();
const { savePayment, joinChampionship, getChampionshipById } = require('./database');

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

    console.log('[Alpaca Proxy] Request received for symbols:', symbols);

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

    // Fetch crypto data
    if (cryptoRequestSymbols.length > 0) {
      const cryptoUrlSymbols = cryptoRequestSymbols.map(s => {
        if (s.length > 3 && s.endsWith('USD')) {
          const base = s.substring(0, s.length - 3);
          return `${base}/USD`;
        }
        return s;
      });
      
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
        const bars = cryptoData.bars || {};
        
        console.log('[Alpaca Proxy] Crypto response symbols:', Object.keys(bars));
        
        cryptoUrlSymbols.forEach((symbolWithSlash, index) => {
          const bar = bars[symbolWithSlash];
          if (bar) {
            const originalSymbol = cryptoRequestSymbols[index];
            const mappedSymbol = symbolMapping[originalSymbol] || originalSymbol;
            const price = bar.c || 0;
            const prevClose = bar.o || price;
            const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
            const vol = bar.v || 0;
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
            
            console.log(`[Alpaca Proxy] Added crypto: ${mappedSymbol} (${cryptoName})`);
          } else {
            console.log(`[Alpaca Proxy] No data for crypto: ${symbolWithSlash}`);
          }
        });
      } else {
        console.error('[Alpaca Proxy] Crypto API error:', cryptoResponse.status, cryptoResponse.statusText);
      }
    }

    console.log(`[Alpaca Proxy] Returning ${allStocks.length} stocks total`);
    
    res.json({
      success: true,
      stocks: allStocks,
      provider: 'Alpaca'
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Alpha Arena Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/create-payment-intent`);
  console.log(`🔔 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
