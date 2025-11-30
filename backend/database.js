// backend/database.js
// Database operations for webhook and backend services

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[DB] Missing Supabase credentials in environment variables');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Save payment record to database
 * @param {Object} payment Payment data
 * @param {string} payment.id Unique payment ID
 * @param {string} payment.user_email User email
 * @param {string} payment.championship_id Championship ID
 * @param {string} payment.stripe_payment_intent_id Stripe PaymentIntent ID
 * @param {number} payment.amount Amount in dollars
 * @param {string} payment.currency Currency code (e.g., 'usd')
 * @param {string} payment.status Payment status ('succeeded', 'failed', 'pending')
 * @param {string} payment.payment_method Payment method type
 */
async function savePayment(payment) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { error } = await supabase.from('payments').upsert({
      id: payment.id,
      user_email: payment.user_email,
      championship_id: payment.championship_id,
      stripe_payment_intent_id: payment.stripe_payment_intent_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.payment_method,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[DB] Error saving payment:', error);
      throw error;
    }

    console.log('[DB] Payment saved successfully:', payment.id);
  } catch (error) {
    console.error('[DB] Exception saving payment:', error);
    throw error;
  }
}

/**
 * Auto-enroll user in championship by adding initial deposit transaction
 * @param {string} userEmail User email
 * @param {Object} championship Championship data
 * @param {string} championship.id Championship ID
 * @param {number} championship.starting_cash Starting cash amount
 */
async function joinChampionship(userEmail, championship) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Check if user already enrolled (has starting funds transaction)
    const { data: existing, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_email', userEmail)
      .eq('championship_id', championship.id)
      .eq('type', 'deposit')
      .eq('method', 'Championship Starting Funds')
      .maybeSingle();

    if (checkError) {
      console.error('[DB] Error checking existing enrollment:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('[DB] User already enrolled in championship:', championship.id);
      return;
    }

    // Add initial deposit transaction
    const transactionId = `tx_${Date.now()}_champ_start`;
    const { error: insertError } = await supabase.from('transactions').insert({
      id: transactionId,
      user_email: userEmail,
      type: 'deposit',
      amount: championship.starting_cash,
      date: new Date().toISOString(),
      status: 'completed',
      method: 'Championship Starting Funds',
      championship_id: championship.id,
    });

    if (insertError) {
      console.error('[DB] Error enrolling user:', insertError);
      throw insertError;
    }

    console.log('[DB] User enrolled successfully with starting cash:', championship.starting_cash);
  } catch (error) {
    console.error('[DB] Exception enrolling user:', error);
    throw error;
  }
}

/**
 * Get user by email
 * @param {string} email User email
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserByEmail(email) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('[DB] Error fetching user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[DB] Exception fetching user:', error);
    throw error;
  }
}

/**
 * Get championship by ID
 * @param {string} championshipId Championship ID
 * @returns {Promise<Object|null>} Championship object or null
 */
async function getChampionshipById(championshipId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('championships')
      .select('*')
      .eq('id', championshipId)
      .single();

    if (error) {
      console.error('[DB] Error fetching championship:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[DB] Exception fetching championship:', error);
    throw error;
  }
}

module.exports = {
  savePayment,
  joinChampionship,
  getUserByEmail,
  getChampionshipById,
};
