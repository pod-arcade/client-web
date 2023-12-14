import React from 'react';

import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import useHasGrantedMediaPermissions from '../hooks/useHasGrantedMediaPermissions';

const RequestUserMediaBanner: React.FC<{onGrant: () => void}> = ({onGrant}) => {
  const granted = useHasGrantedMediaPermissions();

  if (granted) {
    return null;
  }

  return (
    <Alert
      severity="info"
      sx={{
        textAlign: 'left',
        position: 'relative',
        maxWidth: '600px',
        marginTop: '1rem',
      }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => {
            navigator.mediaDevices
              .getUserMedia({audio: true})
              .then(onGrant)
              .catch(() => {
                console.warn('Failed to grant access to microphone');
              });
          }}
        >
          Grant Access
        </Button>
      }
    >
      <AlertTitle>Having Problems Connecting?</AlertTitle>
      If you continue to have problems connecting to a desktop on your local
      network, you can try allowing access to your microphone, which changes the
      way your IP address is discovered.
    </Alert>
  );
};
export default RequestUserMediaBanner;
