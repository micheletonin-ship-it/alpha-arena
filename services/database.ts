
import { User, Holding, Transaction, Strategy, AgentLog, ScanResult, Championship, PrizeDistribution, PrizePoolInfo, LeaderboardEntry } from '../types';
import { getSupabase } from './cloud';
import { decrypt } from './security'; // Import decrypt
import { ScanReport } from '../types'; // Import ScanReport

// --- HYBRID DATABASE SERVICE ---
// 1. Checks if Supabase (Cloud) is connected.
// 2. If YES: Reads/Writes to Supabase Tables.
// 3. If NO: Fallbacks to LocalStorage (Browser).

const DELAY_MS = 300; 

// --- DB KEYS VERSIONING (To force reset) ---
const DB_PREFIX = 'alphaarena_db_v4_'; // Version 4

// --- INITIAL SEED DATA (Clean Slate) ---
const SEED_DATA = {
  users: [],
  holdings: [], // Start empty
  transactions: [], // Start empty (Wallet = 0)
  agent_logs: [],
  scan_results: { timestamp: 0, results: [] },
  strategies: [
    {
        id: 'strat_conservative',
        name: 'Conservative Guard',
        description: 'Tight stop losses to preserve capital.',
        stopLossPercentage: 3.0,
        takeProfitTiers: [{ gainThreshold: 5, trailingDrop: 1.0 }],
        isSystem: true
    },
    {
        id: 'strat_balanced',
        name: 'Balanced Growth (Default)',
        description: 'Standard strategy with tiered taking profits.',
        stopLossPercentage: 5.0,
        takeProfitTiers: [
            { gainThreshold: 5, trailingDrop: 2.0 },
            { gainThreshold: 10, trailingDrop: 1.5 }
        ],
        isSystem: true
    },
    {
        id: 'strat_aggressive',
        name: 'Aggressive Runner',
        description: 'Loose stops to let winners run.',
        stopLossPercentage: 10.0,
        takeProfitTiers: [
            { gainThreshold: 15, trailingDrop: 5.0 },
            { gainThreshold: 30, trailingDrop: 3.0 }
        ],
        isSystem: true
    }
  ],
  championships: [] // NEW: Empty for now
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getSupabaseErrorMessage = (e: any): string => {
    if (e instanceof TypeError && e.message === 'Failed to fetch') {
        return "Network Error: Failed to connect to Supabase. Please check your internet connection or Supabase URL/Key configuration.";
    }
    // Supabase errors often have a 'message' field in a JSON object
    if (e && typeof e === 'object' && 'message' in e) {
        return e.message;
    }
    return e.message || JSON.stringify(e);
}

// UPDATED: resetUserAccount now requires a championshipId
export const resetUserAccount = async (userId: string, championshipId: string) => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            // Cloud Reset: Delete all data for the specified user and championship
            await supabase.from('holdings').delete().eq('user_email', userId).eq('championship_id', championshipId);
            await supabase.from('transactions').delete().eq('user_email', userId).eq('championship_id', championshipId);
            await supabase.from('agent_logs').delete().eq('user_email', userId).eq('championship_id', championshipId);

        } catch (e: any) {
            console.error("Cloud Reset User Account Error:", getSupabaseErrorMessage(e));
        }
    } else {
        // Local Reset: Filter out entries for the specified user and championship
        let allHoldings = JSON.parse(localStorage.getItem(`${DB_PREFIX}holdings`) || '[]');
        allHoldings = allHoldings.filter((h: any) => h.userId !== userId || h.championshipId !== championshipId);
        localStorage.setItem(`${DB_PREFIX}holdings`, JSON.stringify(allHoldings));

        let allTx = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
        allTx = allTx.filter((t: any) => t.userId !== userId || t.championshipId !== championshipId);
        localStorage.setItem(`${DB_PREFIX}transactions`, JSON.stringify(allTx));

        let allLogs = JSON.parse(localStorage.getItem(`${DB_PREFIX}agent_logs`) || '[]');
        allLogs = allLogs.filter((l: any) => l.userId !== userId || l.championshipId !== championshipId);
        localStorage.setItem(`${DB_PREFIX}agent_logs`, JSON.stringify(allLogs));
    }
};

// --- USER OPERATIONS ---

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const supabase = getSupabase();
  
  if (supabase) {
      try {
          const { data, error } = await supabase.from('user_profiles').select('*').eq('email', email).single();
          if (error) {
              console.error("[db.getUserByEmail] Cloud Get User Error:", getSupabaseErrorMessage(error));
              return null;
          }
          if (data) {
              // Map DB columns to User object
              return {
                  id: data.email, // Use email as ID for simplicity in hybrid mode
                  email: data.email,
                  name: data.name || email.split('@')[0],
                  avatarUrl: data.avatar_url, // NEW: Retrieve avatar URL
                  // Fix: Explicitly cast data.account_type to 'Pro' | 'Basic'
                  accountType: (data.account_type as 'Pro' | 'Basic') || 'Basic',
                  joinedDate: data.joined_date || new Date().toLocaleDateString(),
                  autoTradingEnabled: data.auto_trading_enabled,
                  activeStrategyId: data.active_strategy_id,
                  
                  // Map Keys (Encrypted)
                  alpaca_key: data.alpaca_key,
                  alpaca_secret: data.alpaca_secret,
                  gemini_key: data.gemini_key,
                  openai_key: data.openai_key,
                  anthropic_key: data.anthropic_key,
                  active_ai_provider: data.active_ai_provider,
                  is_admin: data.is_admin, // NEW
                  current_championship_id: data.current_championship_id || undefined, // UPDATED: undefined if null in DB
                  stripe_public_key: data.stripe_public_key, // NEW
                  stripe_secret_key: data.stripe_secret_key, // NEW
              };
          }
          return null;
      } catch (e: any) {
          console.error("[db.getUserByEmail] Cloud Get User Error (catch block):", getSupabaseErrorMessage(e));
          return null;
      }
  }

  // Local Fallback
  await sleep(DELAY_MS);
  const users = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
  const user = users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
  return user || null;
};

export const createUser = async (email: string, name: string): Promise<User> => {
  const supabase = getSupabase();
  
  const newUser: User = {
    id: email, 
    email,
    name,
    avatarUrl: undefined, // NEW: Default to undefined
    accountType: 'Basic',
    joinedDate: new Date().toLocaleDateString(),
    autoTradingEnabled: false,
    activeStrategyId: 'strat_balanced',
    is_admin: false, // NEW: Default to not admin
    current_championship_id: undefined, // UPDATED: Default to no active championship
  };

  if (supabase) {
      try {
          const { error } = await supabase.from('user_profiles').insert({
              email: newUser.email,
              name: newUser.name,
              avatar_url: newUser.avatarUrl, // NEW: Save avatar URL
              account_type: newUser.accountType,
              joined_date: newUser.joinedDate,
              auto_trading_enabled: newUser.autoTradingEnabled,
              active_strategy_id: newUser.activeStrategyId,
              is_admin: newUser.is_admin, // NEW
              current_championship_id: newUser.current_championship_id, // NEW
          });
          if (error) console.error("Cloud Create User Error:", getSupabaseErrorMessage(error));
      } catch(e: any) {
          console.error("Cloud Create User Error:", getSupabaseErrorMessage(e));
      }
  } else {
      // Local Fallback
      await sleep(DELAY_MS);
      const users = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
      // Add fake ID for local compatibility
      const localUser = { ...newUser, id: `user_${Date.now()}` }; 
      users.push(localUser);
      localStorage.setItem(`${DB_PREFIX}users`, JSON.stringify(users));
      return localUser;
  }

  return newUser;
};

