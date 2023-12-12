import {useEffect, useState} from 'react';

export type GamepadState = {
  // Button 1
  ButtonNorth: boolean;
  ButtonSouth: boolean;
  ButtonWest: boolean;
  ButtonEast: boolean;

  ButtonBumperLeft: boolean;
  ButtonBumperRight: boolean;
  ButtonThumbLeft: boolean;
  ButtonThumbRight: boolean;

  ButtonSelect: boolean;
  ButtonStart: boolean;

  ButtonDpadUp: boolean;
  ButtonDpadDown: boolean;
  ButtonDpadLeft: boolean;
  ButtonDpadRight: boolean;

  ButtonMode: boolean;

  // Axis 1
  AxisLeftX: number;
  AxisLeftY: number;
  // Axis 2
  AxisRightX: number;
  AxisRightY: number;

  AxisLeftTrigger: number;
  AxisRightTrigger: number;
};

export const useGamepads = () => {
  const [gamepads, setGamepads] = useState<Gamepad[]>([]);
  useEffect(() => {
    const cb = () => {
      setGamepads(navigator.getGamepads().filter(g => g !== null) as Gamepad[]);
    };
    cb();
    window.addEventListener('gamepadconnected', cb);
    window.addEventListener('gamepaddisconnected', cb);
    return () => {
      window.removeEventListener('gamepadconnected', cb);
      window.removeEventListener('gamepaddisconnected', cb);
    };
  }, []);
  return gamepads;
};

export const getGamepadState = (gamepad: Gamepad) => {
  return {
    ButtonNorth: gamepad.buttons[3].pressed,
    ButtonSouth: gamepad.buttons[0].pressed,
    ButtonWest: gamepad.buttons[2].pressed,
    ButtonEast: gamepad.buttons[1].pressed,

    ButtonBumperLeft: gamepad.buttons[4].pressed,
    ButtonBumperRight: gamepad.buttons[5].pressed,

    ButtonThumbLeft: gamepad.buttons[10].pressed,
    ButtonThumbRight: gamepad.buttons[11].pressed,

    ButtonSelect: gamepad.buttons[8].pressed,
    ButtonStart: gamepad.buttons[9].pressed,

    ButtonDpadUp: gamepad.buttons[12].pressed,
    ButtonDpadDown: gamepad.buttons[13].pressed,
    ButtonDpadLeft: gamepad.buttons[14].pressed,
    ButtonDpadRight: gamepad.buttons[15].pressed,

    ButtonMode: gamepad.buttons[16].pressed,

    AxisLeftX: gamepad.axes[0],
    AxisLeftY: gamepad.axes[1],
    AxisRightX: gamepad.axes[2],
    AxisRightY: gamepad.axes[3],

    AxisLeftTrigger: gamepad.buttons[6].value,
    AxisRightTrigger: gamepad.buttons[7].value,

    // buttons: [...gamepad.buttons.map((b) => b.pressed)],
  } as GamepadState;
};

export function gamepadStateToBuffer(gamepadState: GamepadState): Buffer {
  const buffer = Buffer.alloc(2 + 4 * 6);
  buffer[0] |= +gamepadState.ButtonNorth << 0;
  buffer[0] |= +gamepadState.ButtonSouth << 1;
  buffer[0] |= +gamepadState.ButtonWest << 2;
  buffer[0] |= +gamepadState.ButtonEast << 3;

  buffer[0] |= +gamepadState.ButtonBumperLeft << 4;
  buffer[0] |= +gamepadState.ButtonBumperRight << 5;

  buffer[0] |= +gamepadState.ButtonThumbLeft << 6;
  buffer[0] |= +gamepadState.ButtonThumbRight << 7;

  buffer[1] |= +gamepadState.ButtonSelect << 0;
  buffer[1] |= +gamepadState.ButtonStart << 1;

  buffer[1] |= +gamepadState.ButtonDpadUp << 2;
  buffer[1] |= +gamepadState.ButtonDpadDown << 3;
  buffer[1] |= +gamepadState.ButtonDpadLeft << 4;
  buffer[1] |= +gamepadState.ButtonDpadRight << 5;

  buffer[1] |= +gamepadState.ButtonMode << 6;

  buffer.writeFloatLE(gamepadState.AxisLeftX, 2);
  buffer.writeFloatLE(gamepadState.AxisLeftY, 6);

  buffer.writeFloatLE(gamepadState.AxisRightX, 10);
  buffer.writeFloatLE(gamepadState.AxisRightY, 14);

  buffer.writeFloatLE(gamepadState.AxisLeftTrigger, 18);
  buffer.writeFloatLE(gamepadState.AxisRightTrigger, 22);

  return buffer;
}
