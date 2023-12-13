import {useCallback, useEffect, useState} from 'react';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Popover from '@mui/material/Popover';

import MouseIcon from '@mui/icons-material/Mouse';
import BlockIcon from '@mui/icons-material/Block';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import {InputType, mapMouseEvent} from '../api/input';

declare global {
  interface Element {
    requestPointerLock(options?: {unadjustedMovement: boolean}): void;
  }
}

export type MouseState = 'none' | 'pointer' | 'touch';

export const Mouse: React.FC<{
  videoElement?: HTMLVideoElement;
  dataChannel: RTCDataChannel | undefined;
  supportTouchScreen: boolean;
  mouseState: MouseState;
  onMouseStateChange?: (state: MouseState) => void;
}> = ({
  videoElement,
  dataChannel,
  supportTouchScreen,
  mouseState,
  onMouseStateChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const supportsMouse =
    typeof document.documentElement.requestPointerLock === 'function';

  const setMouseState = useCallback((state: 'none' | 'pointer' | 'touch') => {
    if (onMouseStateChange) {
      onMouseStateChange(state);
    }
    setAnchorEl(null);
  }, []);

  const capturePointer = useCallback(() => {
    if (videoElement && supportsMouse) {
      videoElement.requestPointerLock({
        unadjustedMovement: true,
      });
    }
  }, [videoElement]);

  useEffect(() => {
    if (!videoElement || !dataChannel || mouseState === 'none') {
      return;
    }

    let previousTouch: TouchEvent | null = null;
    const mouseListener = (event: MouseEvent | TouchEvent) => {
      if (!dataChannel || dataChannel.readyState !== 'open') {
        return;
      }
      if (mouseState === 'pointer') {
        event.preventDefault();
        let payload: Buffer | null = null;
        if (event instanceof TouchEvent) {
          const e = event as TouchEvent;
          if (event.type === 'touchend') {
            console.log('end', event);
            // If touch start and touch end without touch move, then send a click event
            if (
              previousTouch &&
              previousTouch.type === 'touchstart' &&
              previousTouch.touches[0].clientX ===
                e.changedTouches[0].clientX &&
              previousTouch.touches[0].clientY === e.changedTouches[0].clientY
            ) {
              const mouseDown = mapMouseEvent({
                buttons: 1,
                movementX: 0,
                movementY: 0,
              });
              console.debug(
                'Sending mouse movement',
                mouseDown.toString('hex')
              );
              dataChannel.send(mouseDown);
              payload = mapMouseEvent({
                buttons: 0,
                movementX: 0,
                movementY: 0,
              });
            }
          } else if (event.type === 'touchmove' && previousTouch) {
            const deltaX =
              e.touches[0].clientX - previousTouch.touches[0].clientX;
            const deltaY =
              e.touches[0].clientY - previousTouch.touches[0].clientY;
            console.log('move', deltaX, deltaY);
            payload = mapMouseEvent({
              buttons: 0,
              movementX: deltaX,
              movementY: deltaY,
            });
          }
          previousTouch = event;
        } else {
          payload = mapMouseEvent(event);
        }
        if (!payload) {
          return;
        }
        console.debug('Sending mouse movement', payload.toString('hex'));
        dataChannel.send(payload);
      } else if (mouseState === 'touch') {
        console.warn('Mouse state touch not implemented');
      }
    };
    videoElement.addEventListener('mousemove', mouseListener);
    videoElement.addEventListener('mousedown', mouseListener);
    videoElement.addEventListener('mouseup', mouseListener);
    videoElement.addEventListener('touchstart', mouseListener);
    videoElement.addEventListener('touchmove', mouseListener);
    videoElement.addEventListener('touchend', mouseListener);

    console.log('Mouse bound', videoElement);

    const pointerLockChangeListener = () => {
      if (document.pointerLockElement === videoElement) {
        console.log('Pointer locked');
      } else {
        console.log('Pointer unlocked');

        if (dataChannel?.readyState === 'open') {
          const payload = Buffer.alloc(18);
          payload.writeUInt8(InputType.MOUSE, 0);
          console.debug(
            'Sending reset mouse movement',
            payload.toString('hex')
          );
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
      videoElement.removeEventListener('touchstart', mouseListener);
      videoElement.removeEventListener('touchmove', mouseListener);
      videoElement.removeEventListener('touchend', mouseListener);
      document.removeEventListener(
        'pointerlockchange',
        pointerLockChangeListener
      );
    };
  }, [dataChannel, videoElement, mouseState]);

  if (!supportTouchScreen) {
    return (
      <IconButton
        onClick={() => {
          if (mouseState === 'none') {
            setMouseState('pointer');
            capturePointer();
          } else {
            setMouseState('none');
          }
        }}
      >
        <MouseIcon color={mouseState === 'none' ? 'disabled' : 'primary'} />
      </IconButton>
    );
  }

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
