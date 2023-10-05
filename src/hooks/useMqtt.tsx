import React, {useEffect, useState, useContext} from 'react';
import * as mqtt from 'mqtt';
import MQTTEmitter, {SubscriptionCallback} from 'mqtt-emitter';
import {useRandomId} from './useRandomId';

type ContextValue = {client: mqtt.MqttClient; emitter: MQTTEmitter} | null;
const ConnectionContext = React.createContext<ContextValue>(null);
ConnectionContext.displayName = 'MQTT';

const MQTT_URL = `wss://${window.location.host}/mqtt`;

export const useMqttConnection = (offlineTopic: string | null = null) => {
  const [value, setValue] = useState<ContextValue>(null);
  const connectionId = useRandomId();
  useEffect(() => {
    let url = MQTT_URL;
    if (window.location.protocol.indexOf('https:') !== 0) {
      url = url.replace('wss:', 'ws:');
    }
    console.log(`mqtt ${connectionId} connecting to`, url);
    const client = mqtt.connect(url, {
      username: 'web', // TODO
      password: 'todo', // TODO,
      clientId: `user:${connectionId}`,
      clean: false,
      will: offlineTopic
        ? {
            topic: offlineTopic,
            payload: Buffer.from('offline'),
            qos: 1,
            retain: true,
          }
        : undefined,
    });
    const emitter = new MQTTEmitter();
    client.on('message', emitter.emit.bind(emitter));
    client.on('packetsend', p =>
      console.log(`mqtt ${connectionId} packetsend`, p)
    );
    client.on('packetreceive', p =>
      console.log(`mqtt ${connectionId} packetreceive`, p)
    );
    emitter.onadd = client.subscribe.bind(client);
    emitter.onremove = client.unsubscribe.bind(client);
    setValue({
      client,
      emitter,
    });
    return () => {
      console.log('mqtt disconnecting');
      client.end();
    };
  }, []);

  return value;
};

export const MQTTConnectionProvider: React.FunctionComponent<
  React.PropsWithChildren
> = props => {
  const value = useMqttConnection();

  return (
    <ConnectionContext.Provider value={value}>
      {props.children}
    </ConnectionContext.Provider>
  );
};

export function useConnection() {
  return useContext(ConnectionContext)?.client ?? null;
}

export function useConnectionConnected(connection: mqtt.MqttClient | null) {
  const [connected, setConnected] = useState<boolean>(false);
  useEffect(() => {
    if (connection) {
      setConnected(connection.connected);
      const handler = () => {
        setConnected(connection.connected);
      };
      connection.on('connect', handler);
      connection.on('reconnect', handler);
      connection.on('disconnect', handler);
      return () => {
        connection.removeListener('connect', handler);
        connection.removeListener('disconnect', handler);
      };
    }
  }, [connection]);

  return connected;
}

export function useEmitter() {
  return useContext(ConnectionContext)?.emitter;
}

export function useLatestMessageFromSubscriptionByTopic<T = Uint8Array>(
  topic: string
): Map<string, T> | null {
  const connection = useConnection();
  const emitter = useEmitter();

  const [latestMessages, setLatestMessages] = useState(new Map<string, T>());

  useEffect(() => {
    if (connection && emitter) {
      const handler: SubscriptionCallback<T> = (data, _, topic) => {
        setLatestMessages(latestMessages => {
          const newMessages = new Map(latestMessages);
          newMessages.set(topic, data);
          return newMessages;
        });
      };
      emitter.on(topic, handler);
      return () => {
        emitter.removeListener(topic, handler);
      };
    }
  }, [connection, emitter, topic]);

  if (!connection || !emitter || !connection.connected) {
    console.warn(
      'Subscription made to ' + topic + ' without connection being created'
    );
    return null;
  }

  return latestMessages;
}
