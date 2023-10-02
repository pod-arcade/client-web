import React, {useEffect, useState} from 'react';
import {useConnection} from '../hooks/useMqtt';
import {gamepadStateToBuffer, useGamepadState} from '../hooks/useGamepad';

export const Gamepad: React.FC<{index: number}> = ({index}) => {
  const connection = useConnection();
  const gamepad = useGamepadState(index);
  const [previousMessage, setPreviousMessage] = useState<null | Buffer>(null);

  useEffect(() => {
    if (!gamepad) {
      return;
    }

    const newMessage = gamepadStateToBuffer(gamepad);
    if (previousMessage?.toString('base64') !== newMessage.toString('base64')) {
      console.log('publishing', newMessage.toString('base64'));
      if (connection && connection.connected) {
        connection.publish(`/gamepad/${index}/state`, newMessage);
      }
      setPreviousMessage(newMessage);
    }
  }, [connection, index, gamepad, previousMessage]);

  return (
    <section>
      <h2>Gamepad {index}</h2>
      <pre style={{textAlign: 'left'}}>{JSON.stringify(gamepad, null, 2)}</pre>
    </section>
  );
};
