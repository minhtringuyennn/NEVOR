// Zalo ZBS API service

import type {
  ZaloTemplateData,
  ZaloSendMessageResponse,
  ZaloOAProfile,
  ZaloTemplateInfo,
  ZaloTemplateList,
  ZaloQuota,
} from '../types/zalo';

export class ZaloService {
  private appId: string;
  private accessToken: string;
  private oaId: string;
  private baseUrl = 'https://business.openapi.zalo.me';

  constructor(appId: string, accessToken: string, oaId: string) {
    this.appId = appId;
    this.accessToken = accessToken;
    this.oaId = oaId;
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
      const response = await fetch(`${this.baseUrl}/message/template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: this.accessToken,
        },
        body: JSON.stringify({
          phone: phone,
          template_id: templateId,
          template_data: templateData,
          tracking_id: `${Date.now()}`,
        }),
      });

      const result: ZaloSendMessageResponse = await response.json();

      if (!response.ok || result.error !== 0) {
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
      const response = await fetch(`${this.baseUrl}/oa/getoa`, {
        method: 'GET',
        headers: {
          access_token: this.accessToken,
        },
      });

      const result: ZaloOAProfile = await response.json();
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
      const response = await fetch(
        `${this.baseUrl}/template/info?template_id=${templateId}`,
        {
          method: 'GET',
          headers: {
            access_token: this.accessToken,
          },
        }
      );

      const result: ZaloTemplateInfo = await response.json();
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
      const response = await fetch(`${this.baseUrl}/message/quota`, {
        method: 'GET',
        headers: {
          access_token: this.accessToken,
        },
      });

      const result: ZaloQuota = await response.json();
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

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          access_token: this.accessToken,
        },
      });

      const result: ZaloTemplateList = await response.json();
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
