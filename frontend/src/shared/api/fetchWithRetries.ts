import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { fetchWithRetriesConfig } from './configs/fetchWithRetries';

const fetchWithRetries = async <T = any>(
  url: string,
  options: AxiosRequestConfig,
  retries = 1,
): Promise<AxiosResponse<T>> => {
  try {
    return await axios(url, options);
  } catch (err) {
    if (retries <= fetchWithRetriesConfig.maxRetryCount) {
      const delay =
        Math.min(Math.pow(2, retries) / 4 + Math.random(), fetchWithRetriesConfig.maxDelaySec) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      console.log(`Request failed, retrying ${retries}/${fetchWithRetriesConfig.maxRetryCount}. Error:`, err);
      return fetchWithRetries<T>(url, options, retries + 1);
    } else {
      throw new Error(`Max retries exceeded. Error: ${err}`);
    }
  }
};

export { fetchWithRetries };
