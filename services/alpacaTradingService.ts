import { AlpacaAccount, AlpacaPosition, AlpacaOrder, AlpacaOrderResponse, AlpacaCredentialsValidation, Holding } from '../types';

/**
 * Alpaca Trading Service
 * Handles real trading operations with Alpaca API
 * Supports both Paper Trading and Live Trading
 */

// Determine base URL based on API key
const getAlpacaBaseUrl = (apiKey: string): string => {
    // Paper trading keys start with 'PK', live keys start with 'AK'
    return apiKey.startsWith('PK') 
        ? 'https://paper-api.alpaca.markets' 
        : 'https://api.alpaca.markets';
};

// Get data URL (same for both paper and live)
const getAlpacaDataUrl = (): string => {
    return 'https://data.alpaca.markets';
};

/**
 * Validate Alpaca API credentials
 * Tests connection and returns account type
 */
export const validateAlpacaCredentials = async (
    apiKey: string, 
    apiSecret: string
): Promise<AlpacaCredentialsValidation> => {
    try {
        const baseUrl = getAlpacaBaseUrl(apiKey);
        
        const response = await fetch(`${baseUrl}/v2/account`, {
            method: 'GET',
            headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret,
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                valid: false,
                accountType: 'paper',
                error: `Alpaca API Error: ${response.status} - ${errorText}`
            };
        }

        const accountInfo: AlpacaAccount = await response.json();
        
        // Determine account type from key prefix
        const accountType = apiKey.startsWith('PK') ? 'paper' : 'live';
        
        console.log(`[Alpaca] Credentials validated successfully - Account Type: ${accountType}`);
        
        return {
            valid: true,
            accountType,
            accountInfo
        };
        
    } catch (error: any) {
        console.error('[Alpaca] Validation error:', error);
        return {
            valid: false,
            accountType: 'paper',
            error: error.message || 'Connection failed'
        };
    }
};

/**
 * Get Alpaca account information
 * Returns buying power, equity, cash, etc.
 */
export const getAlpacaAccountInfo = async (
    apiKey: string,
    apiSecret: string
): Promise<AlpacaAccount> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    console.log(`[Alpaca] Fetching account info from ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/v2/account`, {
        method: 'GET',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch account info: ${response.status} - ${errorText}`);
    }

    const accountInfo: AlpacaAccount = await response.json();
    console.log(`[Alpaca] Account info retrieved - Equity: $${accountInfo.equity}, Buying Power: $${accountInfo.buying_power}`);
    
    return accountInfo;
};

/**
 * Get all positions (holdings) from Alpaca account
 */
export const getAlpacaPositions = async (
    apiKey: string,
    apiSecret: string
): Promise<AlpacaPosition[]> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    console.log(`[Alpaca] Fetching positions from ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/v2/positions`, {
        method: 'GET',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch positions: ${response.status} - ${errorText}`);
    }

    const positions: AlpacaPosition[] = await response.json();
    console.log(`[Alpaca] ${positions.length} positions retrieved`);
    
    return positions;
};

/**
 * Convert Alpaca positions to internal Holding format
 */
export const convertAlpacaPositionsToHoldings = (positions: AlpacaPosition[]): Holding[] => {
    return positions.map(pos => ({
        symbol: pos.symbol,
        name: pos.symbol, // Alpaca doesn't provide company name, will be enriched from market data
        quantity: parseFloat(pos.qty),
        avgPrice: parseFloat(pos.avg_entry_price),
        peakPrice: parseFloat(pos.current_price),
        championshipId: 'personal-portfolio', // Special ID for personal portfolio
        strategyId: undefined // Personal portfolio doesn't use strategies initially
    }));
};

/**
 * Execute a market order on Alpaca
 * This is for REAL trading with REAL money
 */
export const executeAlpacaOrder = async (
    apiKey: string,
    apiSecret: string,
    order: AlpacaOrder
): Promise<AlpacaOrderResponse> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    console.log(`[Alpaca] Executing ${order.side.toUpperCase()} order for ${order.qty} shares of ${order.symbol}`);
    console.log(`[Alpaca] Order type: ${order.type}, Time in force: ${order.time_in_force}`);
    
    // Build order payload
    const payload: any = {
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        type: order.type,
        time_in_force: order.time_in_force
    };
    
    // Add limit price if limit order
    if (order.type === 'limit' && order.limit_price) {
        payload.limit_price = order.limit_price;
    }
    
    // Add stop price if stop order
    if ((order.type === 'stop' || order.type === 'stop_limit') && order.stop_price) {
        payload.stop_price = order.stop_price;
    }
    
    // Add client order ID if provided
    if (order.client_order_id) {
        payload.client_order_id = order.client_order_id;
    }
    
    const response = await fetch(`${baseUrl}/v2/orders`, {
        method: 'POST',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json',
            'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('[Alpaca] Order execution failed:', errorData);
        throw new Error(`Order failed: ${errorData.message || response.statusText}`);
    }

    const orderResponse: AlpacaOrderResponse = await response.json();
    console.log(`[Alpaca] Order submitted successfully - Order ID: ${orderResponse.id}, Status: ${orderResponse.status}`);
    
    return orderResponse;
};

