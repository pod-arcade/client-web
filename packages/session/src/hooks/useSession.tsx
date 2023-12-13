import {useEffect, useState} from 'react';
import {MqttCredentials} from '../api/mqtt';
import SessionPeerConnection from '../api/session';

export default function useSession(
  desktopId: string,
  mqttUrl: string,
  mqttCredentials?: MqttCredentials
) {
  const [session, setSession] = useState<SessionPeerConnection>();
  const [error, setError] = useState<Error>();
  const [reconnectCounter, setReconnectCounter] = useState(0);

  useEffect(() => {
    const session = new SessionPeerConnection(
      desktopId,
      mqttUrl,
      mqttCredentials
    );
    setSession(session);
    session.connect().catch(e => setError(e));
    return () => {
      session.disconnect();
    };
  }, [mqttUrl, mqttCredentials, desktopId, reconnectCounter]);

  return {session, error, reconnect: () => setReconnectCounter(c => c + 1)};
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
