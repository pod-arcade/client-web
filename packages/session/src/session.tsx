import React, {useRef, useState} from 'react';

import ControlsContainer from './components/ControlsContainer';
import Video from './components/Video';
import {Gamepad} from './components/Gamepad';
import {Mouse, MouseState} from './components/Mouse';
import {Keyboard} from './components/Keyboard';
import RequestUserMediaBanner from './components/RequestUserMediaBanner';
import VolumeSlider from './components/VolumeSlider';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import ShowChartIcon from '@mui/icons-material/ShowChart';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Share from '@mui/icons-material/Share';

import useSession, {useSessionStatus} from './hooks/useSession';
import useFullscreenElement from './hooks/useFullscreenElement';

const Session: React.FC<{
  /** Url to connect to the mqtt server */
  mqttUrl: string;

  /** Optional credentials to use when connecting to the MQTT server */
  mqttCredentials?: {
    username: string;
    password: string;
  };

  /** What to prefix all mqtt topics with. If running the self-hosted version, this will be `desktops/{{desktopId}}` */
  mqttTopicPrefix: string;

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

  onBackClick?: () => void;
  onShareClick?: () => void;
}> = ({
  mqttUrl,
  mqttCredentials,
  mqttTopicPrefix,
  features,
  onBackClick,
  onShareClick,
}) => {
  const {session, reconnect, error} = useSession(
    mqttTopicPrefix,
    mqttUrl,
    mqttCredentials
  );
  const peerConnectionState = useSessionStatus(session);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement>();

  const [mouseState, setMouseState] = useState<MouseState>('none');
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [volume, setVolume] = useState(1); // TODO: default from local storage
  const [muted, setMuted] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fullscreenElement = useFullscreenElement();
  const supportsFullscreen =
    !fullscreenRef.current ||
    fullscreenRef.current.requestFullscreen !== undefined;

  if (!session) return null; // TODO: probably a loader or something

  return (
    <Box
      ref={fullscreenRef}
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Backdrop
        sx={{color: '#fff', zIndex: theme => theme.zIndex.drawer + 1}}
        open={peerConnectionState !== 'connected'}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '400px',
            textAlign: 'center',
          }}
        >
          {['new', 'connecting'].includes(peerConnectionState) ? (
            <>
              <CircularProgress sx={{marginBottom: '1rem'}} color="inherit" />
              Connecting...
            </>
          ) : null}
          {peerConnectionState === 'disconnected' ? 'Disconnected.' : null}
          {peerConnectionState === 'failed' ? (
            <>
              <Typography variant="h6">Connection to desktop failed</Typography>
              <Typography variant="subtitle2">{error?.message}</Typography>
            </>
          ) : null}
          {['disconnected', 'failed'].includes(peerConnectionState) ? (
            <>
              <Box sx={{marginTop: '1rem'}}>
                <Button
                  color="info"
                  onClick={onBackClick}
                  sx={{marginRight: '1rem'}}
                  startIcon={<ArrowBack />}
                >
                  Back
                </Button>
                <Button variant="outlined" color="info" onClick={reconnect}>
                  Reconnect
                </Button>
              </Box>
              <RequestUserMediaBanner onGrant={reconnect} />
            </>
          ) : null}
        </Box>
      </Backdrop>
      <ControlsContainer
        session={session}
        video={
          <Video
            width="100%"
            height="100%"
            session={session}
            volume={muted ? 0 : volume}
            onVideoElement={setVideoElement}
          />
        }
        onBackClick={onBackClick}
        collapse={mouseState === 'none' && !keyboardActive}
        showMetrics={showMetrics}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            padding: '0 0.5rem',
          }}
        >
          <Box>
            {features.mouse ? (
              <Mouse
                dataChannel={session.inputDataChannel}
                videoElement={videoElement}
                supportTouchScreen={false}
                mouseState={mouseState}
                onMouseStateChange={setMouseState}
              />
            ) : null}
            {features.keyboard ? (
              <Keyboard
                dataChannel={session.inputDataChannel}
                fullscreenRef={fullscreenRef}
                active={keyboardActive}
                onActiveChange={setKeyboardActive}
              />
            ) : null}
            {features.gamepads.enabled
              ? new Array(features.gamepads.count)
                  .fill(null)
                  .map((_, index) => (
                    <Gamepad
                      key={index}
                      serverIndex={index}
                      dataChannel={session.inputDataChannel}
                    />
                  ))
              : null}
          </Box>
          <Box sx={{flex: '1'}}></Box>
          <Box>
            <IconButton
              size="small"
              disabled={peerConnectionState !== 'connected'}
              onClick={() => setShowMetrics(!showMetrics)}
            >
              <ShowChartIcon />
            </IconButton>
          </Box>
          {onShareClick ? (
            <Box>
              <IconButton
                size="small"
                onClick={onShareClick}
                disabled={peerConnectionState !== 'connected'}
              >
                <Share />
              </IconButton>
            </Box>
          ) : null}
          <VolumeSlider
            volume={volume}
            setVolume={setVolume}
            muted={muted}
            setMuted={setMuted}
            disabled={peerConnectionState !== 'connected'}
          />
          {supportsFullscreen ? (
            <Box>
              <IconButton
                size="small"
                disabled={peerConnectionState !== 'connected'}
                onClick={() => {
                  if (fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    fullscreenRef.current?.requestFullscreen();
                  }
                }}
              >
                {fullscreenElement ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Box>
          ) : null}
        </Box>
      </ControlsContainer>
    </Box>
  );
};

export default Session;
