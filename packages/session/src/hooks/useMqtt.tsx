import {useEffect, useState} from 'react';
import MQTTEmitter, {SubscriptionCallback} from 'mqtt-emitter';
import MqttBrokerConnection, {MqttCredentials} from '../api/mqtt';

export default function useMqtt(
  mqttUrl: string,
  mqttCredentials?: MqttCredentials
) {
  const [connection, setConnection] = useState<
    MqttBrokerConnection | undefined
  >(undefined);
  useEffect(() => {
    const connection = new MqttBrokerConnection(mqttUrl, mqttCredentials);
    setConnection(connection);
    return () => {
      connection.disconnect();
    };
  }, [mqttUrl, mqttCredentials]);

  return connection;
}

export function useConnectionConnected(connection: MqttBrokerConnection) {
  const [connected, setConnected] = useState<boolean>(false);
  useEffect(() => {
    if (connection) {
      setConnected(connection.connected);
      const handler = () => {
        setConnected(connection.connected);
      };
      const subs = [
        connection.on('connect', handler),
        connection.on('reconnect', handler),
        connection.on('disconnect', handler),
      ];
      return () => {
        subs.forEach(sub => sub());
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