export const updateUser = async (user: User): Promise<void> => {
    const supabase = getSupabase();

    if (supabase) {
        try {
            const payload: any = {
                email: user.email,
                name: user.name,
                avatar_url: user.avatarUrl, // NEW: Update avatar URL
                account_type: user.accountType,
                auto_trading_enabled: user.autoTradingEnabled,
                active_strategy_id: user.activeStrategyId,
                is_admin: user.is_admin, // NEW
                current_championship_id: user.current_championship_id || null, // UPDATED: Store undefined as null in DB
                
                // Allow updating keys if they are present in the User object.
                // Explicitly convert empty strings to null for database storage.
                alpaca_key: user.alpaca_key === '' ? null : user.alpaca_key,
                alpaca_secret: user.alpaca_secret === '' ? null : user.alpaca_secret,
                gemini_key: user.gemini_key === '' ? null : user.gemini_key,
                openai_key: user.openai_key === '' ? null : user.openai_key,
                anthropic_key: user.anthropic_key === '' ? null : user.anthropic_key,
                active_ai_provider: user.active_ai_provider,
                stripe_public_key: user.stripe_public_key === '' ? null : user.stripe_public_key, // NEW: Ensure empty string becomes null
                stripe_secret_key: user.stripe_secret_key === '' ? null : user.stripe_secret_key, // NEW: Ensure empty string becomes null
            };
            
            const { error } = await supabase.from('user_profiles').upsert(payload, { onConflict: 'email' });
            if (error) {
                console.error("[db.updateUser] Cloud Update User Error (after upsert):", getSupabaseErrorMessage(error));
            }
        } catch (e: any) {
            console.error("[db.updateUser] Cloud Update User Error (catch block):", getSupabaseErrorMessage(e));
        }
    }
    // Local Fallback is handled by a separate function if user update is only for local storage.
    // This `updateUser` currently only updates global user details that don't directly map to specific tables.
    // For local storage, user data is usually updated as part of other operations (e.g., setLastActiveUser).
    else {
        await sleep(DELAY_MS);
        const users = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
        const index = users.findIndex((u: User) => u.email === user.email);
        if (index !== -1) {
            users[index] = { ...users[index], ...user };
            localStorage.setItem(`${DB_PREFIX}users`, JSON.stringify(users));
        }
    }
}

// Specialized function to retrieve encrypted credentials (now also includes AI keys)
export const getAlpacaCredentials = async (userId: string): Promise<{ key: string | null, secret: string | null }> => {
    const supabase = getSupabase();
    let encryptedKey: string | null = null;
    let encryptedSecret: string | null = null;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('alpaca_key, alpaca_secret')
                .eq('email', userId)
                .single();
                
            if (error) {
                console.error("Cloud Get Alpaca Credentials Error:", getSupabaseErrorMessage(error));
            } else if (data) {
                encryptedKey = data.alpaca_key;
                encryptedSecret = data.alpaca_secret;
            }
        } catch (e: any) {
            console.error("Cloud Get Alpaca Credentials Error:", getSupabaseErrorMessage(e));
        }
    } else {
        // Local Fallback: retrieve the full user object to get the encrypted keys
        const users = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
        const user = users.find((u: User) => u.email === userId); // Assume userId is email in local mode
        if (user) {
            encryptedKey = user.alpaca_key || null;
            encryptedSecret = user.alpaca_secret || null;
        }
    }

    // Always decrypt before returning
    const decryptedKey = encryptedKey ? decrypt(encryptedKey) : null;
    const decryptedSecret = encryptedSecret ? decrypt(encryptedSecret) : null;

    return { key: decryptedKey, secret: decryptedSecret };
};

// NEW: Specialized function to retrieve encrypted Stripe credentials
export const getStripeCredentials = async (userId: string): Promise<{ publicKey: string | null, secretKey: string | null }> => {
    const supabase = getSupabase();
    let encryptedPublicKey: string | null = null;
    let encryptedSecretKey: string | null = null;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('stripe_public_key, stripe_secret_key')
                .eq('email', userId)
                .single();
                
            if (error) {
                console.error("Cloud Get Stripe Credentials Error:", getSupabaseErrorMessage(error));
            } else if (data) {
                encryptedPublicKey = data.stripe_public_key;
                encryptedSecretKey = data.stripe_secret_key;
            }
        } catch (e: any) {
            console.error("Cloud Get Stripe Credentials Error:", getSupabaseErrorMessage(e));
        }
    } else {
        // Local Fallback: retrieve the full user object to get the encrypted keys
        const users = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
        const user = users.find((u: User) => u.email === userId); // Assume userId is email in local mode
        if (user) {
            encryptedPublicKey = user.stripe_public_key || null;
            encryptedSecretKey = user.stripe_secret_key || null;
        }
    }

    // Always decrypt before returning, add null check to avoid decrypting null
    const decryptedPublicKey = encryptedPublicKey ? decrypt(encryptedPublicKey) : null;
    const decryptedSecretKey = encryptedSecretKey ? decrypt(encryptedSecretKey) : null;

    return { publicKey: decryptedPublicKey, secretKey: decryptedSecretKey };
};


// --- SESSION MANAGEMENT ---

export const setLastActiveUser = async (user: User): Promise<void> => {
    localStorage.setItem(`${DB_PREFIX}active_user`, JSON.stringify(user));
};

export const getLastActiveUser = async (): Promise<User | null> => {
    const data = localStorage.getItem(`${DB_PREFIX}active_user`);
    if (data) {
        const user = JSON.parse(data) as User;
        // Ensure current_championship_id is undefined if it was null in localStorage
        if (user.current_championship_id === null) {
            user.current_championship_id = undefined;
        }
        return user;
    }
    return null;
};

// --- HOLDINGS OPERATIONS (Portfolio) ---

// UPDATED: championshipId is now mandatory
export const getHoldings = async (userId: string, championshipId: string): Promise<Holding[]> => {
  const supabase = getSupabase();
  
  if (supabase) {
      try {
          // No more `is('championship_id', null)`
          const { data, error } = await supabase.from('holdings').select('*').eq('user_email', userId).eq('championship_id', championshipId);
          if (error) {
              console.error("Cloud Get Holdings Error:", getSupabaseErrorMessage(error));
              return [];
          }
          return (data || []).map((h: any) => ({
              symbol: h.symbol,
              name: h.name,
              quantity: parseFloat(h.quantity),
              avgPrice: parseFloat(h.avg_price),
              peakPrice: parseFloat(h.peak_price),
              strategyId: h.strategyId, // Ensure strategyId is retrieved
              viInitialBuyPrice: h.vi_initial_buy_price ? parseFloat(h.vi_initial_buy_price) : undefined, // ADD PARSEFLOAT
              viLotsPurchased: h.vi_lots_purchased ? parseInt(h.vi_lots_purchased) : undefined, // ADD PARSEINT
              viLotAmount: h.vi_lot_amount ? parseFloat(h.vi_lot_amount) : undefined, // NEW
              championshipId: h.championship_id, // UPDATED: now `string`
          }));
      } catch (e: any) {
          console.error("Cloud Get Holdings Error:", getSupabaseErrorMessage(e));
          return [];
      }
  }

  await sleep(DELAY_MS);
  const allHoldings = JSON.parse(localStorage.getItem(`${DB_PREFIX}holdings`) || '[]');
  
  return allHoldings.filter((h: any) => {
    return h.userId === userId && h.championshipId === championshipId; // UPDATED: Direct comparison
  }).map((h: any) => ({
    symbol: h.symbol,
    name: h.name,
    quantity: h.quantity,
    avgPrice: h.avgPrice,
    peakPrice: h.peakPrice || h.avgPrice,
    strategyId: h.strategyId,
    viInitialBuyPrice: h.viInitialBuyPrice,
    viLotsPurchased: h.viLotsPurchased,
    viLotAmount: h.viLotAmount, // NEW
    championshipId: h.championshipId, // UPDATED: now `string`
    userId: h.userId, // ADDED FOR LOCALSTORAGE FILTERING
  }));
};

