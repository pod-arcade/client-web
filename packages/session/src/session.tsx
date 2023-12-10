import React, {useState} from 'react';

import Video from './components/Video';
import {Gamepad} from './components/Gamepad';
import {Mouse} from './components/Mouse';
import {Keyboard} from './components/Keyboard';
import Metrics from './components/Metrics';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import IconButton from '@mui/material/IconButton';

import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeMute from '@mui/icons-material/VolumeMute';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import useMqtt from './hooks/useMqtt';
import useSession, {useSessionStatus} from './hooks/useSession';

const Session: React.FC<{
  /** Url to connect to the mqtt server */
  mqttUrl: string;

  /** Optional credentials to use when connecting to the MQTT server */
  mqttCredentials?: {
    username: string;
    password: string;
  };

  /** Information about the Desktop being connected to */
  desktop: {
    id: string;
    version: string;
  };

  /** Unique identifier for the session */
  sessionId: string;

  /** List of features to enable for this session */
  features: {
    mouse: boolean;
    keyboard: boolean;
    gamepads: {
      enabled: boolean;
      count: 1 | 2 | 3 | 4;
    };
  };

  /** Information about the user connecting to the session. Will be published once the session is established */
  userInfo: object;
}> = ({mqttUrl, mqttCredentials, desktop, sessionId, features}) => {
  const mqttConnection = useMqtt(mqttUrl, mqttCredentials);
  const {session} = useSession(desktop.id, mqttConnection);
  const peerConnectionState = useSessionStatus(session);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement>();

  const [volume, setVolume] = useState(1); // TODO: default from local storage
  const [muted, setMuted] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  if (!session || !session.peerConnection) return null; // TODO: probably a loader or something

  // TODO: handle useSession error

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Video
          width="100%"
          height="100%"
          session={session}
          volume={muted ? 0 : volume}
          onVideoElement={setVideoElement}
        />
      </Box>
      {showMetrics ? <Metrics peerConnection={session.peerConnection} /> : null}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0 1rem',
          height: '4rem',
          flexGrow: 0,
        }}
      >
        <Box sx={{flexGrow: 1}}>
          <b>Session {sessionId}</b> - {peerConnectionState}
        </Box>
        <Box>
          {features.mouse ? (
            <Mouse
              dataChannel={session.inputDataChannel}
              videoElement={videoElement}
            />
          ) : null}
          {features.keyboard ? (
            <Keyboard dataChannel={session.inputDataChannel} />
          ) : null}
          {features.gamepads.enabled
            ? new Array(features.gamepads.count)
                .fill(null)
                .map((_, index) => (
                  <Gamepad
                    key={index}
                    index={index}
                    dataChannel={session.inputDataChannel}
                  />
                ))
            : null}
        </Box>
        <Box>
          <IconButton
            size="small"
            disabled={peerConnectionState !== 'connected'}
            onClick={() => setShowMetrics(!showMetrics)}
          >
            <ShowChartIcon />
          </IconButton>
        </Box>
        <Box
          sx={{
            display: 'flex',
            maxWidth: '7rem',
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            onClick={() => {
              setMuted(!muted);
            }}
            color="secondary"
            size="small"
            disabled={peerConnectionState !== 'connected'}
          >
            {muted ? <VolumeMute /> : <VolumeUp />}
          </IconButton>
          <Slider
            sx={{width: '100%', margin: '0 0.5rem'}}
            value={muted ? 0 : volume}
            disabled={peerConnectionState !== 'connected' || muted}
            color="secondary"
            size="small"
            min={0}
            max={1}
            step={0.01}
            onChange={(_, value) => setVolume(value as number)}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Session;