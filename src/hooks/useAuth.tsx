import {useContext, useEffect, useState} from 'react';
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

  const [auth, setAuth] = useState<IAuth | null>(null);
  useEffect(() => {
    if (!config || psk.loading) {
      return;
    }

    if (config?.auth_method === 'none') {
      setAuth({
        method: 'none',
        username: 'user:anonymous',
        password: 'anonymous',
      });
    } else if (config?.auth_method === 'psk') {
      setAuth({
        method: 'psk',
        username: 'user:psk',
        password: psk.psk,
      } as IAuth);
    } else if (config.auth_method === 'oidc' && oidcAuth!.userData) {
      setAuth({
        method: 'oidc',
        username: `user:${oidcAuth!.userData.profile.sub}`,
        password: oidcAuth!.userData.id_token,
      } as IAuth);
    }
  }, [config, oidcAuth, psk.loading]);

  return auth;
};
