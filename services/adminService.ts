/**
 * Admin Service
 * Functions to manage users via backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned: boolean;
  banned_until: string | null;
}

/**
 * Get all users (Admin only)
 */
export async function getAllUsers(): Promise<{ success: boolean; users?: AdminUser[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`
      };
    }

    return {
      success: true,
      users: data.users
    };
  } catch (error: any) {
    console.error('[AdminService] Get users error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch users'
    };
  }
}

/**
 * Disable/Ban a user (Admin only)
 */
export async function disableUser(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error: any) {
    console.error('[AdminService] Disable user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to disable user'
    };
  }
}

/**
 * Enable/Unban a user (Admin only)
 */
export async function enableUser(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error: any) {
    console.error('[AdminService] Enable user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to enable user'
    };
  }
}

/**
 * Delete a user permanently (Admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error: any) {
    console.error('[AdminService] Delete user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete user'
    };
  }
}
