import React from 'react';
import {
  MQTTConnectionProvider,
  useConnection,
  useConnectionConnected,
} from './hooks/useMqtt';
import {Outlet} from 'react-router-dom';

import {ThemeProvider} from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';

import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';

import theme from './theme';

const ContextProviders: React.FC<React.PropsWithChildren> = ({children}) => {
  return (
    <MQTTConnectionProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </MQTTConnectionProvider>
  );
};

const ConnectionHandler: React.FC<React.PropsWithChildren> = ({children}) => {
  const connection = useConnection();
  const connected = useConnectionConnected(connection);
  return (
    <>
      <Backdrop open={!connected}>
        <CircularProgress variant="indeterminate" />
      </Backdrop>
      {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ContextProviders>
      <ConnectionHandler>
        <Outlet />
      </ConnectionHandler>
    </ContextProviders>
  );
};

export default App;
