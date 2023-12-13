# @pod-arcade/session

This package contains the component used to provide the desktop experience for a Pod Arcade session. This component is built using `@mui/material` and so if you want to override the styling, you can use a custom theme provider.

## Installation

```bash
npm install @pod-arcade/session
```

## Usage

```tsx
import React from 'react';
import Session from '@pod-arcade/session';

const App = () => {
  return (
    <Session
      mqttUrl={
        /* URL to the MQTT broker running on the Pod Arcade server */
        'wss://localhost/mqtt'
      }
      mqttCredentials={
        /* Credentials for the MQTT broker running on the Pod Arcade server (or undefined) */
        {
          username: '',
          password: '',
        }
      }
      mqttTopicPrefix={
        /* Prefix for the MQTT topics used by the Pod Arcade server */
        'desktops/{{desktopId}}',
      }
      features={{
        mouse: true,
        keyboard: true,
        gamepads: {
          enabled: true,
          count: 4,
        },
      }}
      sessionId={'' /* Unique id for the session */}
      userInfo={{
        name: 'User Name',
        avatar: 'https://example.com/avatar.png',
      }}
    />
  );
};
```
