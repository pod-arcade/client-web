declare module 'mqtt-emitter' {
  import type {MqttClient} from 'mqtt/*';
  import EventEmitter from 'events';

  type SubscriptionCallback<T = unknown> = (
    payload: T,
    params: object,
    topic: string,
    topic_pattern: string
  ) => void;
  export default class MQTTEmitter extends EventEmitter {
    public onadd: typeof MqttClient.prototype.subscribe;
    public onremove: typeof MqttClient.prototype.unsubscribe;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(topic: string, listener: SubscriptionCallback<any>): this;
  }
}
