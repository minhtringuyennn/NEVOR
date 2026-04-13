// Settings service for managing app configuration from database
// Replaces environment variables with database-stored settings

const encoder = new TextEncoder();

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  // Export key bytes for hashing
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hashBytes = new Uint8Array(rawKey as ArrayBuffer);
  // Combine salt + hash and encode to base64
  const combined = new Uint8Array(salt.length + hashBytes.length);
  combined.set(salt);
  combined.set(hashBytes, salt.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hashBase64: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(hashBase64), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const originalHash = combined.slice(16);
    const key = await deriveKey(password, salt);
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const newHash = new Uint8Array(rawKey as ArrayBuffer);
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
}