// UPDATED: championshipId is now mandatory
export const saveHolding = async (userId: string, holding: Holding, championshipId: string): Promise<void> => {
  const supabase = getSupabase();

  if (supabase) {
     try {
         if (holding.quantity <= 0) {
             // Delete if quantity is zero or less
             const { error } = await supabase.from('holdings').delete().match({ user_email: userId, symbol: holding.symbol, championship_id: championshipId }); // UPDATED: mandatory champId
             if (error) console.error("Cloud Delete Holding Error:", getSupabaseErrorMessage(error));
         } else {
             // Check if exists
             const { data, error: selectError } = await supabase.from('holdings').select('id').match({ user_email: userId, symbol: holding.symbol, championship_id: championshipId }).maybeSingle(); // UPDATED: mandatory champId
             if (selectError) {
                 console.error("Cloud Check Holding Error:", getSupabaseErrorMessage(selectError));
                 return;
             }
             
             const payload = {
                user_email: userId,
                symbol: holding.symbol,
                name: holding.name,
                quantity: holding.quantity,
                avg_price: holding.avgPrice,
                peak_price: holding.peakPrice || holding.avgPrice,
                strategyId: holding.strategyId, // Save strategy preference
                vi_initial_buy_price: holding.viInitialBuyPrice,
                vi_lots_purchased: holding.viLotsPurchased,
                vi_lot_amount: holding.viLotAmount, // NEW
                championship_id: championshipId, // UPDATED: mandatory champId
             };

             if (data) {
                 const { error: updateError } = await supabase.from('holdings').update(payload).eq('id', data.id);
                 if (updateError) console.error("Cloud Update Holding Error:", getSupabaseErrorMessage(updateError));
             } else {
                 const { error: insertError } = await supabase.from('holdings').insert(payload);
                 if (insertError) console.error("Cloud Insert Holding Error:", getSupabaseErrorMessage(insertError));
             }
         }
         return;
     } catch (e: any) {
         console.error("Cloud Save Holding Error:", getSupabaseErrorMessage(e));
     }
  }

  await sleep(DELAY_MS);
  let allHoldings = JSON.parse(localStorage.getItem(`${DB_PREFIX}holdings`) || '[]');
  
  const existingIndex = allHoldings.findIndex((h: any) => {
    return h.userId === userId && h.symbol === holding.symbol && h.championshipId === championshipId; // UPDATED: Direct comparison
  });
  
  if (existingIndex >= 0) {
    if (holding.quantity <= 0) {
        allHoldings.splice(existingIndex, 1);
    } else {
        const existing = allHoldings[existingIndex];
        allHoldings[existingIndex] = { 
            ...existing, 
            ...holding, 
            userId,
            championshipId: championshipId, // UPDATED: now `string`
            peakPrice: holding.peakPrice || existing.peakPrice || holding.avgPrice,
            viInitialBuyPrice: holding.viInitialBuyPrice !== undefined ? holding.viInitialBuyPrice : existing.viInitialBuyPrice,
            viLotsPurchased: holding.viLotsPurchased !== undefined ? holding.viLotsPurchased : existing.viLotsPurchased,
            viLotAmount: holding.viLotAmount !== undefined ? holding.viLotAmount : existing.viLotAmount, // NEW
        };
    }
  } else if (holding.quantity > 0) {
    allHoldings.push({ 
        ...holding, 
        userId,
        championshipId: championshipId, // UPDATED: now `string`
        peakPrice: holding.peakPrice || holding.avgPrice 
    });
  }

  localStorage.setItem(`${DB_PREFIX}holdings`, JSON.stringify(allHoldings));
};

// --- TRANSACTION OPERATIONS (Wallet) ---

// UPDATED: championshipId is now mandatory
export const getTransactions = async (userId: string, championshipId: string): Promise<Transaction[]> => {
  const supabase = getSupabase();

  if (supabase) {
      try {
          // No more `is('championship_id', null)`
          const { data, error } = await supabase.from('transactions').select('*').eq('user_email', userId).eq('championship_id', championshipId).order('date', { ascending: false });
          if (error) {
              console.error("Cloud Get Transactions Error:", getSupabaseErrorMessage(error));
              return [];
          }
          return (data || []).map((t: any) => ({
              id: t.id,
              type: t.type,
              amount: parseFloat(t.amount),
              date: t.date,
              status: t.status,
              method: t.method,
              symbol: t.symbol,
              quantity: t.quantity ? parseFloat(t.quantity) : undefined,
              price: t.price ? parseFloat(t.price) : undefined,
              championshipId: t.championship_id, // UPDATED: now `string`
          }));
      } catch (e: any) {
          console.error("Cloud Get Transactions Error:", getSupabaseErrorMessage(e));
          return [];
      }
  }

  await sleep(DELAY_MS);
  const allTx = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
  
  return allTx.filter((t: any) => 
    t.userId === userId && t.championshipId === championshipId // UPDATED: Direct comparison
  ).map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    date: t.date,
    status: t.status,
    method: t.method,
    symbol: t.symbol,
    quantity: t.quantity,
    price: t.price,
    championshipId: t.championshipId, // UPDATED: now `string`
    userId: t.userId, // ADDED FOR LOCALSTORAGE FILTERING
  }));
};

// UPDATED: championshipId is now mandatory
export const addTransaction = async (userId: string, tx: Transaction, championshipId: string): Promise<void> => {
  const supabase = getSupabase();

  if (supabase) {
      try {
          console.log(`[DB] Adding transaction for user ${userId}, championship ${championshipId}:`, tx);
          const { error } = await supabase.from('transactions').insert({
              id: tx.id,
              user_email: userId,
              type: tx.type,
              amount: tx.amount,
              date: tx.date,
              status: tx.status,
              method: tx.method,
              symbol: tx.symbol,
              quantity: tx.quantity,
              price: tx.price,
              championship_id: championshipId, // UPDATED: mandatory champId
          });
          if (error) {
              console.error("Cloud Add Transaction Error:", getSupabaseErrorMessage(error));
              throw new Error(`Failed to add transaction: ${getSupabaseErrorMessage(error)}`); // FIX: Throw error instead of silent fail
          }
          console.log(`[DB] Transaction added successfully`);
          return;
      } catch (e: any) {
          console.error("Cloud Add Transaction Error:", getSupabaseErrorMessage(e));
          throw e; // FIX: Re-throw the error
      }
  }

  await sleep(DELAY_MS);
  const allTx = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
  allTx.unshift({ ...tx, userId, championshipId }); // UPDATED: now `string`
  localStorage.setItem(`${DB_PREFIX}transactions`, JSON.stringify(allTx));
};

// UPDATED: championshipId is now mandatory
export const clearTransactions = async (userId: string, championshipId: string): Promise<void> => {
  const supabase = getSupabase();

  if (supabase) {
      try {
          // No more `is('championship_id', null)`
          const { error } = await supabase.from('transactions').delete().eq('user_email', userId).eq('championship_id', championshipId);
          if (error) console.error("Cloud Clear Transactions Error:", getSupabaseErrorMessage(error));
          return; 
      } catch (e: any) {
          console.error("Cloud Clear Transactions Error:", getSupabaseErrorMessage(e));
      }
  }

  await sleep(DELAY_MS);
  let allTx = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');

  // Filter out transactions belonging to the current user and context
  const keptTx = allTx.filter((t: any) => 
    t.userId !== userId || t.championshipId !== championshipId // UPDATED: Direct comparison
  );
  localStorage.setItem(`${DB_PREFIX}transactions`, JSON.stringify(keptTx));
};

// --- AGENT LOG OPERATIONS (New) ---

