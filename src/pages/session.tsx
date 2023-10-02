import {useState} from 'react';
import {useParams} from 'react-router-dom';
import {
  useNegotiatedPeerConnection,
  usePeerConnectionState,
} from '../session/usePeerConnection';
import {useRandomId} from '../hooks/useRandomId';
import Video from '../session/Video';
import {Gamepad} from '../session/Gamepad';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import IconButton from '@mui/material/IconButton';

import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeMute from '@mui/icons-material/VolumeMute';
import {DarkPurple} from '../theme';

const SessionPage: React.FC = () => {
  const {desktopId} = useParams<{desktopId: string}>();
  const sessionId = useRandomId();
  const peerConnection = useNegotiatedPeerConnection(desktopId!, sessionId);
  const peerConnectionState = usePeerConnectionState(peerConnection);

  const [volume, setVolume] = useState(1); // TODO: default from local storage
  const [muted, setMuted] = useState(false);

  if (!peerConnection) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: DarkPurple,
        margin: '1rem',
        borderRadius: '0.5rem',
      }}
    >
      <Video
        width="100%"
        peerConnection={peerConnection}
        volume={muted ? 0 : volume}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0 1rem',
          height: '4rem',
        }}
      >
        <Box sx={{flexGrow: 1}}>
          Session #{sessionId}: {peerConnectionState}
        </Box>
        <Box>
          {[0, 1, 2, 3].map(index => (
            <Gamepad
              key={index}
              index={index}
              peerConnection={peerConnection}
            />
          ))}
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
          >
            {muted ? (
              <VolumeMute fontSize="small" color="secondary" />
            ) : (
              <VolumeUp fontSize="small" color="secondary" />
            )}
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
export default SessionPage;
