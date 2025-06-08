CAPTCHA-A2 客户端库

CAPTCHA-A2 客户端是一个 TypeScript 库，用于与 CAPTCHA-A2 验证码中间件服务交互，提供滑块验证和短信验证功能。

安装

使用 npm:

npm install captcha-a2-client

或使用 pnpm:

pnpm add captcha-a2-client

或使用 yarn:

yarn add captcha-a2-client

快速开始

基础用法

import CaptchaA2Client from 'captcha-a2-client';

// 初始化客户端
const captchaClient = new CaptchaA2Client({
  baseUrl: 'https://your-captcha-service.com',
  apiKey: 'your-api-key',
  appName: 'your-app-name',
  clientIp: 'user-ip-address' // 可选，后续可通过 setClientIp 设置
});

与 Hono 框架集成示例

import { Hono } from 'hono';
import CaptchaA2Client from 'captcha-a2-client';

const captchaA2Client = new CaptchaA2Client({
  baseUrl: 'https://captcha-a2.captcha.ca/',
  apiKey: 'key',
  appName: 'capt2',
});

const app = new Hono();

app.get('/', async (c) => {
  captchaA2Client.setClientIp('127.0.0.1');
  const data = await captchaA2Client.generateCaptcha();
  console.log(data);

  return c.text('Hello Hono!');
});

export default app;

API 文档

构造函数

new CaptchaA2Client(config: {
  baseUrl: string;      // CAPTCHA-A2 服务基础URL
  apiKey: string;       // API密钥
  appName: string;      // 应用名称
  clientIp?: string;    // 客户端IP（可选）
})

方法

setClientIp(ip: string)

设置客户端IP地址

generateCaptcha()

生成滑块验证码

返回 Promise 包含:
captcha_key: string;  // 验证码唯一标识

  image: string;        // 背景图(base64)
  thumb: string;        // 滑块图(base64)
  thumbY: number;       // 滑块Y坐标
  thumbX: number;       // 滑块X坐标
  thumbWidth: number;   // 滑块宽度
  thumbHeight: number;  // 滑块高度
  // ...其他属性

checkCaptcha(captchaKey: string, value: string)

检查验证码但不消耗

verifyCaptcha(captchaKey: string, value: string)

验证并消耗验证码

sendSmsWithCaptcha(captchaKey: string, value: string, phone: string, code: number)

发送短信验证码（需先通过滑块验证）

verifySms(phone: string, code: number)

验证短信验证码

错误处理

所有方法都可能抛出以下错误:

try {
  await captchaClient.generateCaptcha();
catch (error) {

  if (error instanceof CaptchaA2Error) {
    console.error('验证码服务错误:', error.message);
else {

    console.error('未知错误:', error);
}

开发指南

本地开发
克隆仓库

安装依赖:

      pnpm install
   
启动开发模式:

      pnpm dev
   

运行测试

pnpm test

构建生产版本

pnpm build
