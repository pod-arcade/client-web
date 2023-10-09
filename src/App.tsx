import React from 'react';
import {Outlet, useNavigate} from 'react-router-dom';

import {ThemeProvider} from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';

import theme from './theme';
import {useConfig} from './hooks/useConfig';
import {AuthProvider} from 'oidc-react';

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
  const config = useConfig();
  const comps = (
    <ContextProviders>
      <Outlet />
    </ContextProviders>
  );

  if (config && config.auth_method === 'oidc') {
    return (
      <AuthProvider
        authority={config.oidc_server}
        clientId={config.oidc_client_id}
        redirectUri={window.location.origin + '/oidc-callback'}
        onSignIn={() => navigate('/')}
      >
        {comps}
      </AuthProvider>
    );
  } else {
    return comps;
  }
};

export default App;
