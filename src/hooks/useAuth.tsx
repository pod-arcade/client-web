import {useContext, useState} from 'react';
import {useConfig, IConfig} from './useConfig';
import {AuthContext} from 'oidc-react';
import {singletonHook} from 'react-singleton-hook';
import useLocalStorage from 'use-local-storage';

interface IAuth {
  method: IConfig['auth_method'];
  username: string;
  password: string;
}

type Psk =
  | {
      loading: true;
    }
  | {
      loading: false;
      psk: string | null;
      setPsk: (psk: string) => void;
      error: Error | null;
      setError: (error: Error) => void;
    };
export const usePsk = singletonHook<Psk>({loading: true}, () => {
  const [psk, setPsk] = useLocalStorage<string | null>('pod-arcade-psk', null);
  const [error, setError] = useState<Error | null>(null);

  return {
    loading: false,
    psk,
    setPsk: (newPsk: string) => {
      setPsk(newPsk);
      setError(null);
    },
    error,
    setError: (error: Error) => {
      setError(error);
      setPsk(null);
    },
  };
});

export const useAuth = () => {
  const config = useConfig();
  const oidcAuth = useContext(AuthContext);
  const psk = usePsk();

  if (!config || psk.loading) {
    return null;
  }

  if (config?.auth_method === 'none') {
    return {
      method: 'none',
      username: 'user:anonymous',
      password: '',
    } as IAuth;
  } else if (config?.auth_method === 'psk') {
    return {
      method: 'psk',
      username: 'user:psk',
      password: psk.psk,
    } as IAuth;
  } else if (config.auth_method === 'oidc') {
    if (oidcAuth!.userData) {
      return {
        method: 'oidc',
        username: `user:${oidcAuth!.userData.profile.sub}`,
        password: oidcAuth!.userData.id_token,
      } as IAuth;
    } else {
      return null;
    }
  } else {
    return null;
  }
};
