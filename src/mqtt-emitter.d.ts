declare module 'mqtt-emitter' {
  import type {MqttClient} from 'mqtt/*';
  import EventEmitter from 'events';
  export default class MQTTEmitter extends EventEmitter {
    public onadd: typeof MqttClient.prototype.subscribe;
    public onremove: typeof MqttClient.prototype.unsubscribe;
  }
}
