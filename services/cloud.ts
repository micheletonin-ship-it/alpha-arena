
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

export const initCloud = (config: CloudConfig) => {
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

export const getCloudConfig = (): CloudConfig | null => {
    const url = localStorage.getItem('alphaarena_supabase_url');
    const key = localStorage.getItem('alphaarena_supabase_key');
    if (url && key) return { url, key };
    return null;
};

// Expose client for Database Service
export const getSupabase = () => supabase;

// Test connection validity
export const checkConnection = async (): Promise<{ success: boolean; message: string }> => {
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
export const syncKeysToCloud = async (email: string, encryptedKey: string, encryptedSecret: string) => {
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
export const syncKeysFromCloud = async (email: string): Promise<{key: string, secret: string} | null> => {
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
