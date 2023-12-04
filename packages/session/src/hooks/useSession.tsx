import {useEffect, useState} from 'react';
import MqttBrokerConnection from '../api/mqtt';
import SessionPeerConnection from '../api/session';

export default function useSession(
  desktopId: string,
  mqttBrokerConnection: MqttBrokerConnection | undefined
) {
  const [session, setSession] = useState<SessionPeerConnection>();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    if (!mqttBrokerConnection) return;
    const session = new SessionPeerConnection(desktopId, mqttBrokerConnection);
    setSession(session);
    session.connect().catch(e => setError(e));
    return () => {
      session.disconnect();
    };
  }, [mqttBrokerConnection, desktopId]);

  return {session, error};
}

export function useSessionStatus(session: SessionPeerConnection | undefined) {
  const [status, setStatus] = useState<RTCPeerConnectionState>(
    session?.status ?? 'new'
  );
  useEffect(() => {
    if (!session) return;
    return session.on('connectionstatechange', status => {
      console.log('session status', status);
      setStatus(status);
    });
  }, [session]);

  return status;
}
