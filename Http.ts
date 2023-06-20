import { isEmpty } from 'lodash';

type TMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type THeaders = {
  [key: string]: string;
};

// 这个配置仅适用于当前项目, 若要移到别的项目, 请整体检查一遍先
export type TRequestConfig = {
  baseURL: string;
  url: string;
  method: TMethod;
  headers: THeaders;
  data?: any;
  params?: any;
  signal: AbortSignal;
  timeout: number;
  cache?: 'force-cache' | 'no-store';
  revalidate?: false | 0 | number;
};

type TFetchOptions = {
  method: TMethod;
  headers: any;
  body?: any;
  mode: 'cors';
  credentials: 'include';
  signal: AbortSignal;
  cache?: 'force-cache' | 'no-store';
  next?: { revalidate: false | 0 | number };
};

export default class Http {
  private defaultRequestConfig: Partial<TRequestConfig>;

  constructor(config: Partial<TRequestConfig> = {}) {
    this.defaultRequestConfig = {
      baseURL: config.baseURL || '',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      timeout: 60000, // 60s timeout
    };
  }

  // SSR only
  setCookie(nextCookie: string | null = '') {
    this.defaultRequestConfig.headers = {
      ...this.defaultRequestConfig.headers,
      Cookie: String(nextCookie),
    };

    // 服务端从cookie中获取token
    // const aspectaToken = utils.getCookieValue(nextCookie || '', cookieJar._auth_token);
    // if (aspectaToken) {
    //   this.defaultRequestConfig.headers = {
    //     ...this.defaultRequestConfig.headers,
    //     Authorization: `Bearer ${aspectaToken}`,
    //   };
    // }
  }

  get(url: string, config: Partial<TRequestConfig> = {}) {
    console.log('test233')
    return this.buildHttpRequest({ ...config, url, method: 'GET' });
  }

  post(url: string, data: any = {}, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({ ...config, url, method: 'POST', data });
  }

  // only used when uploading files
  postForm(url: string, data: any = {}, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({
      ...config,
      url,
      method: 'POST',
      data,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  put(url: string, data: any = {}, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({ ...config, url, method: 'PUT', data });
  }

  // only used when uploading files
  putForm(url: string, data: any = {}, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({
      ...config,
      url,
      method: 'PUT',
      data,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  patch(url: string, data: any = {}, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({ ...config, url, method: 'PATCH', data });
  }

  // only used when uploading files
  patchForm(url: string, data: any = {}, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({
      ...config,
      url,
      method: 'PATCH',
      data,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  delete(url: string, config: Partial<TRequestConfig> = {}) {
    return this.buildHttpRequest({ ...config, url, method: 'DELETE' });
  }

  // https://stackoverflow.com/questions/9804777/how-to-test-if-a-string-is-json-or-not
  isJson(responseText: string) {
    let value =
      typeof responseText !== 'string'
        ? JSON.stringify(responseText)
        : responseText;
    try {
      value = JSON.parse(value);
    } catch (e) {
      return false;
    }

    return typeof value === 'object' && value !== null;
  }

  async buildHttpRequest(config: Partial<TRequestConfig>) {
    // Create the abort controller for timeout handling
    const abortController = new AbortController();
    const { signal } = abortController;
    const timeout =
      typeof config.timeout !== 'undefined'
        ? config.timeout
        : this.defaultRequestConfig.timeout;

    let url = config.url || '';
    const method = config.method || 'GET';
    const data = config.data;
    const params = config.params;

    // merge params in url if params is not empty
    if (!isEmpty(params)) {
      url = `${url}?${new URLSearchParams(params)}`;
    }

    // append the base url if it's not already in the url
    if (!url.startsWith('http')) {
      url = `${this.defaultRequestConfig.baseURL}${url}`;
    }

    // Create fetch options
    let fetchOptions: TFetchOptions = {
      method,
      headers: {
        ...this.defaultRequestConfig.headers,
        ...(config.headers || {}),
      },
      mode: 'cors',
      credentials: 'include',
      signal: config.signal || signal,
    };

    // 客户端从cookie中获取token
    // if (!utils.isSSR() && cookieJar.get(cookieJar._auth_token)) {
    fetchOptions = {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        // Authorization: `Bearer ${cookieJar.get(cookieJar._auth_token)}`,
      },
    };

    // Add the body if it's a POST... request
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // convert data to FormData if needed
      // fix this type error
      if (
        (fetchOptions.headers['Content-Type'] ===
          'application/x-www-form-urlencoded' ||
          fetchOptions.headers['Content-Type'] === 'multipart/form-data') &&
        !(data instanceof FormData)
      ) {
        // remove Content-Type header, let browser to set it automatically
        delete fetchOptions.headers['Content-Type'];

        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          formData.append(key, data[key]);
        });
        fetchOptions.body = formData;
      } else {
        fetchOptions.body = JSON.stringify(data);
      }
    }

    // Make the fetch request
    const _fetchPromise = fetch(url, fetchOptions);

    // start the timer
    // if the timer is reached before the fetch is done, abort the fetch

    let timer;
    // do not abort the request if timeout === 0
    if (timeout !== 0) {
      timer = setTimeout(
        () => abortController.abort('Request timeout'),
        timeout,
      );
    }

    // await the fetch with a catch in case it's aborted which signals an error
    try {
      const result = await _fetchPromise.then((response) => {
        // throw error if response is not ok
        if (!response.ok) {
          throw response;
        }

        // sometimes the response is empty
        return response.text().then((responseText) => {
          if (responseText && this.isJson(responseText)) {
            return JSON.parse(responseText);
          }
          return {};
        });
      });
      clearTimeout(timer);
      return result;
    } catch (error: any) {
      console.log('💥 Request error URL:', url);
      timer && clearTimeout(timer);
      // if (error.status === 401) {
      //   if (!utils.isSSR() && cookieJar.get(cookieJar._auth_token)) {
      //     cookieJar.remove(cookieJar._auth_token);
      //   }
      // }

      // this is still a response object
      if (
        error.bodyUsed === false &&
        error.text &&
        typeof error.text == 'function'
      ) {
        clearTimeout(timer);

        // get the response text
        const responseText = await error.text();

        // try to decode the response text to json
        if (responseText && this.isJson(responseText)) {
          clearTimeout(timer);

          console.log('💥 Request error(0):', JSON.parse(responseText));

          // throw to outer catch callback
          const parsedError = JSON.parse(responseText);

          // if parsedError.detail exists, convert it to parsedError.message
          // this should be in this format { detail: 'error message' }
          // if (parsedError.detail) {
          //   throw Error(parsedError.detail);
          // }

          /**
           * this should be a form validation error format, or something we handle in the component anyway
           * {
           *   "email": ["email is required."],
           *   "password": [
           *     "This password is too short. It must contain at least 8 characters.",
           *     "This password is too common."
           *   ]
           * }
           */
          throw parsedError;
        }

        // throw to outer catch callback
        console.log('💥 Request error(1):', responseText || 'Server error');
        throw { message: 'Server error' };
      }

      clearTimeout(timer);

      // this is en error object
      // throw to outer catch callback
      // if the error is a timeout, throw a timeout error
      if (error.name === 'AbortError') {
        console.log('💥 Request error(2): Request timeout');
        throw { message: 'Request timeout' };
      }

      console.log('💥 Request error(3):', error?.message || 'Network error');
      throw { message: error?.message || 'Network error' };
    }
  }
}
