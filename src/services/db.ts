// Database service layer for D1 operations

export interface WebhookLog {
  id: number;
  webhook_id: string;
  topic: string;
  shop_domain: string;
  payload: string;
  processed_at: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface ZaloLog {
  id: number;
  webhook_log_id: number;
  phone: string;
  template_id: string;
  template_data: string;
  zalo_response: string;
  status: string;
  sent_at: string;
  created_at: string;
}

export interface MessageConfig {
  id: number;
  include_order_number: boolean;
  include_total_amount: boolean;
  include_item_list: boolean;
  include_delivery_info: boolean;
  send_condition: string;
  min_amount: number;
  phone_field_mapping: string;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface ZaloFieldMapping {
  id: number;
  zalo_field_name: string;
  shopify_json_path: string;
  default_value: string | null;
  is_required: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * Auto-fail webhooks that have been pending/processing for more than 1 minute
   */
  async autoFailStaleWebhooks(): Promise<number> {
    const result = await this.db
      .prepare(
        `
        UPDATE webhook_logs
        SET status = 'failed', error = 'Processing timeout - automatically marked as failed after 1 minute'
        WHERE (status = 'pending' OR status = 'processing')
        AND datetime(created_at) < datetime('now', '-1 minute')
        `
      )
      .run();
    return result.meta?.changes || 0;
  }

  /**
   * Get all webhook logs with optional filtering
   */
  async getWebhookLogs(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<WebhookLog[]> {
    // Auto-fail stale webhooks first
    await this.autoFailStaleWebhooks();

    let query = 'SELECT * FROM webhook_logs';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all();
    return (result.results || []) as unknown as WebhookLog[];
  }

  /**
   * Get a single webhook log by ID
   */
  async getWebhookLog(id: number): Promise<WebhookLog | null> {
    const result = await this.db
      .prepare('SELECT * FROM webhook_logs WHERE id = ?')
      .bind(id)
      .first();
    return result as WebhookLog | null;
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    today: number;
  }> {
    const stats = await this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as today
      FROM webhook_logs
    `
      )
      .first();

    return {
      total: (stats?.total as number) || 0,
      success: (stats?.success as number) || 0,
      failed: (stats?.failed as number) || 0,
      pending: (stats?.pending as number) || 0,
      today: (stats?.today as number) || 0,
    };
  }

  /**
   * Get all Zalo logs with optional filtering
   */
  async getZaloLogs(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<ZaloLog[]> {
    let query = 'SELECT * FROM zalo_logs';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all();
    return (result.results || []) as unknown as ZaloLog[];
  }

  /**
   * Get Zalo logs for a specific webhook
   */
  async getZaloLogsByWebhook(webhookLogId: number): Promise<ZaloLog[]> {
    const result = await this.db
      .prepare('SELECT * FROM zalo_logs WHERE webhook_log_id = ? ORDER BY created_at DESC')
      .bind(webhookLogId)
      .all();
    return (result.results || []) as unknown as ZaloLog[];
  }

  /**
   * Get Zalo message statistics
   */
  async getZaloStats(): Promise<{
    total: number;
    success: number;
    failed: number;
    today: number;
  }> {
    const stats = await this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as today
      FROM zalo_logs
    `
      )
      .first();

    return {
      total: (stats?.total as number) || 0,
      success: (stats?.success as number) || 0,
      failed: (stats?.failed as number) || 0,
      today: (stats?.today as number) || 0,
    };
  }

  /**
   * Get message configuration
   */
  async getMessageConfig(): Promise<MessageConfig | null> {
    const result = await this.db
      .prepare('SELECT * FROM message_config WHERE id = 1')
      .first();
    return result as MessageConfig | null;
  }

  /**
   * Update message configuration
   */
  async updateMessageConfig(config: Partial<MessageConfig>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (config.include_order_number !== undefined) {
      fields.push('include_order_number = ?');
      values.push(config.include_order_number ? 1 : 0);
    }
    if (config.include_total_amount !== undefined) {
      fields.push('include_total_amount = ?');
      values.push(config.include_total_amount ? 1 : 0);
    }
    if (config.include_item_list !== undefined) {
      fields.push('include_item_list = ?');
      values.push(config.include_item_list ? 1 : 0);
    }
    if (config.include_delivery_info !== undefined) {
      fields.push('include_delivery_info = ?');
      values.push(config.include_delivery_info ? 1 : 0);
    }
    if (config.send_condition !== undefined) {
      fields.push('send_condition = ?');
      values.push(config.send_condition);
    }
    if (config.min_amount !== undefined) {
      fields.push('min_amount = ?');
      values.push(config.min_amount);
    }
    if (config.phone_field_mapping !== undefined) {
      fields.push('phone_field_mapping = ?');
      values.push(config.phone_field_mapping);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE message_config SET ${fields.join(', ')} WHERE id = 1`;
    await this.db.prepare(query).bind(...values).run();
  }

  /**
   * Get a setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .bind(key)
      .first();
    return result ? (result.value as string) : null;
  }

  /**
   * Set a setting
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind(key, value)
      .run();
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const result = await this.db.prepare('SELECT key, value FROM settings').all();
    const settings: Record<string, string> = {};
    for (const row of result.results) {
      const setting = row as unknown as Setting;
      settings[setting.key] = setting.value;
    }
    return settings;
  }

  /**
   * Retry a failed webhook
   */
  async retryWebhook(webhookId: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE webhook_logs
         SET status = 'pending', error = NULL, processed_at = NULL
         WHERE id = ?`
      )
      .bind(webhookId)
      .run();
  }

  /**
   * Get all Zalo field mappings
   */
  async getZaloFieldMappings(): Promise<ZaloFieldMapping[]> {
    const result = await this.db
      .prepare('SELECT * FROM zalo_field_mappings ORDER BY is_required DESC, zalo_field_name')
      .all();
    return (result.results || []) as unknown as ZaloFieldMapping[];
  }

  /**
   * Get a single Zalo field mapping by ID
   */
  async getZaloFieldMapping(id: number): Promise<ZaloFieldMapping | null> {
    const result = await this.db
      .prepare('SELECT * FROM zalo_field_mappings WHERE id = ?')
      .bind(id)
      .first();
    return result as ZaloFieldMapping | null;
  }

  /**
   * Create a new Zalo field mapping
   */
  async createZaloFieldMapping(mapping: Omit<ZaloFieldMapping, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO zalo_field_mappings (zalo_field_name, shopify_json_path, default_value, is_required, description)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        mapping.zalo_field_name,
        mapping.shopify_json_path,
        mapping.default_value || null,
        mapping.is_required ? 1 : 0,
        mapping.description || null
      )
      .run();
  }

  /**
   * Update a Zalo field mapping
   */
  async updateZaloFieldMapping(id: number, mapping: Partial<ZaloFieldMapping>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (mapping.zalo_field_name !== undefined) {
      fields.push('zalo_field_name = ?');
      values.push(mapping.zalo_field_name);
    }
    if (mapping.shopify_json_path !== undefined) {
      fields.push('shopify_json_path = ?');
      values.push(mapping.shopify_json_path);
    }
    if (mapping.default_value !== undefined) {
      fields.push('default_value = ?');
      values.push(mapping.default_value);
    }
    if (mapping.is_required !== undefined) {
      fields.push('is_required = ?');
      values.push(mapping.is_required ? 1 : 0);
    }
    if (mapping.description !== undefined) {
      fields.push('description = ?');
      values.push(mapping.description);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE zalo_field_mappings SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.prepare(query).bind(...values).run();
  }

  /**
   * Delete a Zalo field mapping
   */
  async deleteZaloFieldMapping(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM zalo_field_mappings WHERE id = ?')
      .bind(id)
      .run();
  }
}
