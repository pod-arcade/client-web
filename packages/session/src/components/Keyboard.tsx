import {useEffect, useState, useRef} from 'react';
import IconButton from '@mui/material/IconButton';

import KeyboardIcon from '@mui/icons-material/Keyboard';
import {mapKeyboardEvent} from '../api/input';

declare global {
  interface Navigator {
    keyboard?: {
      /**
       * Returns a Promise that resolves with an instance of KeyboardLayoutMap which is a map-like object with functions for retrieving the strings associated with specific physical keys.
       */
      getLayoutMap(): Promise<Map<string, string>>;
      /**
       * Returns a Promise after enabling the capture of keypresses for any or all of the keys on the physical keyboard.
       */
      lock(keycodes?: Array<string>): Promise<void>;

      /**
       * Unlocks all keys captured by the lock() method and returns synchronously.
       */
      unlock(): void;
    };
  }
}

export const Keyboard: React.FC<{
  dataChannel: RTCDataChannel | undefined;
  fullscreenRef: React.RefObject<HTMLDivElement>;
}> = ({dataChannel, fullscreenRef}) => {
  const [active, setActive] = useState(false);
  const buttonElement = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const keyListener = (event: KeyboardEvent) => {
      if (active) {
        // always prevent default
        event.preventDefault();
      }
      if (active && !event.repeat) {
        if (event.code === 'Escape') {
          if (event.type === 'keydown') {
            console.log('Detected Escape key down. Ignoring');
            return;
          } else {
            // If we are no longer in fullscreen, that means the lock has been released
            if (!document.fullscreenElement) {
              setActive(false);
              console.log('Detected keyboard unlock. Ignoring');
              return;
            }

            const keyDown = mapKeyboardEvent({code: 'Escape', type: 'keydown'});
            if (dataChannel?.readyState === 'open') {
              console.log('Sending keyboard event', keyDown?.toString('hex'));
              dataChannel.send(keyDown!);
            }
          }
        }

        const ev = mapKeyboardEvent(event);
        if (ev && dataChannel?.readyState === 'open') {
          console.log('Sending keyboard event', ev?.toString('hex'));
          dataChannel.send(ev);
        }
      }
    };

    document.addEventListener('keydown', keyListener);
    document.addEventListener('keyup', keyListener);
    return () => {
      document.removeEventListener('keydown', keyListener);
      document.removeEventListener('keyup', keyListener);
    };
  }, [dataChannel, active]);

  useEffect(() => {
    if (fullscreenRef.current && navigator.keyboard) {
      if (active) {
        fullscreenRef.current
          .requestFullscreen({
            navigationUI: 'hide',
          })
          .finally(() => {
            navigator.keyboard!.lock().then(() => {
              console.log('Keyboard locked');
            });
          })
          .catch(e => {
            console.warn('Failed to request fullscreen', e);
          });
      } else {
        navigator.keyboard.unlock();
        console.log('Keyboard unlocked');
      }
    } else {
      // TODO: Do something else. Maybe just don't try locking the keyboard
      console.warn(
        'navigator.keyboard not available. The Escape key wont be usable'
      );
    }
  }, [active]);

  useEffect(() => {
    const fullscreenListener = () => {
      console.log('Fullscreen change', !!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setActive(false);
      }
    };
    console.log('Adding fullscreen listener');
    document.addEventListener('fullscreenchange', fullscreenListener);
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenListener);
    };
  }, []);

  return (
    <IconButton
      onClick={() => {
        setActive(!active);
      }}
      ref={buttonElement}
    >
      <KeyboardIcon color={active ? 'primary' : 'disabled'} />
    </IconButton>
  );
};
