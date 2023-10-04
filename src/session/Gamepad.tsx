import React, {useEffect, useState} from 'react';
import {gamepadStateToBuffer, useGamepadState} from '../hooks/useGamepad';
import {InputType} from '../api';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Popover from '@mui/material/Popover';
import Badge from '@mui/material/Badge';

import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

export const Gamepad: React.FC<{
  index: number;
  peerConnection: RTCPeerConnection;
}> = ({index, peerConnection}) => {
  const gamepad = useGamepadState(index);
  const [previousMessage, setPreviousMessage] = useState<null | Buffer>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [serverIndex, setServerIndex] = useState(index); // TODO: read from local storage

  useEffect(() => {
    if (peerConnection.signalingState === 'closed') {
      return;
    }
    try {
      const dc = peerConnection.createDataChannel('input', {
        id: 0,
        negotiated: true,
        ordered: true,
        maxRetransmits: 10,
        protocol: 'pod-arcade-input-v1',
      });
      console.log('created datachannel', dc);
      setDataChannel(dc);
    } catch (e) {
      console.error('Error creating datachannel', e);
    }
  }, [peerConnection]);

  useEffect(() => {
    if (!gamepad) {
      if (previousMessage) {
        setPreviousMessage(null);
      }
      return;
    }

    const newMessage = gamepadStateToBuffer(gamepad);
    if (previousMessage?.toString('base64') !== newMessage.toString('base64')) {
      if (dataChannel && dataChannel.readyState === 'open') {
        const payload = Buffer.alloc(newMessage.length + 2);
        newMessage.copy(payload, 2);
        payload.writeUInt8(InputType.GAMEPAD, 0);
        payload.writeUInt8(serverIndex, 1);
        console.log('publishing', payload.toString('hex'));
        dataChannel.send(payload);
      }
      setPreviousMessage(newMessage);
    }
  }, [dataChannel, serverIndex, gamepad, previousMessage]);

  return (
    <>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
        transformOrigin={{vertical: 'bottom', horizontal: 'center'}}
        onClose={() => setAnchorEl(null)}
      >
        <ButtonGroup size="small">
          {[0, 1, 2, 3].map(i => (
            <Button
              key={i}
              variant={i === serverIndex ? 'contained' : 'outlined'}
              onClick={() => {
                setServerIndex(i);
                setAnchorEl(null);
              }}
            >
              {i}
            </Button>
          ))}
        </ButtonGroup>
      </Popover>
      <Badge
        badgeContent={previousMessage !== null ? serverIndex.toString() : ' '}
        overlap="circular"
        color={previousMessage !== null ? 'primary' : 'default'}
      >
        <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
          <SportsEsportsIcon
            color={previousMessage !== null ? 'primary' : 'disabled'}
          />
        </IconButton>
      </Badge>
    </>
    // <h2>Gamepad {index}</h2>
    // <pre style={{textAlign: 'left'}}>{JSON.stringify(gamepad, null, 2)}</pre>
  );
};