// UPDATED: championshipId is now mandatory
export const getAgentLogs = async (userId: string, championshipId: string): Promise<AgentLog[]> => {
    const supabase = getSupabase();

    if (supabase) {
        // Try to fetch from agent_logs table if it exists
        try {
            // No more `is('championship_id', null)`
            const { data, error } = await supabase.from('agent_logs').select('*').eq('user_email', userId).eq('championship_id', championshipId).order('created_at', { ascending: false }).limit(50);
            if (error) {
                console.warn("Cloud Get Agent Logs Error:", getSupabaseErrorMessage(error));
                // Don't throw, just fall back to local or empty
            } else if (data) {
                return data.map((l: any) => ({
                    id: l.id,
                    date: l.created_at || l.date,
                    symbol: l.symbol,
                    action: l.action,
                    price: parseFloat(l.price),
                    trigger: l.trigger,
                    strategyName: l.strategy_name,
                    details: l.details,
                    championshipId: l.championship_id, // UPDATED: now `string`
                }));
            }
        } catch (e: any) {
            console.error("Cloud Get Agent Logs Error:", getSupabaseErrorMessage(e));
        }
    }

    // Local Fallback
    await sleep(DELAY_MS);
    const allLogs = JSON.parse(localStorage.getItem(`${DB_PREFIX}agent_logs`) || '[]');
    
    return allLogs.filter((l: any) => 
      l.userId === userId && l.championshipId === championshipId // UPDATED: Direct comparison
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// UPDATED: championshipId is now mandatory
export const addAgentLog = async (userId: string, log: AgentLog, championshipId: string): Promise<void> => {
    const supabase = getSupabase();
    
    if (supabase) {
        try {
            const { error } = await supabase.from('agent_logs').insert({
                user_email: userId,
                symbol: log.symbol,
                action: log.action,
                price: log.price,
                trigger: log.trigger,
                strategy_name: log.strategyName,
                details: log.details,
                created_at: log.date,
                championship_id: championshipId, // UPDATED: mandatory champId
            });
            if (error) console.warn("Cloud Add Agent Log Error:", getSupabaseErrorMessage(error));
            return;
        } catch (e: any) {
            console.error("Cloud Add Agent Log Error:", getSupabaseErrorMessage(e));
        }
    }

    // Local Fallback
    const allLogs = JSON.parse(localStorage.getItem(`${DB_PREFIX}agent_logs`) || '[]');
    allLogs.unshift({ ...log, userId, championshipId }); // UPDATED: now `string`
    // Keep max 100 logs locally
    if (allLogs.length > 100) allLogs.pop();
    localStorage.setItem(`${DB_PREFIX}agent_logs`, JSON.stringify(allLogs));
};

// --- STRATEGY OPERATIONS ---

export const getStrategies = async (): Promise<Strategy[]> => {
    const supabase = getSupabase();
    let strategiesFromDb: Strategy[] = [];

    if (supabase) {
        try {
            const { data, error } = await supabase.from('strategies').select('*');
            if (error) {
                console.warn("Error fetching strategies from Supabase:", getSupabaseErrorMessage(error));
            } else if (data) {
                strategiesFromDb = data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    stopLossPercentage: parseFloat(s.stop_loss_percentage),
                    takeProfitTiers: s.take_profit_tiers,
                    isSystem: s.is_system,
                    valueInvestorConfig: s.value_investor_config // NEW: Retrieve config
                }));
            }
        } catch (e: any) {
            console.warn("Supabase strategies fetch failed (network or credentials issue), falling back to local/seed:", getSupabaseErrorMessage(e));
        }
    } else {
        // Load from LocalStorage if not connected to Supabase
        const raw = localStorage.getItem(`${DB_PREFIX}strategies`);
        if (raw) {
            strategiesFromDb = JSON.parse(raw);
        }
    }

    // Start with all SEED_DATA strategies
    let finalStrategies: Strategy[] = [...SEED_DATA.strategies];

    // Merge strategies from DB/LocalStorage, prioritizing them over SEED_DATA if IDs match
    strategiesFromDb.forEach(dbStrat => {
        const existingIndex = finalStrategies.findIndex(s => s.id === dbStrat.id);
        if (existingIndex !== -1) {
            // Update existing system strategy if it's been customized or simply overwrite with DB version
            finalStrategies[existingIndex] = dbStrat;
        } else {
            // Add new custom strategy
            finalStrategies.push(dbStrat);
        }
    });
    
    // Filter to only the three allowed strategies if more were somehow loaded
    return finalStrategies.filter(s => ['strat_conservative', 'strat_balanced', 'strat_aggressive'].includes(s.id));
};

export const saveStrategy = async (strategy: Strategy): Promise<void> => {
    const supabase = getSupabase();

    if (supabase) {
        try {
            const payload = {
                id: strategy.id,
                name: strategy.name,
                description: strategy.description,
                stop_loss_percentage: strategy.stopLossPercentage,
                take_profit_tiers: strategy.takeProfitTiers,
                is_system: strategy.isSystem || false,
                value_investor_config: strategy.valueInvestorConfig // NEW: Save config
            };
            const { error } = await supabase.from('strategies').upsert(payload);
            if (error) console.error("Cloud Save Strategy Error:", getSupabaseErrorMessage(error));
            return;
        } catch (e: any) {
            console.error("Cloud Save Strategy Error:", getSupabaseErrorMessage(e));
        }
    }

    await sleep(DELAY_MS);
    let strategies = JSON.parse(localStorage.getItem(`${DB_PREFIX}strategies`) || '[]');
    const index = strategies.findIndex((s: Strategy) => s.id === strategy.id);
    if (index >= 0) strategies[index] = strategy;
    else strategies.push(strategy);
    localStorage.setItem(`${DB_PREFIX}strategies`, JSON.stringify(strategies));
};

export const deleteStrategy = async (strategyId: string): Promise<void> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            const { error } = await supabase.from('strategies').delete().eq('id', strategyId);
            if (error) console.error("Cloud Delete Strategy Error:", getSupabaseErrorMessage(error));
            return;
        } catch (e: any) {
            console.error("Cloud Delete Strategy Error:", getSupabaseErrorMessage(e));
        }
    }

    await sleep(DELAY_MS);
    let strategies = JSON.parse(localStorage.getItem(`${DB_PREFIX}strategies`) || '[]');
    strategies = strategies.filter((s: Strategy) => s.id !== strategyId);
    localStorage.setItem(`${DB_PREFIX}strategies`, JSON.stringify(strategies));
};

// --- GLOBAL SCANNER RESULTS OPERATIONS ---
const GLOBAL_SCANNER_ID = 'GLOBAL_SCANNER'; // Use a fixed ID for the global report

// UPDATED: saveGlobalScanReport now requires championshipId
export const saveGlobalScanReport = async (scanReport: ScanReport, championshipId: string): Promise<void> => {
    const supabase = getSupabase();
    
    if (supabase) {
        try {
            // Ensure timestamp is a number (bigint in DB), not a string
            const timestampAsNumber = typeof scanReport.timestamp === 'string' 
                ? new Date(scanReport.timestamp).getTime() 
                : scanReport.timestamp;
            
            // Use upsert to update the single row for the global scanner
            const { error } = await supabase.from('agent_scan_results').upsert({
                user_email: GLOBAL_SCANNER_ID, // Use fixed ID
                timestamp: timestampAsNumber, // FIX: Convert to number if it's a string
                results: scanReport.results, // Store the array directly
                source: scanReport.source,
                ai_error_message: scanReport.aiErrorMessage,
                championship_id: championshipId, // UPDATED: mandatory champId
            }, { onConflict: 'user_email' }); // Explicitly define conflict key
            if (error) {
                if (error.code === 'PGRST205') {
                    console.error("Cloud Save Global Scan Report Error: Table 'agent_scan_results' not found. Please ensure it is created in Supabase with columns: user_email (text, PK, references user_profiles(email)), timestamp (bigint), results (jsonb), source (text), ai_error_message (text).", getSupabaseErrorMessage(error));
                } else if (error.code === '42501') {
                    console.error("Cloud Save Global Scan Report Error: Row-Level Security policy denied access (code 42501). Ensure RLS is disabled on 'agent_scan_results' table in Supabase for this POC, or implement full Supabase authentication.", getSupabaseErrorMessage(error));
                }
                 else {
                    console.error("Cloud Save Global Scan Report Error:", getSupabaseErrorMessage(error));
                }
            }
        } catch (e: any) {
            console.error("Cloud Save Global Scan Report Error:", getSupabaseErrorMessage(e));
        }
    } else {
        // Local Fallback: Save the entire ScanReport object to a global key
        localStorage.setItem(`${DB_PREFIX}global_scan_results_${championshipId}`, JSON.stringify(scanReport)); // UPDATED: key now includes champId
    }
};

