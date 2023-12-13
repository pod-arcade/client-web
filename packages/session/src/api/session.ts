import EventEmitter from 'events';
import MqttBrokerConnection, {MqttCredentials} from './mqtt';

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

  private mqttBrokerConnection: MqttBrokerConnection;
  private subs = new Array<() => void>();
  private emitter = new EventEmitter();

  private iceCandidateQueue = new Array<RTCIceCandidate>();
  private statusTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/status`;
  private failed = false;

  constructor(
    private desktopId: string,
    mqttUrl: string,
    mqttCredentials?: MqttCredentials
  ) {
    this.mqttBrokerConnection = new MqttBrokerConnection(
      mqttUrl,
      mqttCredentials
    );
    this.mqttBrokerConnection.connectionId = this.sessionId;
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
      } else if (this.failed) {
        return 'failed';
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
    console.log('connecting');
    this.subs = [];
    await this.mqttBrokerConnection.connect(this.statusTopic);
    try {
      await Promise.race([
        this.connectToDesktop(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new PeerConnectionTimeoutError()), 10_000)
        ),
      ]);
    } catch (e) {
      console.error('Error connecting to desktop', e);
      if (e instanceof PeerConnectionTimeoutError) {
        console.log('session status timeout');
      }
      this.failed = true;
      this.emitter.emit('connectionstatechange', 'failed');
      throw e;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    await this.subs.forEach(unsub => unsub());
    await this.mqttBrokerConnection.disconnect();
  }

  private async connectToDesktop() {
    await this.createPeerConnection();
    await this.setupIceCandidateHandler();
    await this.offerAndResponse();

    await new Promise<void>(res => {
      if (!this.peerConnection) {
        throw new Error('peerConnection not initialized');
      }
      this.on('connectionstatechange', state => {
        if (state === 'connected') {
          res();
        }
      });
    });
  }

  /**
   * Create a new PeerConnection and set it as the current one
   * initializes tracks, registers ice servers, and sets up the connection state change handler
   */
  private async createPeerConnection() {
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
  }

  /**
   * Subscribes to the ice-servers topic and returns the list of ice servers
   * @returns a list of ice servers to use for the peer connection
   */
  private async getIceServers(): Promise<RTCIceServer[]> {
    // TODO: add desktop-specific ice-servers
    const iceServersPromise = new Promise<RTCIceServer[]>(resolve => {
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

    return Promise.race([
      iceServersPromise,
      new Promise<RTCIceServer[]>(res => setTimeout(() => res([]), 5000)),
    ]);
  }

  /**
   * Creates an offer, sends it to the desktop, and waits for an answer
   */
  private async offerAndResponse() {
    if (!this.peerConnection) {
      throw new Error('peerConnection not initialized');
    }
    await new Promise<void>(
      res => (this.peerConnection!.onnegotiationneeded = () => res())
    );

    const offer = await this.peerConnection.createOffer();
    const sdp = this.removeRTFFromOffer(offer);
    console.log('Created offer', {sdp});
    await this.peerConnection.setLocalDescription({
      type: 'offer',
      sdp,
    });

    const answer = await this.mqttRequestResponse(
      `desktops/${this.desktopId}/sessions/${this.sessionId}/webrtc-offer`,
      this.peerConnection.localDescription!.sdp,
      `desktops/${this.desktopId}/sessions/${this.sessionId}/webrtc-answer`,
      5000
    ).catch(e => {
      console.error('Error getting answer', e);
      throw new Error(
        'Timeout waiting for answer to WebRTC offer. Is the desktop running and connected?'
      );
    });

    console.log('Got answer', {answer: answer.toString()});

    try {
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription({
          type: 'answer',
          sdp: answer.toString(),
        })
      );
    } catch (e) {
      console.error('Error handling SDP answer', e);
      throw e;
    }

    // Add any candidates discovered while waiting for the answer
    for (const candidate of this.iceCandidateQueue) {
      try {
        console.log('Adding queued ICE candidate', candidate);
        await this.peerConnection!.addIceCandidate(candidate);
      } catch (e) {
        console.error('Error handling queued ICE candidate', e);
      }
    }
  }

  /**
   * Sends a message on an mqtt topic and waits for a response on a different topic, with a timeout
   */
  private async mqttRequestResponse(
    requestTopic: string,
    requestPayload: string | Uint8Array,
    responseTopic: string,
    timeoutMs?: number
  ): Promise<string | Uint8Array> {
    const responsePromises = [
      new Promise<string | Uint8Array>(resolve => {
        const unsub = this.mqttBrokerConnection.subscribe(
          responseTopic,
          (data: Uint8Array) => {
            resolve(data);
            unsub();
          }
        );
        this.subs.push(unsub);
      }),
    ];
    if (timeoutMs !== undefined) {
      responsePromises.push(
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout waiting for response')),
            timeoutMs
          )
        )
      );
    }

    this.mqttBrokerConnection.publish(requestTopic, requestPayload);

    return await Promise.race(responsePromises);
  }

  /**
   * Creates the tracks for the peer connection
   */
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

  /**
   * Sets up the ice candidate handler for the peer connection
   */
  private setupIceCandidateHandler() {
    if (!this.peerConnection) {
      throw new Error('peerConnection not initialized');
    }

    const offerIceCandidateTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/offer-ice-candidate`;
    const answerIceCandidateTopic = `desktops/${this.desktopId}/sessions/${this.sessionId}/answer-ice-candidate`;

    // Send any locally discovered candidates to the desktop
    this.peerConnection.onicecandidate = async (
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
        if (this.peerConnection?.remoteDescription === null) {
          console.warn(
            'remoteDescription is null, queuing ice candidate until answer is received'
          );
          this.iceCandidateQueue.push(JSON.parse(data.toString()));
        } else {
          try {
            console.log('Received ICE candidate', JSON.parse(data.toString()));
            await this.peerConnection!.addIceCandidate(
              JSON.parse(data.toString())
            );
          } catch (e) {
            console.error('Error handling ICE candidate', e);
          }
        }
      }
    );
    this.subs.push(answerIceHandler);
  }

  /**
   * Removes rtcp feedback lines from an offer
   */
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
