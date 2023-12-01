import React from 'react';
import {
  useConnectionConnected,
  useLatestMessageFromSubscriptionByTopic,
  useMqttConnection,
} from '../hooks/useMqtt';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardHeader from '@mui/material/CardHeader';
import CardActions from '@mui/material/CardActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';

import LinkButton from '../partials/LinkButton';
import {DarkPurple} from '../theme';
import {CardContent} from '@mui/material';
import MQTTEmitter from 'mqtt-emitter';

export function useDesktopStatus(emitter: MQTTEmitter | null = null) {
  const status = useLatestMessageFromSubscriptionByTopic<Uint8Array | null>(
    emitter ?? null,
    'desktops/+/status'
  );

  if (!status) {
    return null;
  }

  const ret = {} as {[desktopId: string]: 'online' | 'offline'};
  status.forEach((value, topic) => {
    const {groups: {desktopId} = {desktopId: null}} =
      topic.match(/^desktops\/(?<desktopId>.+)\/status$/) ?? {};
    if (desktopId && value) {
      console.log(`Desktop ${desktopId} is ${value}`);
      const strValue = Buffer.from(value).toString('utf-8');
      ret[desktopId] = strValue as 'online' | 'offline';
    }
  });
  return ret;
}

const DesktopList: React.FC = () => {
  const connection = useMqttConnection();
  const desktops = useDesktopStatus(connection?.emitter ?? null);
  const connected = useConnectionConnected(connection?.client ?? null);

  if (!connected) {
    return <CircularProgress variant="indeterminate" />;
  }

  if (!desktops) {
    return null;
  }

  if (!Object.keys(desktops).length) {
    return (
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          background: DarkPurple,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            <Box
              sx={{
                padding: '1rem',
              }}
            >
              <img width="120px" src="/logo-stack.png" />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4" align="center">
                Welcome to Pod Arcade!
              </Typography>
              <Typography variant="subtitle1" align="center">
                To setup you first desktop, follow the instructions in the{' '}
                <Link href="https://github.com/pod-arcade/pod-arcade">
                  README
                </Link>
                .
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'stretch',
      }}
    >
      {Object.entries(desktops)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([desktopId, status]) => {
          const online = status === 'online';
          return (
            <Card
              key={desktopId}
              sx={{
                background: DarkPurple,
                margin: '1rem',
                width: '200px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardHeader
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'self-start',
                }}
                title={desktopId}
                avatar={
                  <Box
                    sx={{
                      width: '0.5rem',
                      height: '0.5rem',
                      margin: '0.5rem 0',
                      display: 'inline-block',
                      borderRadius: '50%',
                      backgroundColor: online ? 'success.main' : 'error.main',
                    }}
                  />
                }
              />
              <CardMedia
                sx={{
                  height: '200px',
                  width: '200px',
                  filter: !online ? 'blur(4px) saturate(0.1)' : 'none',
                  flexGrow: 0,
                }}
                image="/icon.png"
              />
              <CardActions sx={{flexGrow: 0}}>
                <LinkButton
                  disabled={!online}
                  to={`/desktops/${desktopId}`}
                  color="secondary"
                  fullWidth
                >
                  Connect
                </LinkButton>
              </CardActions>
            </Card>
          );
        })}
    </Box>
  );
};

export default DesktopList;
