import fetch, { RequestInit } from 'node-fetch';

/**
 * CAPTCHA-A2 Client Library
 * Provides a convenient interface for interacting with the CAPTCHA-A2 verification middleware
 */
class CaptchaA2Client {
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
    constructor(config: {
        baseUrl: string;
        apiKey: string;
        appName: string;
    }) {
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
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
        return response.data;
    }

    /**
     * Check captcha without consuming it
     * @param captchaKey Captcha key from generateCaptcha
     * @param value Captcha verification value (e.g., "179,76")
     * @returns Promise with boolean indicating verification success
     */
    async checkCaptcha(
        captchaKey: string,
        value: string
    ): Promise<boolean> {
        const response = await this.makeRequest(
            '/api/v1/captcha/check',
            'POST',
            { captchaKey, value }
        );
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
        const response = await this.makeRequest(
            '/api/v1/captcha/verify',
            'POST',
            { captchaKey, value }
        );
        return response.data;
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
        return response.data;
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
        const response = await this.makeRequest(
            '/api/v1/sms/verify',
            'POST',
            { phone, code }
        );
        return response.data;
    }

    /**
     * Clear IP rate limiting
     * @returns Promise with operation result
     */
    async clearIpRateLimit(): Promise<{ message: string; ip: string }> {
        const response = await this.makeRequest('/api/v1/sms/clearip');
        return response.data;
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
        return response.data;
    }
}

export default CaptchaA2Client;