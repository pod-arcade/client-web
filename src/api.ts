import keycodes from './keymap.json';

export enum InputType {
  KEYBOARD = 0x01,
  MOUSE = 0x02,
  TOUCHSCREEN = 0x03,
  GAMEPAD = 0x04,
  GAMEPAD_RUMBLE = 0x05,
}

// #### Keyboard: `0x01`
// Payload Format:
// - Byte 0: `0x01`
// - Byte 1: `0x01` for keydown, `0x00` for keyup
// - Byte 2-3: Keycode (Linux https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values)
// Maps os local keycode to linux keycode
export function mapKeyboardEvent(event: Pick<KeyboardEvent, 'code' | 'type'>) {
  const keycode = (keycodes as {[code: string]: string})[event.code];

  if (keycode) {
    const payload = Buffer.alloc(4);
    payload.writeInt8(InputType.KEYBOARD, 0);
    payload.writeInt8(event.type === 'keydown' ? 0x01 : 0x00, 1);

    Buffer.from(keycode, 'hex').copy(payload, 2);
    return payload;
  } else {
    console.warn('Could not find keycode for event', event);
    return null;
  }
}