/**
 * Get all orders (history) from Alpaca
 */
export const getAlpacaOrders = async (
    apiKey: string,
    apiSecret: string,
    status: 'open' | 'closed' | 'all' = 'all',
    limit: number = 100
): Promise<AlpacaOrderResponse[]> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        direction: 'desc' // Most recent first
    });
    
    console.log(`[Alpaca] Fetching orders - Status: ${status}, Limit: ${limit}`);
    
    const response = await fetch(`${baseUrl}/v2/orders?${params}`, {
        method: 'GET',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch orders: ${response.status} - ${errorText}`);
    }

    const orders: AlpacaOrderResponse[] = await response.json();
    console.log(`[Alpaca] ${orders.length} orders retrieved`);
    
    return orders;
};

/**
 * Cancel an open order
 */
export const cancelAlpacaOrder = async (
    apiKey: string,
    apiSecret: string,
    orderId: string
): Promise<void> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    console.log(`[Alpaca] Canceling order ${orderId}`);
    
    const response = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to cancel order: ${response.status} - ${errorText}`);
    }
    
    console.log(`[Alpaca] Order ${orderId} canceled successfully`);
};

/**
 * Get a single position by symbol
 */
export const getAlpacaPosition = async (
    apiKey: string,
    apiSecret: string,
    symbol: string
): Promise<AlpacaPosition | null> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    console.log(`[Alpaca] Fetching position for ${symbol}`);
    
    const response = await fetch(`${baseUrl}/v2/positions/${symbol}`, {
        method: 'GET',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (response.status === 404) {
        // Position not found - user doesn't own this symbol
        return null;
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch position: ${response.status} - ${errorText}`);
    }

    const position: AlpacaPosition = await response.json();
    return position;
};

/**
 * Close (liquidate) a position completely
 */
export const closeAlpacaPosition = async (
    apiKey: string,
    apiSecret: string,
    symbol: string
): Promise<AlpacaOrderResponse> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    console.log(`[Alpaca] Closing entire position for ${symbol}`);
    
    const response = await fetch(`${baseUrl}/v2/positions/${symbol}`, {
        method: 'DELETE',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to close position: ${response.status} - ${errorText}`);
    }

    const orderResponse: AlpacaOrderResponse = await response.json();
    console.log(`[Alpaca] Position closed - Order ID: ${orderResponse.id}`);
    
    return orderResponse;
};

/**
 * Check if market is currently open
 */
export const isMarketOpen = async (
    apiKey: string,
    apiSecret: string
): Promise<boolean> => {
    const baseUrl = getAlpacaBaseUrl(apiKey);
    
    const response = await fetch(`${baseUrl}/v2/clock`, {
        method: 'GET',
        headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch market clock');
    }

    const clock = await response.json();
    return clock.is_open;
};

/**
 * Helper: Create a market buy order
 */
export const createMarketBuyOrder = (symbol: string, quantity: number): AlpacaOrder => {
    return {
        symbol,
        qty: quantity,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
    };
};

/**
 * Helper: Create a market sell order
 */
export const createMarketSellOrder = (symbol: string, quantity: number): AlpacaOrder => {
    return {
        symbol,
        qty: quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
    };
};

/**
 * Helper: Create a limit buy order
 */
export const createLimitBuyOrder = (symbol: string, quantity: number, limitPrice: number): AlpacaOrder => {
    return {
        symbol,
        qty: quantity,
        side: 'buy',
        type: 'limit',
        time_in_force: 'gtc', // Good til canceled
        limit_price: limitPrice
    };
};

/**
 * Helper: Create a limit sell order
 */
export const createLimitSellOrder = (symbol: string, quantity: number, limitPrice: number): AlpacaOrder => {
    return {
        symbol,
        qty: quantity,
        side: 'sell',
        type: 'limit',
        time_in_force: 'gtc',
        limit_price: limitPrice
    };
};

// Export aliases for shorter names (used in App.tsx)
export const getAccountInfo = getAlpacaAccountInfo;
export const getPositions = getAlpacaPositions;
export const executeOrder = executeAlpacaOrder;
export const getOrders = getAlpacaOrders;
export const cancelOrder = cancelAlpacaOrder;
export const getPosition = getAlpacaPosition;
export const closePosition = closeAlpacaPosition;
export const validateCredentials = validateAlpacaCredentials;
