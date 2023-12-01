import {useCallback, useEffect, useState} from 'react';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Popover from '@mui/material/Popover';

import MouseIcon from '@mui/icons-material/Mouse';
import BlockIcon from '@mui/icons-material/Block';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import {InputType} from '../api';

declare global {
  interface Element {
    requestPointerLock(options?: {unadjustedMovement: boolean}): void;
  }
}

export const Mouse: React.FC<{
  videoElement?: HTMLVideoElement;
  dataChannel: RTCDataChannel | null;
}> = ({videoElement, dataChannel}) => {
  const [mouseState, _setMouseState] = useState<'none' | 'pointer' | 'touch'>(
    'none'
  );
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const setMouseState = useCallback((state: 'none' | 'pointer' | 'touch') => {
    _setMouseState(state);
    setAnchorEl(null);
  }, []);

  const capturePointer = useCallback(() => {
    if (videoElement) {
      videoElement.requestPointerLock({
        unadjustedMovement: true,
      });
    }
  }, [videoElement]);

  useEffect(() => {
    if (!videoElement || !dataChannel || mouseState === 'none') {
      return;
    }

    const mouseListener = (event: MouseEvent) => {
      if (!dataChannel || dataChannel.readyState !== 'open') {
        return;
      }
      if (
        mouseState === 'pointer' &&
        document.pointerLockElement === videoElement
      ) {
        const payload = Buffer.alloc(18);
        payload.writeUInt8(InputType.MOUSE, 0);
        payload.writeUInt8(event.buttons, 1); // TODO: bitpack button state
        payload.writeFloatLE(event.movementX, 2); // X velocity
        payload.writeFloatLE(event.movementY, 6); // Y velocity
        payload.writeFloatLE(0, 10); // TODO: Scroll X
        payload.writeFloatLE(0, 14); // TODO: Scroll Y

        console.log('Sending mouse movement', payload.toString('hex'));
        dataChannel.send(payload);
      } else if (mouseState === 'touch') {
        console.warn('Mouse state touch not implemented');
      }
    };
    videoElement.addEventListener('mousemove', mouseListener);
    videoElement.addEventListener('mousedown', mouseListener);
    videoElement.addEventListener('mouseup', mouseListener);

    const pointerLockChangeListener = () => {
      if (document.pointerLockElement === videoElement) {
        console.log('Pointer locked');
      } else {
        console.log('Pointer unlocked');

        if (dataChannel?.readyState === 'open') {
          const payload = Buffer.alloc(18);
          payload.writeUInt8(InputType.MOUSE, 0);
          console.log('Sending reset mouse movement', payload.toString('hex'));
          dataChannel.send(payload); // Reset mouse button state (all zeros)
        }

        setMouseState('none');
      }
    };
    document.addEventListener('pointerlockchange', pointerLockChangeListener);
    return () => {
      videoElement.removeEventListener('mousemove', mouseListener);
      videoElement.removeEventListener('mousedown', mouseListener);
      videoElement.removeEventListener('mouseup', mouseListener);
      document.removeEventListener(
        'pointerlockchange',
        pointerLockChangeListener
      );
    };
  }, [dataChannel, videoElement, mouseState]);

  return (
    <>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <ButtonGroup size="small">
          <Button
            onClick={() => {
              setMouseState('pointer');
              capturePointer();
            }}
            variant={mouseState === 'pointer' ? 'contained' : 'outlined'}
          >
            <GpsFixedIcon />
          </Button>
          <Button
            onClick={() => setMouseState('touch')}
            variant={mouseState === 'touch' ? 'contained' : 'outlined'}
            disabled
          >
            <TouchAppIcon />
          </Button>
          <Button
            onClick={() => setMouseState('none')}
            variant={mouseState === 'none' ? 'contained' : 'outlined'}
          >
            <BlockIcon />
          </Button>
        </ButtonGroup>
      </Popover>
      <IconButton
        onClick={event => {
          setAnchorEl(event.currentTarget);
        }}
      >
        <MouseIcon color={mouseState === 'none' ? 'disabled' : 'primary'} />
      </IconButton>
    </>
  );
};
