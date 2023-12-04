import React, {useEffect, useState} from 'react';
import {gamepadStateToBuffer, useGamepadState} from '../hooks/useGamepad';
import {InputType} from '../api/input';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Popover from '@mui/material/Popover';
import Badge from '@mui/material/Badge';

import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BlockIcon from '@mui/icons-material/Block';

export const Gamepad: React.FC<{
  index: number;
  dataChannel: RTCDataChannel | undefined;
}> = ({index, dataChannel}) => {
  const gamepad = useGamepadState(index);
  const [previousMessage, setPreviousMessage] = useState<null | Buffer>(null);

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [serverIndex, setServerIndex] = useState<number | null>(index); // TODO: read from local storage

  useEffect(() => {
    if (!gamepad) {
      if (previousMessage) {
        setPreviousMessage(null);
      }
      return;
    }

    const newMessage = gamepadStateToBuffer(gamepad);
    if (previousMessage?.toString('base64') !== newMessage.toString('base64')) {
      if (
        dataChannel &&
        dataChannel.readyState === 'open' &&
        serverIndex !== null
      ) {
        const payload = Buffer.alloc(newMessage.length + 2);
        newMessage.copy(payload, 2);
        payload.writeUInt8(InputType.GAMEPAD, 0);
        payload.writeUInt8(serverIndex, 1);
        console.log(`Sending Input (${serverIndex})`, payload.toString('hex'));
        dataChannel.send(payload);
      }
      setPreviousMessage(newMessage);
    }
  }, [dataChannel, serverIndex, gamepad, previousMessage]);

  if (!dataChannel) return null;

  const showBadge = previousMessage !== null && serverIndex !== null;

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
          {[0, 1, 2, 3, null].map(i => (
            <Button
              key={i}
              variant={i === serverIndex ? 'contained' : 'outlined'}
              onClick={() => {
                setServerIndex(i);
                setAnchorEl(null);
              }}
            >
              {i !== null ? i : <BlockIcon />}
            </Button>
          ))}
        </ButtonGroup>
      </Popover>
      <Badge
        // variant={serverIndex === null ? 'dot' : 'standard'}
        badgeContent={showBadge ? serverIndex.toString() : ' '}
        overlap="circular"
        color={showBadge ? 'primary' : 'default'}
      >
        <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
          <SportsEsportsIcon
            color={previousMessage !== null ? 'primary' : 'disabled'}
          />
        </IconButton>
      </Badge>
    </>
  );
};