// UPDATED: getGlobalScanReport now requires championshipId
export const getGlobalScanReport = async (championshipId: string): Promise<ScanReport | null> => {
    const supabase = getSupabase();
    if (!supabase) {
        // Fallback to local storage if supabase is not initialized
        const raw = localStorage.getItem(`${DB_PREFIX}global_scan_results_${championshipId}`); // UPDATED: key now includes champId
        if (!raw) return null;
        return JSON.parse(raw) as ScanReport;
    }

    if (supabase) {
        try {
            // No more `is('championship_id', null)`
            const { data, error } = await supabase.from('agent_scan_results').select('timestamp, results, source, ai_error_message, championship_id').eq('user_email', GLOBAL_SCANNER_ID).eq('championship_id', championshipId).maybeSingle(); // FIX: Changed from .single() to .maybeSingle() to handle 0 or multiple results
            if (error) {
                if (error.code === 'PGRST205') {
                    console.warn("Cloud Get Global Scan Report Warning: Table 'agent_scan_results' not found. Please ensure it is created in Supabase. Falling back to local storage if available.", getSupabaseErrorMessage(error));
                } else if (error.code === '42501') {
                    console.warn("Cloud Get Global Scan Report Warning: Row-Level Security policy denied access (code 42501). Ensure RLS is disabled on 'agent_scan_results' table in Supabase for this POC, or implement full Supabase authentication. Falling back to local storage if available.", getSupabaseErrorMessage(error));
                }
                else {
                    console.warn("Cloud Get Global Scan Report Error:", getSupabaseErrorMessage(error));
                }
            } else if (data) {
                return {
                    timestamp: parseInt(data.timestamp),
                    results: data.results || [], // Ensure results is an array
                    source: data.source || 'Heuristic', // Default if null
                    aiErrorMessage: data.ai_error_message || null,
                    championshipId: data.championship_id, // UPDATED: now `string`
                };
            }
        } catch (error: any) { // Corrected: Using 'error' variable from catch block
            console.error("Cloud Get Global Scan Report Error:", getSupabaseErrorMessage(error));
        }
    }

    // Local Fallback if cloud failed or not connected
    const raw = localStorage.getItem(`${DB_PREFIX}global_scan_results_${championshipId}`); // UPDATED: key now includes champId
    if (!raw) return null;
    return JSON.parse(raw) as ScanReport;
};

// --- CHAMPIONSHIP OPERATIONS ---

// Fix: Corrected the type definition for the 'championship' parameter to match the data structure passed by the modal.
export const createChampionship = async (championship: Omit<Championship, 'id' | 'created_at' | 'status' | 'admin_user_id'>, adminEmail: string): Promise<Championship | null> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            const { data, error } = await supabase.from('championships').insert({
                name: championship.name,
                description: championship.description,
                start_date: championship.start_date,
                end_date: championship.end_date,
                starting_cash: championship.starting_cash,
                enrollment_fee: championship.enrollment_fee, // NEW: Include enrollment_fee
                stripe_payment_link: championship.stripe_payment_link, // NEW: Include stripe_payment_link
                ticker_restriction_enabled: championship.ticker_restriction_enabled || false, // NEW: Ticker whitelist
                allowed_tickers: championship.allowed_tickers || null, // NEW: Ticker whitelist
                admin_user_id: adminEmail,
                status: 'pending' // Always starts as pending
            }).select().single();

            if (error) {
                console.error("Cloud Create Championship Error:", getSupabaseErrorMessage(error));
                return null;
            }
            return {
                id: data.id,
                name: data.name,
                description: data.description,
                start_date: data.start_date,
                end_date: data.end_date,
                starting_cash: parseFloat(data.starting_cash),
                enrollment_fee: parseFloat(data.enrollment_fee || 0), // NEW: Retrieve enrollment_fee
                stripe_payment_link: data.stripe_payment_link, // NEW: Retrieve stripe_payment_link
                ticker_restriction_enabled: data.ticker_restriction_enabled, // NEW: Ticker whitelist
                allowed_tickers: data.allowed_tickers, // NEW: Ticker whitelist
                status: data.status,
                admin_user_id: data.admin_user_id,
                created_at: data.created_at,
            };
        } catch (e: any) {
            console.error("Cloud Create Championship Error:", getSupabaseErrorMessage(e));
            return null;
        }
    } else {
        await sleep(DELAY_MS);
        const allChampionships = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
        const newChampionship: Championship = {
            id: `champ_${Date.now()}`,
            created_at: new Date().toISOString(),
            status: 'pending',
            admin_user_id: adminEmail,
            ...championship
        };
        allChampionships.push(newChampionship);
        localStorage.setItem(`${DB_PREFIX}championships`, JSON.stringify(allChampionships));
        return newChampionship;
    }
};

export const getChampionships = async (): Promise<Championship[]> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            // Fetch championship and associated user profiles for participants
            const { data, error } = await supabase
                .from('championships')
                .select('*') // No direct participants relationship in DB yet, will fetch separately if needed
                .order('start_date', { ascending: false });

            if (error) {
                console.error("Cloud Get Championships Error:", getSupabaseErrorMessage(error));
                return [];
            }
            return (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                start_date: c.start_date,
                end_date: c.end_date,
                starting_cash: parseFloat(c.starting_cash),
                enrollment_fee: parseFloat(c.enrollment_fee || 0), // NEW: Retrieve enrollment_fee
                stripe_payment_link: c.stripe_payment_link, // NEW: Retrieve stripe_payment_link
                ticker_restriction_enabled: c.ticker_restriction_enabled, // NEW: Ticker whitelist
                allowed_tickers: c.allowed_tickers, // NEW: Ticker whitelist
                status: c.status,
                admin_user_id: c.admin_user_id,
                created_at: c.created_at,
            }));
        } catch (e: any) {
            console.error("Cloud Get Championships Error:", getSupabaseErrorMessage(e));
            return [];
        }
    } else {
        await sleep(DELAY_MS);
        const allChampionships = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
        return allChampionships;
    }
};

export const getChampionshipById = async (id: string): Promise<Championship | null> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            const { data, error } = await supabase.from('championships').select('*').eq('id', id).single();
            if (error) {
                console.error("Cloud Get Championship By ID Error:", getSupabaseErrorMessage(error));
                return null;
            }
            if (data) {
                return {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    starting_cash: parseFloat(data.starting_cash),
                    enrollment_fee: parseFloat(data.enrollment_fee || 0), // NEW: Retrieve enrollment_fee
                    stripe_payment_link: data.stripe_payment_link, // NEW: Retrieve stripe_payment_link
                    ticker_restriction_enabled: data.ticker_restriction_enabled, // NEW: Ticker whitelist
                    allowed_tickers: data.allowed_tickers, // NEW: Ticker whitelist
                    status: data.status,
                    admin_user_id: data.admin_user_id,
                    created_at: data.created_at,
                };
            }
            return null;
        } catch (e: any) {
            console.error("Cloud Get Championship By ID Error:", getSupabaseErrorMessage(e));
            return null;
        }
    } else {
        await sleep(DELAY_MS);
        const allChampionships: Championship[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
        return allChampionships.find(c => c.id === id) || null;
    }
};

