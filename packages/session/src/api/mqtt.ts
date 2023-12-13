import MQTTEmitter, {SubscriptionCallback} from 'mqtt-emitter';
import * as mqtt from 'mqtt';

export interface MqttCredentials {
  username: string;
  password: string;
  clientId?: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
  }
}

export default class MqttBrokerConnection {
  public connectionId = Math.random().toString(36).substring(2, 9);
  private emitter: MQTTEmitter | undefined;
  private client: mqtt.MqttClient | undefined;
  private offlineTopic: string | null = null;
  constructor(
    private host: string,
    private credentials: MqttCredentials | undefined = undefined
  ) {}

  get connected() {
    return this.client?.connected ?? false;
  }

  public async connect(offlineTopic: string | null = null) {
    this.offlineTopic = offlineTopic;
    console.log(
      `mqtt ${this.connectionId} connecting to ${this.host} with credentials`,
      this.credentials
    );

    this.client = mqtt.connect(this.host, {
      username: this.credentials?.username,
      password: this.credentials?.password,
      clientId: this.credentials?.clientId ?? `user:${this.connectionId}`,
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
    this.emitter = new MQTTEmitter();

    this.client.on('message', this.emitter.emit.bind(this.emitter));
    this.client.on('packetsend', p => {
      if (p.cmd === 'publish') {
        console.debug(`mqtt ${this.connectionId} packetsend`, {
          cmd: p.cmd,
          topic: p.topic,
          payload: p.payload?.toString(),
        });
      } else {
        console.debug(`mqtt ${this.connectionId} packetsend`, p);
      }
    });
    this.client.on('packetreceive', p => {
      if (p.cmd === 'publish') {
        console.debug(`mqtt ${this.connectionId} packetreceive`, {
          cmd: p.cmd,
          topic: p.topic,
          payload: p.payload?.toString(),
        });
      } else {
        console.debug(`mqtt ${this.connectionId} packetreceive`, p);
      }
    });
    this.emitter.onadd = this.client.subscribe.bind(this.client);
    this.emitter.onremove = this.client.unsubscribe.bind(this.client);

    return new Promise<void>((resolve, reject) => {
      this.client!.once('connect', () => {
        resolve();
      });
      this.client!.once('error', err => {
        console.error(`mqtt ${this.connectionId} connection error`, err);
        if (err instanceof mqtt.ErrorWithReasonCode && err.code === 5) {
          reject(new InvalidCredentialsError());
          this.client!.end();
        } else {
          reject(err);
        }
      });
    });
  }

  public async disconnect() {
    if (this.client && this.client.connected) {
      if (this.offlineTopic) {
        await this.publish(this.offlineTopic, 'offline', true);
      }
      this.client.end();
    }
  }

  on(event: 'connect', listener: () => void): () => void;
  on(event: 'reconnect', listener: () => void): () => void;
  on(event: 'disconnect', listener: () => void): () => void;
  on(event: 'error', listener: (error: Error) => void): () => void;
  on(
    event: 'connect' | 'reconnect' | 'disconnect' | 'error',
    listener: (error: Error) => void
  ) {
    if (!this.client) {
      throw new Error('Not connected');
    }
    this.client.on(event, listener);
    return () => {
      this.client!.removeListener(event, listener);
    };
  }

  public subscribe(topic: string, handler: SubscriptionCallback<Uint8Array>) {
    if (!this.emitter) {
      throw new Error('Not connected');
    }
    this.emitter.on(topic, handler);
    return () => {
      this.emitter!.removeListener(topic, handler);
    };
  }

  public publish(
    topic: string,
    payload: Uint8Array | string,
    retain?: boolean
  ) {
    if (!this.client) {
      throw new Error('Not connected');
    }
    this.client.publish(topic, Buffer.from(payload), {retain});
  }
}
