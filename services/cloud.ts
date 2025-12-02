
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CloudConfig } from '../types';

let supabase: SupabaseClient | null = null;

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

const initCloud = (config: CloudConfig) => {
    if (!config.url || !config.key) return;
    
    // Prevent creating multiple instances - check if already initialized
    if (supabase) {
        console.log("Supabase client already initialized, skipping re-initialization.");
        return;
    }
    
    try {
        supabase = createClient(config.url, config.key);
        localStorage.setItem('alphaarena_supabase_url', config.url);
        localStorage.setItem('alphaarena_supabase_key', config.key);
    } catch (e: any) {
        console.error("Supabase init failed", getSupabaseErrorMessage(e));
    }
};

const getCloudConfig = (): CloudConfig | null => {
    const url = localStorage.getItem('alphaarena_supabase_url');
    const key = localStorage.getItem('alphaarena_supabase_key');
    if (url && key) return { url, key };
    return null;
};

// Expose client for Database Service
const getSupabase = () => supabase;

// ===== SUPABASE AUTH FUNCTIONS =====

/**
 * Sign up with email and password
 * Sends confirmation email automatically if enabled in Supabase
 */
const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!supabase) {
        const config = getCloudConfig();
        if (config) initCloud(config);
        else return { success: false, message: "Supabase not initialized" };
    }
    
    try {
        const { data, error } = await supabase!.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: name,
                }
            }
        });
        
        if (error) {
            // Check for duplicate email error
            if (error.message.toLowerCase().includes('already') || 
                error.message.toLowerCase().includes('exists') ||
                error.message.toLowerCase().includes('registered')) {
                return { 
                    success: false, 
                    message: "Questa email è già registrata. Prova ad effettuare il login.",
                    isDuplicate: true
                };
            }
            
            // Check for invalid email
            if (error.message.toLowerCase().includes('invalid')) {
                return { 
                    success: false, 
                    message: "Indirizzo email non valido. Usa un indirizzo email reale."
                };
            }
            
            // Check for weak password
            if (error.message.toLowerCase().includes('password')) {
                return { 
                    success: false, 
                    message: "La password deve essere di almeno 6 caratteri."
                };
            }
            
            return { success: false, message: error.message };
        }
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
            return { 
                success: true, 
                message: "Controlla la tua email per confermare la registrazione!",
                requiresConfirmation: true 
            };
        }
        
        return { success: true, message: "Registrazione completata!", user: data.user };
    } catch (e: any) {
        return { success: false, message: getSupabaseErrorMessage(e) };
    }
};

/**
 * Sign in with email and password
 */
const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
        const config = getCloudConfig();
        if (config) initCloud(config);
        else return { success: false, message: "Supabase not initialized" };
    }
    
    try {
        const { data, error } = await supabase!.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) {
            return { success: false, message: error.message };
        }
        
        return { success: true, user: data.user, session: data.session };
    } catch (e: any) {
        return { success: false, message: getSupabaseErrorMessage(e) };
    }
};

/**
 * Sign out current user
 */
const signOut = async () => {
    if (!supabase) return { success: false, message: "Supabase not initialized" };
    
    try {
        const { error } = await supabase!.auth.signOut();
        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, message: getSupabaseErrorMessage(e) };
    }
};

/**
 * Get current session
 */
const getCurrentSession = async () => {
    if (!supabase) return null;
    
    try {
        const { data: { session } } = await supabase!.auth.getSession();
        return session;
    } catch (e: any) {
        console.error("Get session error:", getSupabaseErrorMessage(e));
        return null;
    }
};

/**
 * Get current user
 */
const getCurrentUser = async () => {
    if (!supabase) return null;
    
    try {
        const { data: { user } } = await supabase!.auth.getUser();
        return user;
    } catch (e: any) {
        console.error("Get user error:", getSupabaseErrorMessage(e));
        return null;
    }
};

/**
 * Listen to auth state changes
 */
const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    if (!supabase) return () => {};
    
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(callback);
    
    return () => subscription.unsubscribe();
};

/**
 * Resend confirmation email
 */
const resendConfirmationEmail = async (email: string) => {
    if (!supabase) return { success: false, message: "Supabase not initialized" };
    
    try {
        const { error } = await supabase!.auth.resend({
            type: 'signup',
            email,
        });
        
        if (error) {
            return { success: false, message: error.message };
        }
        
        return { success: true, message: "Email di conferma inviata!" };
    } catch (e: any) {
        return { success: false, message: getSupabaseErrorMessage(e) };
    }
};

// Test connection validity
const checkConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase) {
        const config = getCloudConfig();
        if (config) initCloud(config);
        else return { success: false, message: "Supabase client not initialized. Check credentials.config.ts" };
    }
    
    try {
        // Try a lightweight query (HEAD request to user_profiles)
        const { count, error } = await supabase!
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            console.error("Connection Check Error:", getSupabaseErrorMessage(error));
            // Provide more specific message for network issues vs. RLS/Permissions
            if (error.message.includes('Failed to fetch')) {
                return { success: false, message: "Connection failed: Network error (check internet/URL)." };
            }
            return { success: false, message: `Connection failed: ${error.message}` };
        }
        
        return { success: true, message: "Successfully connected to Supabase!" };
    } catch (e: any) {
        console.error("Connection Check Exception:", getSupabaseErrorMessage(e));
        return { success: false, message: `Connection failed (network or credentials issue): ${getSupabaseErrorMessage(e)}` };
    }
};

// Sync encrypted keys to cloud
const syncKeysToCloud = async (email: string, encryptedKey: string, encryptedSecret: string) => {
    if (!supabase) {
        const config = getCloudConfig();
        if (config) initCloud(config);
        else return false;
    }
    if (!supabase) return false;

    try {
        const { error } = await supabase
            .from('user_profiles')
            .upsert({ 
                email: email, 
                alpaca_key: encryptedKey, 
                alpaca_secret: encryptedSecret,
                updated_at: new Date().toISOString()
            });
        
        if (error) {
            console.error("Cloud sync upload error:", getSupabaseErrorMessage(error));
            return false; 
        }
        return true;
    } catch (e: any) {
        console.error("Cloud sync upload error (likely network issue or invalid credentials):", getSupabaseErrorMessage(e));
        return false;
    }
};

// Sync encrypted keys from cloud
const syncKeysFromCloud = async (email: string): Promise<{key: string, secret: string} | null> => {
    if (!supabase) {
        const config = getCloudConfig();
        if (config) initCloud(config);
        else return null;
    }
    if (!supabase) return null;

    try {
        // Fetch raw encrypted keys from user profile
        const { data, error } = await supabase
            .from('user_profiles')
            .select('alpaca_key, alpaca_secret')
            .eq('email', email)
            .single();
            
        if (error || !data) return null;
        
        return {
            key: data.alpaca_key,
            secret: data.alpaca_secret
        };
    } catch (e: any) {
        console.error("Cloud sync download error (likely network issue or invalid credentials):", getSupabaseErrorMessage(e));
        return null;
    }
};

// Export all functions at once to avoid tree-shaking issues
export {
    initCloud,
    getCloudConfig,
    getSupabase,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    getCurrentSession,
    getCurrentUser,
    onAuthStateChange,
    resendConfirmationEmail,
    checkConnection,
    syncKeysToCloud,
    syncKeysFromCloud
};
