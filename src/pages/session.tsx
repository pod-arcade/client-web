import {useState} from 'react';
import {useLinkClickHandler, useParams} from 'react-router-dom';
import {
  useDataChannel,
  useNegotiatedPeerConnection,
  usePeerConnectionState,
} from '../session/usePeerConnection';
import {useRandomId} from '../hooks/useRandomId';
import Video from '../session/Video';
import {Gamepad} from '../session/Gamepad';
import {DarkPurple} from '../theme';
import Metrics from '../session/Metrics';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import IconButton from '@mui/material/IconButton';

import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeMute from '@mui/icons-material/VolumeMute';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const SessionPage: React.FC = () => {
  const {desktopId} = useParams<{desktopId: string}>();
  const sessionId = useRandomId();
  const peerConnection = useNegotiatedPeerConnection(desktopId!, sessionId);
  const peerConnectionState = usePeerConnectionState(peerConnection);
  const navigateToDesktopList = useLinkClickHandler<HTMLButtonElement>('/');

  const [volume, setVolume] = useState(1); // TODO: default from local storage
  const [muted, setMuted] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  const inputChannel = useDataChannel(peerConnection);

  if (!peerConnection) return null;

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
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: DarkPurple,
          borderRadius: '0.5rem',
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
            peerConnection={peerConnection}
            volume={muted ? 0 : volume}
          />
        </Box>
        {showMetrics ? <Metrics peerConnection={peerConnection} /> : null}
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
          <Box sx={{flexGrow: 0}}>
            <IconButton onClick={navigateToDesktopList}>
              <ArrowBack />
            </IconButton>
          </Box>
          <Box sx={{flexGrow: 1, marginLeft: '1rem'}}>
            <b>Session {sessionId}</b> - {peerConnectionState}
          </Box>
          <Box>
            {[0, 1, 2, 3].map(index => (
              <Gamepad key={index} index={index} dataChannel={inputChannel} />
            ))}
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
    </Box>
  );
};
export default SessionPage;
