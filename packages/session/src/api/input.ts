import keycodes from './keymap';

export enum InputType {
  KEYBOARD = 0x01,
  MOUSE = 0x02,
  TOUCHSCREEN = 0x03,
  GAMEPAD = 0x04,
  GAMEPAD_RUMBLE = 0x05,
}

type ModifierKeys = 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey';
type MinimalKeyboardEvent = Pick<KeyboardEvent, 'type' | 'code'> &
  Partial<Pick<KeyboardEvent, ModifierKeys | 'getModifierState'>>;

// #### Keyboard: `0x01`
// Payload Format:
// - Byte 0: `0x01`
// - Byte 1: Bitpacked key state
//   - Bit 0: KeyState
//   - Bit 1: Shift
//   - Bit 2: Control
//   - Bit 3: Alt
//   - Bit 4: Meta
//   - Bit 5: Caps
// - Byte 2-3: Keycode (https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values)
export function mapKeyboardEvent(event: MinimalKeyboardEvent) {
  const keycode = (keycodes as {[code: string]: string})[event.code];

  if (keycode) {
    const caps = event.getModifierState
      ? event.getModifierState('CapsLock')
      : false;
    const shift = event.shiftKey ?? false;
    const ctrl = event.ctrlKey ?? false;
    const alt = event.altKey ?? false;
    const meta = event.metaKey ?? false;

    const keyState = event.type === 'keydown' ? 0x01 : 0x00;

    const payload = Buffer.alloc(4);
    payload.writeInt8(InputType.KEYBOARD, 0);
    payload.writeInt8(
      keyState |
        (shift ? 0x02 : 0x00) |
        (ctrl ? 0x04 : 0x00) |
        (alt ? 0x08 : 0x00) |
        (meta ? 0x10 : 0x00) |
        (caps ? 0x20 : 0x00),
      1
    );
    const keycodeByte = Buffer.from(keycode, 'hex').readInt16BE(0);
    payload.writeInt16LE(keycodeByte, 2);

    return payload;
  } else {
    console.warn('Could not find keycode for event', event);
    return null;
  }
}

export function mapMouseEvent(event: MouseEvent | TouchEvent) {
  if (event.type === 'touchstart' || event.type === 'touchend') {
    console.warn('Touch events not yet supported');
    return null;
  } else {
    const mouseEvent = event as MouseEvent;
    const payload = Buffer.alloc(18);
    payload.writeUInt8(InputType.MOUSE, 0);
    payload.writeUInt8(mouseEvent.buttons, 1); // TODO: bitpack button state
    payload.writeFloatLE(mouseEvent.movementX, 2); // X velocity
    payload.writeFloatLE(mouseEvent.movementY, 6); // Y velocity
    payload.writeFloatLE(0, 10); // TODO: Scroll X
    payload.writeFloatLE(0, 14); // TODO: Scroll Y

    return payload;
  }
}
