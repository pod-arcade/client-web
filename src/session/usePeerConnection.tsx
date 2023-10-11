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
      if (event.candidate && event.candidate.candidate !== '') {
        mqttConnection.client.publish(
          `desktops/${desktopId}/sessions/${sessionId}/offer-ice-candidate`,
          JSON.stringify(event.candidate)
        );
      }
    };

    const answerTopic = `desktops/${desktopId}/sessions/${sessionId}/webrtc-answer`;
    const answerHandler: SubscriptionCallback<Buffer> = async data => {
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
    mqttConnection.emitter.on(answerTopic, answerHandler);

    const iceCandidateTopic = `desktops/${desktopId}/sessions/${sessionId}/answer-ice-candidate`;
    const iceCandidateHandler: SubscriptionCallback<Buffer> = async data => {
      try {
        console.log('Received ICE candidate', JSON.parse(data.toString()));
        await peerConnection.addIceCandidate(JSON.parse(data.toString()));
      } catch (e) {
        console.error('Error handling ICE candidate', e);
      }
    };
    mqttConnection.emitter.on(iceCandidateTopic, iceCandidateHandler);

    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        const sdp = removeRTFFromOffer(offer);
        console.log('Created offer', {sdp});
        await peerConnection.setLocalDescription({
          type: 'offer',
          sdp,
        });
        mqttConnection.client.publish(
          `desktops/${desktopId}/sessions/${sessionId}/webrtc-offer`,
          peerConnection.localDescription!.sdp
        );
      } catch (e) {
        console.error('Error creating offer', e);
      }
    };

    return () => {
      console.log('Removing listener for', answerTopic);
      mqttConnection.emitter.removeListener(answerTopic, answerHandler);
      mqttConnection.emitter.removeListener(
        iceCandidateTopic,
        iceCandidateHandler
      );
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

function removeRTFFromOffer(offer: RTCSessionDescriptionInit) {
  return offer.sdp
    ?.split('\n')
    .filter(
      l =>
        !l.startsWith('a=rtcp-fb:') || // if it's not a rtcp feedback line
        l.match(/^a=rtcp-fb:[0-9]+ nack$/gm) !== null // or if it's specifically for NACK
    )
    .join('\n');
}
