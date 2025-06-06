import { axiosConfig } from '@app/configs/api';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API = axios.create(axiosConfig);

const createInstance = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  return API({
    ...config,
    ...options,
  }).then((response) => response?.data)
    // .catch((e) => {
    //   console.log(e);
    //   return e?.response?.data
    // });
};

type BodyType<DataType> = DataType;

type ErrorType<ErrorType> = AxiosError<ErrorType>;

export { createInstance, API };

export type { BodyType, ErrorType };
