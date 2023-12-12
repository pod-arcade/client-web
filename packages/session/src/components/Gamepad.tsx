import React, {useEffect, useState} from 'react';
import {useTheme, darken} from '@mui/material/styles';

import {
  gamepadStateToBuffer,
  getGamepadState,
  useGamepads,
} from '../hooks/useGamepad';
import {InputType} from '../api/input';

import IconButton from '@mui/material/IconButton';
import ButtonGroup from '@mui/material/ButtonGroup';
import Popover from '@mui/material/Popover';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Radio from '@mui/material/Radio';
import Block from '@mui/icons-material/Block';

import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import TrackChanges from '@mui/icons-material/TrackChanges';

export const Gamepad: React.FC<{
  serverIndex: number;
  dataChannel: RTCDataChannel | undefined;
}> = ({serverIndex, dataChannel}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const gamepads = useGamepads();
  const [clientIndex, setClientIndex] = useState<number | null>(null); // TODO: read from local storage
  useEffect(() => {
    if (clientIndex === null) return;
    let handle: number;
    let previousMessage: Buffer | null = null;
    const cb = () => {
      // Have to call this every loop to get the new state
      const g = navigator.getGamepads()[clientIndex];
      if (!g) {
        // Controller must have been disconnected
        setClientIndex(null);
        return;
      }
      const gamepadState = getGamepadState(g!);
      const newMessage = gamepadStateToBuffer(gamepadState);
      if (
        !previousMessage ||
        previousMessage?.toString('base64') !== newMessage.toString('base64')
      ) {
        if (
          dataChannel &&
          dataChannel.readyState === 'open' &&
          clientIndex !== null
        ) {
          const payload = Buffer.alloc(newMessage.length + 2);
          newMessage.copy(payload, 2);
          payload.writeUInt8(InputType.GAMEPAD, 0);
          payload.writeUInt8(serverIndex, 1);
          console.log(
            `Sending Input (${clientIndex} -> ${serverIndex})`,
            payload.toString('hex')
          );
          dataChannel.send(payload);
        }
        previousMessage = newMessage;
      }
      handle = requestAnimationFrame(cb);
    };
    handle = requestAnimationFrame(cb);
    return () => {
      console.log('Canceling animation frame');
      cancelAnimationFrame(handle);
    };
  }, [dataChannel, clientIndex]);

  if (!dataChannel) return null;

  return (
    <>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
        transformOrigin={{vertical: 'bottom', horizontal: 'center'}}
        onClose={() => setAnchorEl(null)}
        sx={{
          '& .MuiPaper-root': {
            background: darken(theme.palette.background.paper, 0.3),
          },
        }}
      >
        <List
          sx={{
            width: 360,
            marginBottom: '-22px',
          }}
        >
          {gamepads.map((g, i) => (
            <ListItem
              disablePadding
              key={i}
              secondaryAction={
                g !== null ? (
                  <IconButton
                    onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (g as any).vibrationActuator?.playEffect('dual-rumble', {
                        duration: 500,
                        strongMagnitude: 1,
                        weakMagnitude: 1,
                      });
                    }}
                  >
                    <TrackChanges />
                  </IconButton>
                ) : null
              }
            >
              <ListItemButton
                onClick={() => {
                  setClientIndex(g.index);
                  setAnchorEl(null);
                }}
                dense
              >
                <ListItemIcon>
                  <Radio checked={g?.index === clientIndex} />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    textOverflow: 'ellipsis',
                    textWrap: 'no-wrap',
                    overflow: 'hidden',
                  }}
                >
                  {g.id}
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
          {gamepads.length === 0 ? (
            <ListItem sx={{textAlign: 'center'}}>
              <ListItemText secondary="Try pressing a few buttons for it to show up">
                No Controllers Detected
              </ListItemText>
            </ListItem>
          ) : (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  setClientIndex(null);
                  setAnchorEl(null);
                }}
                dense
              >
                <ListItemIcon sx={{paddingLeft: '0.5rem'}}>
                  <Block />
                </ListItemIcon>
                <ListItemText>
                  <i>Disconnect</i>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          )}
        </List>
        <ButtonGroup size="small"></ButtonGroup>
      </Popover>
      <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
        <SportsEsportsIcon
          color={clientIndex !== null ? 'primary' : 'disabled'}
        />
      </IconButton>
    </>
  );
};
