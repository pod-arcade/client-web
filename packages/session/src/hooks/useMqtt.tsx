import {useEffect, useState} from 'react';
import * as mqtt from 'mqtt';
import MQTTEmitter, {SubscriptionCallback} from 'mqtt-emitter';
import {useRandomId} from './useRandomId';

type ContextValue = {
  client: mqtt.MqttClient;
  emitter: MQTTEmitter;
  error?: string | null;
} | null;

export const useMqttConnection = (
  host: string,
  credentials: {username: string; password: string} | undefined,
  offlineTopic: string | null = null
) => {
  const [value, setValue] = useState<ContextValue>(null);
  const connectionId = useRandomId();

  useEffect(() => {
    console.log(
      `mqtt ${connectionId} connecting to ${host} with credentials`,
      credentials
    );

    const client = mqtt.connect(host, {
      username: credentials?.username,
      password: credentials?.password,
      clientId: `user:${connectionId}`,
      clean: false,
      protocolVersion: 5,
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
    client.on('error', e => {
      console.error(`mqtt ${connectionId} error`, e);
      if (e instanceof mqtt.ErrorWithReasonCode && e.code === 5) {
        setValue({
          client,
          emitter,
          error: 'Invalid credentials',
        });
        client.end();
      } else {
        setValue({
          client,
          emitter,
          error: e.message,
        });
      }
    });
    return () => {
      console.log('mqtt disconnecting');
      client.end();
    };
  }, [host, credentials, offlineTopic]);

  return value;
};

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

export function useLatestMessageFromSubscriptionByTopic<T = Uint8Array>(
  emitter: MQTTEmitter | null,
  topic: string
): Map<string, T> | null {
  const [latestMessages, setLatestMessages] = useState(new Map<string, T>());

  useEffect(() => {
    if (emitter) {
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
  }, [emitter, topic]);

  if (!emitter) {
    console.warn(
      'Subscription made to ' + topic + ' without connection being created'
    );
    return null;
  }

  return latestMessages;
}
