import {useEffect, useState} from 'react';
import MQTTEmitter, {SubscriptionCallback} from 'mqtt-emitter';
import {useConnectionConnected, useMqttConnection} from '../hooks/useMqtt';

const usePeerConnection = (mqtt: MQTTEmitter | null) => {
  const [value, setValue] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!mqtt) return;
    const handler = (data: Buffer) => {
      try {
        const iceServers = JSON.parse(data.toString());
        console.log('Creating PeerConnection', iceServers);
        const pc = new RTCPeerConnection({
          iceServers: iceServers,
        });
        setValue(pc);
      } catch (e) {
        console.error('Error creating PeerConnection', e);
      }
    };
    mqtt.on('server/ice-servers', handler);
    return () => {
      mqtt.removeListener('server/ice-servers', handler);
    };
  }, [mqtt]);

  return value;
};

export default usePeerConnection;

export const useNegotiatedPeerConnection = (
  desktopId: string,
  sessionId: string
) => {
  const mqttConnection = useMqttConnection(
    `desktops/${desktopId}/sessions/${sessionId}/status`
  );
  const peerConnection = usePeerConnection(mqttConnection?.emitter ?? null);
  const mqttConnected = useConnectionConnected(mqttConnection?.client ?? null);

  useEffect(() => {
    if (mqttConnection && mqttConnected) {
      mqttConnection.client.publish(
        `desktops/${desktopId}/sessions/${sessionId}/status`,
        'online',
        {retain: true}
      );
    }
  }, [mqttConnection, mqttConnected]);

  useEffect(() => {
    if (!mqttConnection || !peerConnection) return;

    async function sendLatestLocalDescription() {
      if (!mqttConnection || !peerConnection?.localDescription?.sdp) {
        console.warn('No local description to send');
        return;
      }
      mqttConnection.client.publish(
        `desktops/${desktopId}/sessions/${sessionId}/webrtc-offer`,
        peerConnection.localDescription.sdp
      );
    }

    peerConnection.onicegatheringstatechange = async () => {
      console.log(
        'ice gathering state change',
        peerConnection.iceGatheringState
      );
    };

    peerConnection.onicecandidate = async (
      event: RTCPeerConnectionIceEvent
    ) => {
      console.log('ice candidate', event.candidate);
      await sendLatestLocalDescription();
    };

    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      const sdp = offer.sdp
        ?.split('\n')
        .filter(l => !l.startsWith('a=rtcp-fb:'))
        .join('\n');
      console.log('Created offer', {sdp});
      await peerConnection.setLocalDescription({
        type: 'offer',
        sdp,
      });
      await sendLatestLocalDescription();
    };

    const topic = `desktops/${desktopId}/sessions/${sessionId}/webrtc-answer`;
    const handler: SubscriptionCallback<Buffer> = async data => {
      console.log('Got answer', {answer: data.toString()});
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: data.toString(),
          })
        );
      } catch (e) {
        console.error('Error handling SDP answer', e);
      }
    };
    console.log('Subscribing to', topic);
    mqttConnection.emitter.on(topic, handler);

    return () => {
      console.log('Removing listener for', topic);
      mqttConnection.emitter.removeListener(topic, handler);
      mqttConnection.client.end();
      peerConnection.close();
    };
  }, [peerConnection, mqttConnection]);

  return mqttConnected ? peerConnection : null;
};

export const usePeerConnectionState = (
  peerConnection: RTCPeerConnection | null
) => {
  const [value, setValue] = useState<RTCPeerConnectionState>(
    peerConnection?.connectionState ?? 'connecting'
  );

  useEffect(() => {
    if (!peerConnection) return;
    const listener = () => {
      console.log('connection state change', peerConnection.connectionState);
      setValue(peerConnection.connectionState);
    };
    peerConnection.addEventListener('connectionstatechange', listener);
    return () => {
      peerConnection.removeEventListener('connectionstatechange', listener);
    };
  }, [peerConnection]);

  return value;
};

export const useDataChannel = (peerConnection: RTCPeerConnection | null) => {
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  useEffect(() => {
    if (!peerConnection || peerConnection.signalingState === 'closed') {
      return;
    }

    try {
      const dc = peerConnection.createDataChannel('input', {
        id: 0,
        negotiated: true,
        ordered: true,
        maxRetransmits: 10,
        protocol: 'pod-arcade-input-v1',
      });
      console.log('created datachannel', dc);
      setDataChannel(dc);
    } catch (e) {
      console.error('Error creating datachannel', e);
    }
  }, [peerConnection]);

  return dataChannel;
};
