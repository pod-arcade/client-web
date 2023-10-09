import {useFetch} from 'use-http';
import {singletonHook} from 'react-singleton-hook';

export interface IConfig {
  auth_method: 'none' | 'psk' | 'oidc';
  oidc_server?: string;
  oidc_client_id?: string;
}

export const useConfig = singletonHook(null, () => {
  const {data, loading} = useFetch<IConfig>('/config.json', {}, []);

  if (loading) {
    return null;
  }

  return data!;
});
