import React, {useCallback} from 'react';
import {Outlet, useNavigate, useLocation} from 'react-router-dom';

import {ThemeProvider} from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';

import theme from './theme';
import {useConfig} from './hooks/useConfig';
import {AuthProvider, User} from 'oidc-react';

const ContextProviders: React.FC<React.PropsWithChildren> = ({children}) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = useConfig();
  const comps = (
    <ContextProviders>
      <Outlet />
    </ContextProviders>
  );

  const onSignIn = useCallback(
    (userData: User | null) => {
      if (userData?.state) {
        navigate(userData.state);
      } else {
        navigate('/');
      }
    },
    [navigate]
  );
  const onBeforeSignIn = useCallback(() => {
    return location.pathname;
  }, [location]);

  if (config && config.auth_method === 'oidc') {
    return (
      <AuthProvider
        authority={config.oidc_server}
        clientId={config.oidc_client_id}
        redirectUri={window.location.origin + '/oidc-callback'}
        onSignIn={onSignIn}
        onBeforeSignIn={onBeforeSignIn}
      >
        {comps}
      </AuthProvider>
    );
  } else {
    return comps;
  }
};

export default App;
