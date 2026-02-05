// Zalo ZBS (Zalo Business Service) API types

export interface ZaloTemplateData {
  [key: string]: string | number;
}

export interface ZaloSendMessageRequest {
  phone: string;
  template_id: string;
  template_data: ZaloTemplateData;
  tracking_id?: string;
}

export interface ZaloSendMessageResponse {
  error: number;
  message: string;
  data?: {
    msg_id: string;
    sent_time: string;
  };
}

export interface ZaloOAProfile {
  error: number;
  message: string;
  data?: {
    oa_id: string;
    name: string;
    description: string;
    avatar: string;
    cover: string;
  };
}

export interface ZaloTemplateInfo {
  error: number;
  message: string;
  data?: {
    template_id: string;
    template_name: string;
    status: string;
    preview_url: string;
    template_quality: string;
    template_tag: string;
    created_time: string;
    updated_time: string;
    approved_time?: string;
    params?: Array<{
      name: string;
      require: boolean;
      type: string;
      description?: string;
    }>;
    buttons?: Array<{
      type: string;
      title: string;
      payload?: string;
    }>;
  };
}

export interface ZaloTemplateList {
  error: number;
  message: string;
  data?: {
    total: number;
    templates: Array<{
      template_id: string;
      template_name: string;
      status: string;
      preview_url: string;
      template_quality: string;
      template_tag: string;
      created_time: string;
      updated_time: string;
    }>;
  };
}

export interface ZaloQuota {
  error: number;
  message: string;
  data?: {
    daily_quota: number;
    remaining_quota: number;
  };
}