export const updateChampionship = async (championship: Championship): Promise<void> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            const payload = {
                name: championship.name,
                description: championship.description,
                start_date: championship.start_date,
                end_date: championship.end_date,
                starting_cash: championship.starting_cash,
                enrollment_fee: championship.enrollment_fee, // NEW: Include enrollment_fee
                stripe_payment_link: championship.stripe_payment_link, // NEW: Include stripe_payment_link
                ticker_restriction_enabled: championship.ticker_restriction_enabled, // NEW: Ticker whitelist
                allowed_tickers: championship.allowed_tickers || null, // NEW: Ticker whitelist
                status: championship.status,
                admin_user_id: championship.admin_user_id,
            };
            const { error } = await supabase.from('championships').update(payload).eq('id', championship.id);
            if (error) console.error("Cloud Update Championship Error:", getSupabaseErrorMessage(error));
        } catch (e: any) {
            console.error("Cloud Update Championship Error:", getSupabaseErrorMessage(e));
        }
    } else {
        await sleep(DELAY_MS);
        let allChampionships: Championship[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
        const index = allChampionships.findIndex(c => c.id === championship.id);
        if (index !== -1) {
            allChampionships[index] = championship;
            localStorage.setItem(`${DB_PREFIX}championships`, JSON.stringify(allChampionships));
        }
    }
};

