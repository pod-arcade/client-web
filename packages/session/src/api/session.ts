import EventEmitter from 'events';
import MqttBrokerConnection from './mqtt';

export class PeerConnectionTimeoutError extends Error {
  constructor() {
    super('Timed out connecting to desktop');
  }
}

export default class SessionPeerConnection {
  public peerConnection: RTCPeerConnection | undefined;
  public sessionId = Math.random().toString(36).substring(2, 9);

  public inputDataChannel: RTCDataChannel | undefined;
  public audioStream = new MediaStream();
  public videoStream = new MediaStream();

  private subs = new Array<() => void>();
  private emitter = new EventEmitter();

  private statusTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/status`;

  constructor(
    private desktopId: string,
    private mqttBrokerConnection: MqttBrokerConnection
  ) {
    this.on('connectionstatechange', () => {
      this.mqttBrokerConnection.publish(this.statusTopic, this.status, true);
    });
  }

  get status(): RTCPeerConnectionState {
    if (!this.mqttBrokerConnection.connected) {
      return 'disconnected';
    } else {
      if (!this.peerConnection) {
        return 'new';
      } else {
        return this.peerConnection.connectionState;
      }
    }
  }

  on(
    event: 'connectionstatechange',
    listener: (status: RTCPeerConnectionState) => void
  ): () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): () => void {
    this.emitter.on(event, listener);
    return () => this.emitter.removeListener(event, listener);
  }

  public async connect(): Promise<void> {
    this.subs = [];
    await this.mqttBrokerConnection.connect(this.statusTopic);
    await Promise.race([
      this.connectToDesktop(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new PeerConnectionTimeoutError()), 5000)
      ),
    ]);
    await this.mqttBrokerConnection.publish(
      this.statusTopic,
      'connected',
      true
    );
  }

  public async disconnect(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    await this.subs.forEach(unsub => unsub());
  }

  private async getIceServers(): Promise<RTCIceServer[]> {
    // TODO: add desktop-specific ice-servers
    return new Promise<RTCIceServer[]>(resolve => {
      const unsub = this.mqttBrokerConnection.subscribe(
        'server/ice-servers',
        (data: Uint8Array) => {
          try {
            const iceServers = JSON.parse(data.toString());
            resolve(iceServers);
            unsub();
          } catch (e) {
            console.error('Error creating PeerConnection', e);
          }
        }
      );
      this.subs.push(unsub);
    });
  }

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    const iceServers = await this.getIceServers();
    console.log('Creating PeerConnection', iceServers);

    const peerConnection = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all',
    });
    this.peerConnection = peerConnection;
    this.setupTracks();

    this.emitter.emit('connectionstatechange', peerConnection.connectionState);
    peerConnection.onconnectionstatechange = () => {
      console.log('connection state changed', peerConnection.connectionState);
      this.emitter.emit(
        'connectionstatechange',
        peerConnection.connectionState
      );
    };

    return peerConnection;
  }

  private async connectToDesktop() {
    const peerConnection = await this.createPeerConnection();

    const offerTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/webrtc-offer`;
    const answerTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/webrtc-answer`;
    const offerIceCandidateTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/offer-ice-candidate`;
    const answerIceCandidateTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/answer-ice-candidate`;

    // Listen for answer responses from desktop
    const answerHandler = this.mqttBrokerConnection.subscribe(
      answerTopic,
      async data => {
        console.log('Got answer', {answer: data.toString()});
        try {
          await this.peerConnection!.setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: data.toString(),
            })
          );
        } catch (e) {
          console.error('Error handling SDP answer', e);
        } finally {
          answerHandler();
        }
      }
    );
    this.subs.push(answerHandler);

    // Send any locally discovered candidates to the desktop
    peerConnection.onicecandidate = async (
      event: RTCPeerConnectionIceEvent
    ) => {
      console.log('discovered local ice candidate', event.candidate);
      if (event.candidate && event.candidate.candidate !== '') {
        this.mqttBrokerConnection.publish(
          offerIceCandidateTopic,
          JSON.stringify(event.candidate)
        );
      }
    };

    // Add any candidates discovered by the desktop
    const answerIceHandler = this.mqttBrokerConnection.subscribe(
      answerIceCandidateTopic,
      async data => {
        try {
          console.log('Received ICE candidate', JSON.parse(data.toString()));
          await peerConnection.addIceCandidate(JSON.parse(data.toString()));
        } catch (e) {
          console.error('Error handling ICE candidate', e);
        }
      }
    );
    this.subs.push(answerIceHandler);

    // Now that all of the handlers are setup, go ahead and create an offer and send it over once there are tracks added
    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      const sdp = this.removeRTFFromOffer(offer);
      console.log('Created offer', {sdp});
      await peerConnection.setLocalDescription({
        type: 'offer',
        sdp,
      });
      this.mqttBrokerConnection.publish(
        offerTopic,
        peerConnection.localDescription!.sdp
      );
    };
  }

  private setupTracks() {
    this.inputDataChannel = this.peerConnection!.createDataChannel('input', {
      id: 0,
      negotiated: true,
      ordered: true,
      maxRetransmits: 10,
      protocol: 'pod-arcade-input-v1',
    });

    console.log('addTransceiver');
    this.peerConnection!.addTransceiver('video', {
      direction: 'recvonly',
      streams: [this.videoStream],
    });

    this.peerConnection!.addTransceiver('audio', {
      direction: 'recvonly',
      streams: [this.audioStream],
    });

    const handler = (event: RTCTrackEvent) => {
      if (event.track.kind === 'video') {
        this.videoStream.addTrack(event.track);
      } else {
        this.audioStream.addTrack(event.track);
      }
    };

    this.peerConnection!.addEventListener('track', handler);

    console.log('Adding streams');
  }

  private removeRTFFromOffer(offer: RTCSessionDescriptionInit) {
    return offer.sdp
      ?.split('\n')
      .filter(
        l =>
          !l.startsWith('a=rtcp-fb:') || // if it's not a rtcp feedback line
          l.match(/^a=rtcp-fb:[0-9]+ nack$/gm) !== null // or if it's specifically for NACK
      )
      .join('\n');
  }
}
