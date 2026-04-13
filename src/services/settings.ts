// Settings service for managing app configuration from database
// Replaces environment variables with database-stored settings

const encoder = new TextEncoder();

/**
 * Hash password using PBKDF2 with SHA-256
 * Returns base64 encoded string containing salt + hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits directly (not a key, so we can get the raw bytes)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  );

  const hashBytes = new Uint8Array(derivedBits);

  // Combine salt + hash and encode to base64
  const combined = new Uint8Array(salt.length + hashBytes.length);
  combined.set(salt);
  combined.set(hashBytes, salt.length);

  // Convert to base64
  const base64 = btoa(String.fromCharCode(...combined));
  return base64;
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password: string, hashBase64: string): Promise<boolean> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(hashBase64), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const originalHash = combined.slice(16);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive bits with same salt
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const newHash = new Uint8Array(derivedBits);

    // Constant time comparison
    if (originalHash.length !== newHash.length) return false;
    let equal = true;
    for (let i = 0; i < originalHash.length; i++) {
      equal &&= originalHash[i] === newHash[i];
    }
    return equal;
  } catch {
    return false;
  }
}

export interface AppSettings {
  shopify_webhook_secret: string;
  shopify_shop_domain: string;
  zalo_app_id: string;
  zalo_access_token: string;
  zalo_refresh_token: string;
  zalo_oa_id: string;
  zalo_template_id: string;
}

// Public-safe settings (no secrets exposed)
export interface PublicAppConfig {
  shopify_shop_domain: string;
  zalo_app_id: string;
  zalo_oa_id: string;
  zalo_template_id: string;
}

export class SettingsService {
  constructor(private db: D1Database) {}

  async get(key: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .bind(key)
      .first();
    return result ? (result.value as string) : null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind(key, value)
      .run();
  }

  async setMany(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value);
    }
  }

  async getAdminPasswordHash(): Promise<string | null> {
    return this.get('admin_password_hash');
  }

  async setAdminPassword(password: string): Promise<void> {
    const hash = await hashPassword(password);
    await this.set('admin_password_hash', hash);
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    const hash = await this.getAdminPasswordHash();
    if (!hash) return false;
    return verifyPassword(password, hash);
  }

  async hasAdminPassword(): Promise<boolean> {
    const hash = await this.getAdminPasswordHash();
    return !!hash && hash.length > 0;
  }

  async getAllSettings(): Promise<AppSettings> {
    const keys = [
      'shopify_webhook_secret',
      'shopify_shop_domain',
      'zalo_app_id',
      'zalo_access_token',
      'zalo_refresh_token',
      'zalo_oa_id',
      'zalo_template_id',
    ];
    const settings: Partial<AppSettings> = {};
    for (const key of keys) {
      const value = await this.get(key);
      (settings as any)[key] = value || '';
    }
    return settings as AppSettings;
  }

  async isConfigured(): Promise<boolean> {
    const hash = await this.getAdminPasswordHash();
    const webhookSecret = await this.get('shopify_webhook_secret');
    const zaloToken = await this.get('zalo_access_token');
    return !!hash && hash.length > 0 && !!webhookSecret && webhookSecret.length > 0 && !!zaloToken && zaloToken.length > 0;
  }

  /**
   * Refresh Zalo access token using refresh token
   * Returns true if token was refreshed successfully
   */
  async refreshZaloToken(): Promise<boolean> {
    const refreshToken = await this.get('zalo_refresh_token');
    const appId = await this.get('zalo_app_id');
    const appSecret = await this.get('zalo_app_secret');

    if (!refreshToken || !appId || !appSecret) {
      console.error('Missing required credentials for token refresh');
      return false;
    }

    try {
      const response = await fetch('https://oauth.zaloapp.com/v4/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'secret_key': appSecret,
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          app_id: appId,
          grant_type: 'refresh_token',
        }),
      });

      const data: { access_token?: string; refresh_token?: string } = await response.json();

      if (data.access_token) {
        await this.set('zalo_access_token', data.access_token);
        if (data.refresh_token) {
          await this.set('zalo_refresh_token', data.refresh_token);
        }
        console.log('Zalo access token refreshed successfully');
        return true;
      } else {
        console.error('Failed to refresh Zalo token:', data);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing Zalo token:', error);
      return false;
    }
  }
}