export const deleteChampionship = async (id: string): Promise<void> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            // IMPORTANT: Also delete all associated holdings, transactions, agent logs for this championship
            await supabase.from('holdings').delete().eq('championship_id', id);
            await supabase.from('transactions').delete().eq('championship_id', id);
            await supabase.from('agent_logs').delete().eq('championship_id', id);
            await supabase.from('agent_scan_results').delete().eq('championship_id', id);
            // Also update any user profiles whose current_championship_id points to the deleted championship
            await supabase.from('user_profiles').update({ current_championship_id: null }).eq('current_championship_id', id);

            const { error } = await supabase.from('championships').delete().eq('id', id);
            if (error) console.error("Cloud Delete Championship Error:", getSupabaseErrorMessage(error));
        } catch (e: any) {
            console.error("Cloud Delete Championship Error:", getSupabaseErrorMessage(e));
        }
    } else {
        await sleep(DELAY_MS);
        let allChampionships: Championship[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
        allChampionships = allChampionships.filter(c => c.id !== id);
        localStorage.setItem(`${DB_PREFIX}championships`, JSON.stringify(allChampionships));

        // Delete associated local data for this championship
        let allHoldings = JSON.parse(localStorage.getItem(`${DB_PREFIX}holdings`) || '[]');
        allHoldings = allHoldings.filter((h: Holding) => h.championshipId !== id);
        localStorage.setItem(`${DB_PREFIX}holdings`, JSON.stringify(allHoldings));

        let allTx = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
        allTx = allTx.filter((t: Transaction) => t.championshipId !== id);
        localStorage.setItem(`${DB_PREFIX}transactions`, JSON.stringify(allTx));

        let allLogs = JSON.parse(localStorage.getItem(`${DB_PREFIX}agent_logs`) || '[]');
        allLogs = allLogs.filter((l: AgentLog) => l.championshipId !== id);
        localStorage.setItem(`${DB_PREFIX}agent_logs`, JSON.stringify(allLogs));
        localStorage.removeItem(`${DB_PREFIX}global_scan_results_${id}`); // Remove specific championship scan report

        // Update local user profiles if they were in this championship context
        let allUsers: User[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
        allUsers = allUsers.map(u => u.current_championship_id === id ? { ...u, current_championship_id: undefined } : u); // UPDATED: undefined
        localStorage.setItem(`${DB_PREFIX}users`, JSON.stringify(allUsers));
    }
};

// Users do not directly "join" a championship table in DB,
// their participation is implied by having holdings/transactions/logs
// with that championship_id.
// This function initializes a user's participation by giving them starting cash.
export const joinChampionship = async (userId: string, championship: Championship): Promise<void> => {
    console.log(`[DB] joinChampionship called for user ${userId}, championship ${championship.id}`);
    const supabase = getSupabase();
    if (supabase) {
        try {
            // First, ensure the user doesn't already have holdings/transactions in this championship.
            // If they do, this implies they've already joined/reset.
            console.log(`[DB] Checking for existing user data...`);
            const existingHoldings = await getHoldings(userId, championship.id);
            const existingTransactions = await getTransactions(userId, championship.id);

            console.log(`[DB] Existing holdings: ${existingHoldings.length}, transactions: ${existingTransactions.length}`);
            
            if (existingHoldings.length > 0 || existingTransactions.length > 0) {
                console.log(`[DB] User ${userId} already has data for championship ${championship.id}. Skipping initial cash.`);
                return;
            }

            // Add initial cash transaction
            console.log(`[DB] Creating initial deposit transaction of ${championship.starting_cash}...`);
            const initialDeposit: Transaction = {
                id: `tx_${Date.now()}_champ_start`,
                type: 'deposit',
                amount: championship.starting_cash,
                date: new Date().toISOString(),
                status: 'completed',
                method: 'Championship Starting Funds',
                championshipId: championship.id,
            };
            await addTransaction(userId, initialDeposit, championship.id);
            console.log(`[DB] User ${userId} successfully enrolled in championship ${championship.id}`);
        } catch (e: any) {
            console.error("[DB] Cloud Join Championship Error:", getSupabaseErrorMessage(e));
            throw new Error(`Failed to join championship: ${getSupabaseErrorMessage(e)}`);
        }
    } else {
        await sleep(DELAY_MS);
        // Local: Add initial cash transaction
        const initialDeposit: Transaction = {
            id: `tx_${Date.now()}_champ_start`,
            type: 'deposit',
            amount: championship.starting_cash,
            date: new Date().toISOString(),
            status: 'completed',
            method: 'Championship Starting Funds',
            championshipId: championship.id,
        };
        await addTransaction(userId, initialDeposit, championship.id);
    }
};

// NEW: Function to remove user from championship
export const leaveChampionship = async (userId: string, championshipId: string): Promise<void> => {
    const supabase = getSupabase();
    if (supabase) {
        try {
            // Delete all user data for this championship from cloud
            await supabase.from('holdings').delete().eq('user_email', userId).eq('championship_id', championshipId);
            await supabase.from('transactions').delete().eq('user_email', userId).eq('championship_id', championshipId);
            await supabase.from('agent_logs').delete().eq('user_email', userId).eq('championship_id', championshipId);
            
            console.log(`User ${userId} successfully removed from championship ${championshipId}`);
        } catch (e: any) {
            console.error("Cloud Leave Championship Error:", getSupabaseErrorMessage(e));
            throw new Error(`Failed to leave championship: ${getSupabaseErrorMessage(e)}`);
        }
    } else {
        await sleep(DELAY_MS);
        // Delete all user data for this championship from local storage
        let allHoldings = JSON.parse(localStorage.getItem(`${DB_PREFIX}holdings`) || '[]');
        allHoldings = allHoldings.filter((h: any) => h.userId !== userId || h.championshipId !== championshipId);
        localStorage.setItem(`${DB_PREFIX}holdings`, JSON.stringify(allHoldings));

        let allTx = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
        allTx = allTx.filter((t: any) => t.userId !== userId || t.championshipId !== championshipId);
        localStorage.setItem(`${DB_PREFIX}transactions`, JSON.stringify(allTx));

        let allLogs = JSON.parse(localStorage.getItem(`${DB_PREFIX}agent_logs`) || '[]');
        allLogs = allLogs.filter((l: any) => l.userId !== userId || l.championshipId !== championshipId);
        localStorage.setItem(`${DB_PREFIX}agent_logs`, JSON.stringify(allLogs));
        
        console.log(`User ${userId} successfully removed from championship ${championshipId} (local)`);
    }
};

// This function identifies users who have participated in a championship
export const getUserChampionshipParticipation = async (championshipId: string): Promise<string[]> => {
    console.log(`[DB] getUserChampionshipParticipation for championship ${championshipId}`);
    const supabase = getSupabase();
    if (supabase) {
        try {
            const { data: holdingsData, error: holdingsError } = await supabase
                .from('holdings')
                .select('user_email')
                .eq('championship_id', championshipId);
            
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('transactions')
                .select('user_email')
                .eq('championship_id', championshipId);

            if (holdingsError) console.error("Error fetching participant holdings:", getSupabaseErrorMessage(holdingsError));
            if (transactionsError) console.error("Error fetching participant transactions:", getSupabaseErrorMessage(transactionsError));

            console.log(`[DB] Found holdings: ${holdingsData?.length || 0}, transactions: ${transactionsData?.length || 0}`);

            const participantEmails = new Set<string>();
            if (holdingsData) holdingsData.forEach(h => participantEmails.add(h.user_email));
            if (transactionsData) transactionsData.forEach(t => participantEmails.add(t.user_email));
            
            console.log(`[DB] Unique participants: ${participantEmails.size}`, Array.from(participantEmails));
            return Array.from(participantEmails);

        } catch (e: any) {
            console.error("Cloud Get User Championship Participation Error:", getSupabaseErrorMessage(e));
            return [];
        }
    } else {
        await sleep(DELAY_MS);
        const allHoldings: (Holding & { userId?: string })[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}holdings`) || '[]');
        const allTransactions: (Transaction & { userId?: string })[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
        
        const participantEmails = new Set<string>();
        allHoldings.filter(h => h.championshipId === championshipId && h.userId).forEach(h => participantEmails.add(h.userId!));
        allTransactions.filter(t => t.championshipId === championshipId && t.userId).forEach(t => participantEmails.add(t.userId!));

        return Array.from(participantEmails);
    }
};


// --- PRIZE POOL CALCULATION FUNCTIONS ---

/**
 * Calculate rake percentage based on number of participants
 * Progressive system: More participants = Lower commission
 */
export const calculateRakePercentage = (participantsCount: number): number => {
    if (participantsCount <= 10) return 0.20; // 20% for small tournaments
    if (participantsCount <= 25) return 0.15; // 15% for medium tournaments
    if (participantsCount <= 50) return 0.12; // 12% for large tournaments
    if (participantsCount <= 100) return 0.10; // 10% for very large tournaments
    return 0.08; // 8% for massive tournaments (100+)
};

/**
 * Generate prize distribution based on number of participants
 * Returns array of prize breakdowns with percentages
 */
export const generatePrizeDistribution = (participantsCount: number, totalPrizePool: number): PrizeDistribution[] => {
    const distribution: PrizeDistribution[] = [];
    
    if (participantsCount <= 1) {
        // Solo participant gets 100%
        return [{
            rank: 1,
            user_email: null,
            percentage: 1.0,
            amount: totalPrizePool,
            paid: false
        }];
    }
    
    if (participantsCount <= 5) {
        // 2-5 participants: Top 2 get prizes
        distribution.push(
            { rank: 1, user_email: null, percentage: 0.70, amount: totalPrizePool * 0.70, paid: false },
            { rank: 2, user_email: null, percentage: 0.30, amount: totalPrizePool * 0.30, paid: false }
        );
    } else if (participantsCount <= 10) {
        // 6-10 participants: Top 3 get prizes
        distribution.push(
            { rank: 1, user_email: null, percentage: 0.50, amount: totalPrizePool * 0.50, paid: false },
            { rank: 2, user_email: null, percentage: 0.30, amount: totalPrizePool * 0.30, paid: false },
            { rank: 3, user_email: null, percentage: 0.20, amount: totalPrizePool * 0.20, paid: false }
        );
    } else if (participantsCount <= 20) {
        // 11-20 participants: Top 5 get prizes
        distribution.push(
            { rank: 1, user_email: null, percentage: 0.40, amount: totalPrizePool * 0.40, paid: false },
            { rank: 2, user_email: null, percentage: 0.25, amount: totalPrizePool * 0.25, paid: false },
            { rank: 3, user_email: null, percentage: 0.15, amount: totalPrizePool * 0.15, paid: false },
            { rank: 4, user_email: null, percentage: 0.10, amount: totalPrizePool * 0.10, paid: false },
            { rank: 5, user_email: null, percentage: 0.10, amount: totalPrizePool * 0.10, paid: false }
        );
    } else {
        // 21+ participants: Top 10 get prizes with exponential decay
        const percentages = [0.30, 0.20, 0.12, 0.10, 0.08, 0.07, 0.05, 0.04, 0.02, 0.02];
        percentages.forEach((pct, index) => {
            distribution.push({
                rank: index + 1,
                user_email: null,
                percentage: pct,
                amount: totalPrizePool * pct,
                paid: false
            });
        });
    }
    
    return distribution;
};

/**
 * Calculate complete prize pool information for a championship
 */
export const calculatePrizePool = async (championshipId: string): Promise<PrizePoolInfo | null> => {
    try {
        const championship = await getChampionshipById(championshipId);
        if (!championship || !championship.enrollment_fee || championship.enrollment_fee <= 0) {
            return null;
        }
        
        const participantEmails = await getUserChampionshipParticipation(championshipId);
        const participantsCount = participantEmails.length;
        
        if (participantsCount === 0) {
            return {
                total_collected: 0,
                rake_percentage: calculateRakePercentage(0),
                platform_commission: 0,
                prize_pool: 0,
                participants_count: 0,
                prize_distribution: []
            };
        }
        
        const totalCollected = championship.enrollment_fee * participantsCount;
        const rakePercentage = calculateRakePercentage(participantsCount);
        const platformCommission = totalCollected * rakePercentage;
        const prizePool = totalCollected - platformCommission;
        
        const prizeDistribution = generatePrizeDistribution(participantsCount, prizePool);
        
        return {
            total_collected: totalCollected,
            rake_percentage: rakePercentage,
            platform_commission: platformCommission,
            prize_pool: prizePool,
            participants_count: participantsCount,
            prize_distribution: prizeDistribution
        };
    } catch (e: any) {
        console.error("Error calculating prize pool:", e);
        return null;
    }
};

/**
 * Distribute prizes to winners at the end of a championship
 * This should be called when championship status changes to 'finished'
 */
export const distributePrizes = async (championshipId: string, leaderboard: LeaderboardEntry[]): Promise<boolean> => {
    try {
        const prizePoolInfo = await calculatePrizePool(championshipId);
        if (!prizePoolInfo || prizePoolInfo.prize_pool <= 0) {
            console.log("No prize pool to distribute for championship:", championshipId);
            return false;
        }
        
        // Match leaderboard positions with prize distribution
        const updatedDistribution: PrizeDistribution[] = prizePoolInfo.prize_distribution.map(prize => {
            const winner = leaderboard.find(entry => entry.rank === prize.rank);
            if (winner) {
                return {
                    ...prize,
                    user_email: winner.user_email,
                    user_name: winner.user_name,
                    paid: true,
                    payment_date: new Date().toISOString()
                };
            }
            return prize;
        });
        
        // Update championship with final prize distribution
        const championship = await getChampionshipById(championshipId);
        if (championship) {
            await updateChampionship({
                ...championship,
                prize_distribution: updatedDistribution,
                payment_status: 'distributed',
                rake_percentage: prizePoolInfo.rake_percentage,
                prize_pool: prizePoolInfo.prize_pool,
                platform_commission: prizePoolInfo.platform_commission,
                participants_count: prizePoolInfo.participants_count
            });
        }
        
        console.log(`Prizes distributed for championship ${championshipId}`);
        return true;
    } catch (e: any) {
        console.error("Error distributing prizes:", e);
        return false;
    }
};

// --- WELCOME CUP (Free Championship) ---

/**
 * Get or create the permanent "Welcome Cup" free championship
 * This championship is always available for new users
 */
export const getOrCreateWelcomeCup = async (): Promise<Championship> => {
    const WELCOME_CUP_ID = 'welcome-cup-permanent';
    const supabase = getSupabase();
    
    if (supabase) {
        try {
            // Try to get existing Welcome Cup
            const { data: existing, error: fetchError } = await supabase
                .from('championships')
                .select('*')
                .eq('id', WELCOME_CUP_ID)
                .single();
            
            if (existing && !fetchError) {
                return {
                    id: existing.id,
                    name: existing.name,
                    description: existing.description,
                    start_date: existing.start_date,
                    end_date: existing.end_date,
                    starting_cash: parseFloat(existing.starting_cash),
                    enrollment_fee: parseFloat(existing.enrollment_fee || 0),
                    ticker_restriction_enabled: existing.ticker_restriction_enabled,
                    allowed_tickers: existing.allowed_tickers,
                    status: existing.status,
                    admin_user_id: existing.admin_user_id,
                    created_at: existing.created_at,
                };
            }
            
            // Create new Welcome Cup if doesn't exist
            const now = new Date();
            const endDate = new Date(now.getFullYear() + 1, 11, 31); // End of next year
            
            const { data: created, error: createError } = await supabase
                .from('championships')
                .insert({
                    id: WELCOME_CUP_ID,
                    name: '🎁 Welcome Cup - Gratuito',
                    description: 'Campionato gratuito sempre disponibile per tutti gli utenti. Perfetto per iniziare!',
                    start_date: now.toISOString(),
                    end_date: endDate.toISOString(),
                    starting_cash: 100000,
                    enrollment_fee: 0,
                    ticker_restriction_enabled: false,
                    status: 'active',
                    admin_user_id: 'system@alphaarena.com',
                })
                .select()
                .single();
            
            if (createError) {
                console.error("Error creating Welcome Cup:", getSupabaseErrorMessage(createError));
                throw new Error(`Failed to create Welcome Cup: ${getSupabaseErrorMessage(createError)}`);
            }
            
            return {
                id: created.id,
                name: created.name,
                description: created.description,
                start_date: created.start_date,
                end_date: created.end_date,
                starting_cash: parseFloat(created.starting_cash),
                enrollment_fee: parseFloat(created.enrollment_fee || 0),
                ticker_restriction_enabled: created.ticker_restriction_enabled,
                allowed_tickers: created.allowed_tickers,
                status: created.status,
                admin_user_id: created.admin_user_id,
                created_at: created.created_at,
            };
            
        } catch (e: any) {
            console.error("Error in getOrCreateWelcomeCup:", getSupabaseErrorMessage(e));
            throw e;
        }
    } else {
        // Local fallback
        await sleep(DELAY_MS);
        const allChampionships: Championship[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
        
        let welcomeCup = allChampionships.find(c => c.id === WELCOME_CUP_ID);
        
        if (!welcomeCup) {
            const now = new Date();
            const endDate = new Date(now.getFullYear() + 1, 11, 31);
            
            welcomeCup = {
                id: WELCOME_CUP_ID,
                name: '🎁 Welcome Cup - Gratuito',
                description: 'Campionato gratuito sempre disponibile per tutti gli utenti. Perfetto per iniziare!',
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                starting_cash: 100000,
                enrollment_fee: 0,
                ticker_restriction_enabled: false,
                status: 'active',
                admin_user_id: 'system@alphaarena.com',
                created_at: now.toISOString(),
            };
            
            allChampionships.push(welcomeCup);
            localStorage.setItem(`${DB_PREFIX}championships`, JSON.stringify(allChampionships));
        }
        
        return welcomeCup;
    }
};

// --- GLOBAL STATISTICS ---

export const getGlobalStats = async (): Promise<{ volume: number; traders: number; championships: number }> => {
    const supabase = getSupabase();
    
    if (supabase) {
        try {
            // Get total volume from transactions
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select('amount, type');
            
            const totalVolume = (txData || [])
                .filter((tx: any) => tx.type === 'buy' || tx.type === 'sell')
                .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);
            
            // Get total users count
            const { count: usersCount, error: usersError } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });
            
            // Get active championships count
            const now = new Date().toISOString();
            const { count: champsCount, error: champsError } = await supabase
                .from('championships')
                .select('*', { count: 'exact', head: true })
                .or(`status.eq.active,status.eq.pending`)
                .or(`end_date.is.null,end_date.gte.${now}`);
            
            if (txError) console.warn("Error fetching transaction volume:", getSupabaseErrorMessage(txError));
            if (usersError) console.warn("Error fetching users count:", getSupabaseErrorMessage(usersError));
            if (champsError) console.warn("Error fetching championships count:", getSupabaseErrorMessage(champsError));
            
            return {
                volume: totalVolume || 0,
                traders: usersCount || 0,
                championships: champsCount || 0
            };
        } catch (e: any) {
            console.error("Cloud Get Global Stats Error:", getSupabaseErrorMessage(e));
            // Fallback to local if cloud fails
        }
    }
    
    // Local Fallback
    await sleep(DELAY_MS);
    
    const allTransactions = JSON.parse(localStorage.getItem(`${DB_PREFIX}transactions`) || '[]');
    const totalVolume = allTransactions
        .filter((tx: any) => tx.type === 'buy' || tx.type === 'sell')
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
    
    const allUsers = JSON.parse(localStorage.getItem(`${DB_PREFIX}users`) || '[]');
    const totalTraders = allUsers.length;
    
    const allChampionships: Championship[] = JSON.parse(localStorage.getItem(`${DB_PREFIX}championships`) || '[]');
    const now = new Date();
    const activeChampionships = allChampionships.filter((c: Championship) => {
        const hasEnded = c.end_date && new Date(c.end_date) < now;
        return (c.status === 'active' || c.status === 'pending') && !hasEnded;
    }).length;
    
    return {
        volume: totalVolume,
        traders: totalTraders,
        championships: activeChampionships
    };
};

// --- INITIALIZATION ---
export const initDatabase = async () => {
    // Force init empty if not present
    if (!localStorage.getItem(`${DB_PREFIX}users`)) localStorage.setItem(`${DB_PREFIX}users`, JSON.stringify(SEED_DATA.users));
    if (!localStorage.getItem(`${DB_PREFIX}holdings`)) localStorage.setItem(`${DB_PREFIX}holdings`, JSON.stringify(SEED_DATA.holdings));
    if (!localStorage.getItem(`${DB_PREFIX}transactions`)) localStorage.setItem(`${DB_PREFIX}transactions`, JSON.stringify(SEED_DATA.transactions));
    // Always init with SEED_DATA strategies
    if (!localStorage.getItem(`${DB_PREFIX}strategies`)) localStorage.setItem(`${DB_PREFIX}strategies`, JSON.stringify(SEED_DATA.strategies));
    if (!localStorage.getItem(`${DB_PREFIX}agent_logs`)) localStorage.setItem(`${DB_PREFIX}agent_logs`, JSON.stringify(SEED_DATA.agent_logs));
    if (!localStorage.getItem(`${DB_PREFIX}championships`)) localStorage.setItem(`${DB_PREFIX}championships`, JSON.stringify(SEED_DATA.championships)); // NEW

    // Seed Strategies to Cloud if connected
    const supabase = getSupabase();
    if (supabase) {
        try {
            // Check if strategies exist, if not seed them
            const { count, error } = await supabase.from('strategies').select('*', { count: 'exact', head: true });
            if (error) {
                console.warn("Cloud Init: Error checking strategies for seeding:", getSupabaseErrorMessage(error));
            } else if (count === 0) {
                console.log("Seeding strategies to cloud...");
                for (const s of SEED_DATA.strategies) {
                    await saveStrategy(s);
                }
            }
        } catch(e: any) {
            console.warn("Cloud Init: Cloud seed check failed (network or credentials issue), falling back to local/seed:", getSupabaseErrorMessage(e));
        }
    }
};
