import {useContext} from 'react';
import {useConfig, IConfig} from './useConfig';
import {AuthContext} from 'oidc-react';

interface IAuth {
  method: IConfig['auth_method'];
  username: string;
  password: string;
}

export const useAuth = () => {
  const config = useConfig();
  const oidcAuth = useContext(AuthContext);

  if (!config) {
    return null;
  }

  if (config?.auth_method === 'none') {
    return {
      method: 'none',
      username: 'user:anonymous',
      password: '',
    } as IAuth;
  } else if (config?.auth_method === 'psk') {
    throw new Error('PSK auth not implemented');
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
