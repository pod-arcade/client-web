import {useEffect, useState} from 'react';
import SessionPeerConnection from '../api/session';
import {useSessionStatus} from './useSession';

export default function useDataChannel(
  session: SessionPeerConnection | undefined
) {
  const [dataChannel, setDataChannel] = useState<RTCDataChannel>();
  const status = useSessionStatus(session);

  useEffect(() => {
    console.log(
      'useDataChannel',
      session,
      session?.peerConnection,
      session?.status
    );
    if (!session || !session.peerConnection || status === 'closed') {
      return;
    }

    try {
      const dc = session.peerConnection.createDataChannel('input', {
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
  }, [session, status]);

  return dataChannel;
}
