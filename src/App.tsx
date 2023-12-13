import React, {useCallback, useState} from 'react';
import {Outlet, useNavigate, useLocation} from 'react-router-dom';

import {ThemeProvider} from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';

import theme from './theme';
import {useConfig} from './hooks/useConfig';
import {AuthProvider, User} from 'oidc-react';
import {usePsk} from './hooks/useAuth';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import './index.css';

const ContextProviders: React.FC<React.PropsWithChildren> = ({children}) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

const PskDialog: React.FC = () => {
  const psk = usePsk();
  const [localPsk, setLocalPsk] = useState(
    !psk.loading && psk.psk ? psk.psk : ''
  );
  const updatePsk = useCallback(() => {
    if (psk.loading) return;
    psk.setPsk(localPsk!);
  }, [localPsk, psk]);

  if (psk.loading) {
    return null;
  }

  return (
    <form onSubmit={updatePsk}>
      <Box sx={{display: 'flex', height: '100vh', width: '100vw'}}>
        <Paper
          sx={{
            maxWidth: 400,
            width: '100%',
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
          }}
        >
          <Typography variant="h5">Enter Password</Typography>
          <Typography variant="subtitle2">
            Enter the pre-shared password to use pod-arcade.
          </Typography>
          <TextField
            sx={{margin: '1rem 0'}}
            type="password"
            variant="standard"
            value={localPsk}
            placeholder="Password"
            onChange={e => setLocalPsk(e.target.value)}
            error={!!psk.error}
            helperText={psk.error?.message}
          />
          <Button type="submit" variant="contained">
            Enter
          </Button>
        </Paper>
      </Box>
    </form>
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

  const psk = usePsk();

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
  } else if (
    config &&
    config.auth_method === 'psk' &&
    (psk.loading || !psk.psk)
  ) {
    return (
      <ContextProviders>
        <PskDialog />
      </ContextProviders>
    );
  } else {
    return comps;
  }
};

export default App;
