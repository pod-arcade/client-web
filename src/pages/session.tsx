import Session from '@pod-arcade/session';
import {useNavigate, useParams} from 'react-router-dom';

import {useRandomId} from '../hooks/useRandomId';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import {useAuth} from '../hooks/useAuth';

const SessionPage: React.FC = () => {
  const {desktopId} = useParams<{desktopId: string}>();
  const sessionId = useRandomId();
  const auth = useAuth();
  const navigate = useNavigate();

  if (!desktopId || !auth) return null;

  let mqttUrl = `wss://${window.location.host}/mqtt`;
  if (window.location.protocol.indexOf('https:') !== 0) {
    mqttUrl = mqttUrl.replace('wss:', 'ws:');
  }

  return (
    <Box
      sx={{
        position: 'relative',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        padding: '1rem',
        height: '100vh',
        display: 'flex',
        width: '100vw',
      }}
    >
      <Card
        sx={{
          height: '100%',
          width: '100%',
        }}
        elevation={0}
      >
        <Session
          mqttUrl={mqttUrl}
          mqttCredentials={{username: auth.username, password: auth.password}}
          desktop={{id: desktopId, version: '0.0.1'}}
          features={{
            mouse: true,
            keyboard: true,
            gamepads: {
              enabled: true,
              count: 4,
            },
          }}
          sessionId={sessionId}
          userInfo={{name: auth?.username || 'unknown'}}
          onBackClick={() => {
            navigate('/');
          }}
        />
      </Card>
    </Box>
  );
};
export default SessionPage;

import React from 'react';
