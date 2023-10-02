import React from 'react';
import {useLatestMessageFromSubscriptionByTopic} from '../hooks/useMqtt';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardHeader from '@mui/material/CardHeader';
import CardActions from '@mui/material/CardActions';
import Box from '@mui/material/Box';

import LinkButton from '../partials/LinkButton';

export function useDesktopStatus() {
  const status = useLatestMessageFromSubscriptionByTopic<Uint8Array | null>(
    'desktops/+/status'
  );

  if (!status) {
    return null;
  }

  const ret = {} as {[desktopId: string]: 'online' | 'offline'};
  for (const [topic, value] of Object.entries(status)) {
    const {groups: {desktopId} = {desktopId: null}} =
      topic.match(/^desktops\/(?<desktopId>.+)\/status$/) ?? {};
    if (desktopId && value) {
      console.log(`Desktop ${desktopId} is ${value}`);
      const strValue = Buffer.from(value).toString('utf-8');
      ret[desktopId] = strValue as 'online' | 'offline';
    }
  }
  return ret;
}

const DesktopList: React.FC = () => {
  const desktops = useDesktopStatus();

  if (!desktops) {
    return null;
  }
  return (
    <div>
      {Object.entries(desktops).map(([desktopId, status]) => (
        <Card key={desktopId}>
          <CardHeader
            title={desktopId}
            avatar={
              <Box
                sx={{
                  width: '0.5rem',
                  height: '0.5rem',
                  margin: '0.5rem 0',
                  display: 'inline-block',
                  borderRadius: '50%',
                  backgroundColor:
                    status === 'online' ? 'success.main' : 'error.main',
                }}
              />
            }
          />
          <CardMedia
            sx={{
              height: '200px',
              width: '200px',
              filter: status === 'offline' ? 'blur(4px) saturate(0.1)' : 'none',
            }}
            image="/icon.png"
          />
          <CardActions>
            <LinkButton
              disabled={status === 'offline'}
              to={`/desktops/${desktopId}`}
            >
              Connect
            </LinkButton>
          </CardActions>
        </Card>
      ))}
    </div>
  );
};

export default DesktopList;
