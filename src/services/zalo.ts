// Zalo ZBS API service with automatic token refresh

import type {
  ZaloTemplateData,
  ZaloSendMessageResponse,
  ZaloOAProfile,
  ZaloTemplateInfo,
  ZaloTemplateList,
  ZaloQuota,
} from '../types/zalo';
import { SettingsService } from './settings';

export class ZaloService {
  private accessToken: string;
  private refreshTokenValue?: string;
  private settingsService?: SettingsService;
  // ZNS template APIs (phone-based sending, template listing)
  private baseUrl = 'https://business.openapi.zalo.me';
  // OA profile/management APIs (v2 OpenAPI)
  private oaBaseUrl = 'https://openapi.zalo.me/v2.0/oa';

  constructor(accessToken: string, refreshToken?: string, settingsService?: SettingsService) {
    this.accessToken = accessToken;
    this.refreshTokenValue = refreshToken;
    this.settingsService = settingsService;
  }

  /**
   * Refresh access token using refresh token
   */
  private async doRefreshToken(): Promise<boolean> {
    if (!this.settingsService) {
      console.error('SettingsService not available for token refresh');
      return false;
    }

    return await this.settingsService.refreshZaloToken();
  }

  /**
   * Make API request with automatic token refresh on 401
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    retryCount: number = 1
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        access_token: this.accessToken,
      },
    });

    // If unauthorized and we have refresh capability, try to refresh
    if (response.status === 401 && retryCount > 0 && this.refreshTokenValue) {
      console.log('Access token expired, attempting refresh...');
      const refreshed = await this.doRefreshToken();
      if (refreshed) {
        // Get new token from settings
        const newToken = await this.settingsService?.get('zalo_access_token');
        if (newToken) {
          this.accessToken = newToken;
          // Retry the request
          return this.makeRequest(url, options, retryCount - 1);
        }
      }
    }

    return response.json() as Promise<T>;
  }

  /**
   * Send template message via Zalo ZBS
   * @param phone Phone number in E.164 format (e.g., 84912345678)
   * @param templateId Template ID from Zalo dashboard
   * @param templateData Template parameters
   */
  async sendTemplateMessage(
    phone: string,
    templateId: string,
    templateData: ZaloTemplateData
  ): Promise<ZaloSendMessageResponse> {
    try {
      const result = await this.makeRequest<ZaloSendMessageResponse>(
        `${this.baseUrl}/message/template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phone,
            template_id: templateId,
            template_data: templateData,
            tracking_id: `${Date.now()}`,
          }),
        }
      );

      if (result.error !== 0) {
        console.error('Zalo API error:', result);
      }

      return result;
    } catch (error) {
      console.error('Zalo send message error:', error);
      return {
        error: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send template message with retry logic
   * @param phone Phone number
   * @param templateId Template ID
   * @param templateData Template data
   * @param maxRetries Maximum number of retries
   * @param retryDelay Delay between retries in milliseconds
   */
  async sendTemplateMessageWithRetry(
    phone: string,
    templateId: string,
    templateData: ZaloTemplateData,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ZaloSendMessageResponse> {
    let lastError: ZaloSendMessageResponse | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.sendTemplateMessage(phone, templateId, templateData);

      if (result.error === 0) {
        return result;
      }

      lastError = result;

      // Don't retry for certain error codes (invalid phone, invalid template, etc.)
      if (result.error && [124, 125, 126].includes(result.error)) {
        break;
      }

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return lastError || { error: -1, message: 'Max retries reached' };
  }

  /**
   * Get OA (Official Account) profile information
   */
  async getOAProfile(): Promise<ZaloOAProfile> {
    try {
      const result = await this.makeRequest<ZaloOAProfile>(
        `${this.oaBaseUrl}/getoa`,
        {
          method: 'GET',
        }
      );
      return result;
    } catch (error) {
      console.error('Zalo get OA profile error:', error);
      return {
        error: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get template information
   */
  async getTemplateInfo(templateId: string): Promise<ZaloTemplateInfo> {
    try {
      const result = await this.makeRequest<ZaloTemplateInfo>(
        `${this.baseUrl}/template/info?template_id=${templateId}`,
        {
          method: 'GET',
        }
      );
      return result;
    } catch (error) {
      console.error('Zalo get template info error:', error);
      return {
        error: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get remaining message quota
   */
  async getQuota(): Promise<ZaloQuota> {
    try {
      const result = await this.makeRequest<ZaloQuota>(
        `${this.baseUrl}/message/quota`,
        {
          method: 'GET',
        }
      );
      return result;
    } catch (error) {
      console.error('Zalo get quota error:', error);
      return {
        error: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all templates with optional filtering
   * @param offset Pagination offset
   * @param limit Number of templates to return (max 100)
   * @param status Filter by status (approved, pending, rejected)
   */
  async listAllTemplates(
    offset: number = 0,
    limit: number = 100,
    status?: string
  ): Promise<ZaloTemplateList> {
    try {
      let url = `${this.baseUrl}/template/all?offset=${offset}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }

      const result = await this.makeRequest<ZaloTemplateList>(
        url,
        {
          method: 'GET',
        }
      );
      return result;
    } catch (error) {
      console.error('Zalo list templates error:', error);
      return {
        error: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test Zalo API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const profile = await this.getOAProfile();

      if (profile.error === 0) {
        return {
          success: true,
          message: 'Successfully connected to Zalo API',
          details: profile.data,
        };
      } else {
        return {
          success: false,
          message: profile.message || 'Failed to connect to Zalo API',
          details: profile,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
