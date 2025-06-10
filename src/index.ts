import fetch, { RequestInit } from 'node-fetch';

const getClientIp = (c) => {
  const ip = c.req.header('X-Real-IP') || 'none';
  return ip;
};

export interface CaptChaA2Response {
  code: string;
  data: null | object;
  error: string;
  message: string;
}

/**
 * Custom error class for CAPTCHA-A2 client errors
 */
export class CaptchaA2Error extends Error {
  public readonly errResponse: CaptChaA2Response;

  constructor(errResponse: CaptChaA2Response) {
    super(errResponse.message);
    this.name = 'CaptchaA2Error';
    this.errResponse = errResponse;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CaptchaA2Error);
    }
  }

  /**
   * Convert the error to a plain object for serialization
   */
  toJSON() {
    return this.errResponse;
  }
}

export const captchaA2CheckMiddleware = (captchaA2Client: CaptchaA2Client) => {
  return async (c: any, next: any) => {
    // 获取客户端 IP
    const clientIp = getClientIp(c);
    captchaA2Client.setClientIp(clientIp);

    let captchaKey: string, value: string;
    try {
      const body = await c.req.json();
      captchaKey = body.captchaKey;
      value = body.value;
    } catch (e) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    try {
      const data = await captchaA2Client.checkCaptcha(captchaKey, value);
      if (!data) {
        throw new CaptchaA2Error({
          code: '500',
          message: 'Captcha verification failed',
          data: null,
          error: 'CAPTCHA_CHECK_FAILED',
        });
      }
      await next();
    } catch (error) {
      if (error instanceof CaptchaA2Error) {
        return c.json(error.toJSON(), 500);
      }
      return c.json({ error: 'Failed to verify captcha' }, 500);
    }
  };
};

export const captchaA2Middleware = (captchaA2Client: CaptchaA2Client) => {
  return async (c: any, next: any) => {
    // 获取客户端 IP
    const clientIp = getClientIp(c);
    captchaA2Client.setClientIp(clientIp);

    let captchaKey: string, value: string;
    try {
      const body = await c.req.json();
      captchaKey = body.captchaKey;
      value = body.value;
    } catch (e) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    try {
      const data = await captchaA2Client.verifyCaptcha(captchaKey, value);
      // 验证通过，继续后续中间件
      c.set('captchaA2Result', data);
      await next();
    } catch (error) {
      if (error instanceof CaptchaA2Error) {
        return c.json(error.toJSON(), 500);
      }
      return c.json({ error: 'Failed to verify captcha' }, 500);
    }
  };
};

/**
 * CAPTCHA-A2 Client Library
 * Provides a convenient interface for interacting with the CAPTCHA-A2 verification middleware
 */
export class CaptchaA2Client {
  private baseUrl: string;
  private apiKey: string;
  private appName: string;
  private clientIp: string;

  /**
   * Initialize the CAPTCHA-A2 client
   * @param config Configuration object
   * @param config.baseUrl Base URL of the CAPTCHA-A2 service
   * @param config.apiKey API key for authentication (TS-CAPTCHA-KEY)
   * @param config.appName Application name (X-App header)
   * @param config.clientIp Client IP address (X-Client-IP header)
   */
  constructor(config: { baseUrl: string; apiKey: string; appName: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.appName = config.appName;
    this.clientIp = 'none';
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Api-Key': this.apiKey,
      'X-Client-IP': this.clientIp,
      'X-App': this.appName,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const jsonResponse = await response.json() as CaptChaA2Response;
      if (!response.ok) {
        throw new CaptchaA2Error( jsonResponse );
      }
      return jsonResponse;
    } catch (error) {
      throw error;
    }
  }

  // Slider Captcha Methods

  setClientIp(clientIp: string) {
    this.clientIp = clientIp;
  }

  /**
   * Generate a new slider captcha
   * @returns Promise with captcha generation data
   */
  async generateCaptcha(): Promise<{
    captcha_key: string;
    image: string;
    thumb: string;
    thumbY: number;
    thumbX: number;
    thumbWidth: number;
    thumbHeight: number;
    master_width: number;
    master_height: number;
    id: string;
  }> {
    const response = await this.makeRequest('/api/v1/captcha/generate');
    return response;
  }

  /**
   * Check captcha without consuming it
   * @param captchaKey Captcha key from generateCaptcha
   * @param value Captcha verification value (e.g., "179,76")
   * @returns Promise with boolean indicating verification success
   */
  async checkCaptcha(captchaKey: string, value: string): Promise<boolean> {
    const response = await this.makeRequest('/api/v1/captcha/check', 'POST', {
      captchaKey,
      value,
    });
    return response.data;
  }

  /**
   * Verify and consume captcha
   * @param captchaKey Captcha key from generateCaptcha
   * @param value Captcha verification value (e.g., "161,143")
   * @returns Promise with verification result
   */
  async verifyCaptcha(
    captchaKey: string,
    value: string
  ): Promise<{ code: number; message: string }> {
    const response = await this.makeRequest('/api/v1/captcha/verify', 'POST', {
      captchaKey,
      value,
    });
    return response;
  }

  // SMS Verification Methods

  /**
   * Send SMS verification code with captcha verification
   * @param captchaKey Captcha key from generateCaptcha
   * @param value Captcha verification value (e.g., "95,24")
   * @param phone Phone number to send SMS to
   * @param code SMS template code
   * @returns Promise with message ID
   */
  async sendSmsWithCaptcha(
    captchaKey: string,
    value: string,
    phone: string,
    code: number
  ): Promise<{ msg_id: number }> {
    const response = await this.makeRequest(
      '/api/v1/sms/send-with-captcha',
      'POST',
      { captchaKey, value, phone, code }
    );
    return response;
  }

  /**
   * Verify SMS code
   * @param phone Phone number that received the SMS
   * @param code SMS verification code to verify
   * @returns Promise with verification result
   */
  async verifySms(
    phone: string,
    code: number
  ): Promise<{ code: number; message: string }> {
    const response = await this.makeRequest('/api/v1/sms/verify', 'POST', {
      phone,
      code,
    });
    return response;
  }

  /**
   * Clear IP rate limiting
   * @returns Promise with operation result
   */
  async clearIpRateLimit(): Promise<{ message: string; ip: string }> {
    const response = await this.makeRequest('/api/v1/sms/clearip');
    return response;
  }

  /**
   * Clear phone rate limiting and verification codes
   * @param phone Phone number to clear
   * @returns Promise with operation result
   */
  async clearPhoneRateLimit(phone: string): Promise<{
    message: string;
    phone: string;
  }> {
    const response = await this.makeRequest(
      `/api/v1/sms/clear?phone=${encodeURIComponent(phone)}`
    );
    return response;
  }
}
