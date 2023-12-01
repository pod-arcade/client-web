import {useEffect, useState, useRef} from 'react';
import IconButton from '@mui/material/IconButton';

import KeyboardIcon from '@mui/icons-material/Keyboard';
import {mapKeyboardEvent} from '../api';

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
  dataChannel: RTCDataChannel | null;
}> = ({dataChannel}) => {
  const [active, setActive] = useState(false);
  const buttonElement = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const keyListener = (event: KeyboardEvent) => {
      if (active) {
        // always prevent default
        event.preventDefault();
      }
      if (active && !event.repeat) {
        event.preventDefault();
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
    if (navigator.keyboard) {
      if (active) {
        document.documentElement
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
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        const ev = mapKeyboardEvent({code: 'Escape', type: 'keyup'});
        if (ev && dataChannel?.readyState === 'open') {
          console.log('Sending keyboard event', ev?.toString('hex'));
          dataChannel.send(ev);
        }
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
      if (!document.fullscreenElement) {
        setActive(false);
      }
    };
    document.addEventListener('fullscreenchange', fullscreenListener);
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenListener);
    };
  });

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
