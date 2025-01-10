import { StatusCodeMessage } from '@/constants/enums';
import { BaseENV } from '../env';

export function requestInterceptor(
  url: string,
  options?: Omit<WechatMiniprogram.RequestOption, 'url' | 'method' | 'data'>
) {
  let formatURL = url;
  if (url.startsWith('/api')) {
    const noPrefixURL = url.replace(/^\/api/, '');
    formatURL = `${BaseENV.SERVER_URL}${noPrefixURL}`;
  }

  const token = wx.getStorageSync<string>('token') || null;
  let configs: Omit<WechatMiniprogram.RequestOption, 'url' | 'method' | 'data'> = {};

  if (token) configs = { header: { authorization: token } };
  if (options) Object.assign(configs, options);

  return { formatURL, configs };
}

export function responseInterceptor<T>(
  res: WechatMiniprogram.RequestSuccessCallbackResult
): boolean {
  let responseData: ApiResponse<T> | null = null;

  try {
    if (typeof res.data === 'string') {
      responseData = JSON.parse(res.data) as ApiResponse<T>;
    } else if (res.data && typeof res.data === 'object') {
      responseData = res.data as ApiResponse<T>;
    } else {
      throw new Error('响应数据无效');
    }
  } catch (err) {
    return false;
  }

  const title = `${responseData?.msg}` || `${StatusCodeMessage[responseData?.code]}` || '服务异常';

  if (res.statusCode === 200) {
    if (responseData?.code === 200) {
      return true;
    } else if (responseData?.code === 401) {
      // 重新登录
      wx.showToast({
        title,
        icon: 'none',
        duration: 4000,
        success() {
          wx.removeStorageSync('token');
          // wx.clearStorageSync()
          wx.reLaunch({
            url: '/pages/home/index',
          });
        },
      });
      return false;
    } else {
      return false;
    }
  } else {
    return false;
  }
}