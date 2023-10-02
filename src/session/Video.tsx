import 'webrtc-adapter';
import React, {useEffect, useRef, useState} from 'react';
import {usePeerConnectionState} from './usePeerConnection';

const Video: React.FunctionComponent<{
  width: string;
  height?: string;
  peerConnection: RTCPeerConnection;
  volume: number;
}> = ({width, height, peerConnection, volume}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionState = usePeerConnectionState(peerConnection);

  const [videoStream] = useState(new MediaStream());
  const [audioStream] = useState(new MediaStream());

  useEffect(() => {
    if (
      peerConnectionState === 'closed' ||
      peerConnection.signalingState === 'closed'
    ) {
      return;
    }
    peerConnection.addTransceiver('video', {
      direction: 'recvonly',
      streams: [videoStream],
    });

    peerConnection.addTransceiver('audio', {
      direction: 'recvonly',
      streams: [audioStream],
    });

    const handler = (event: RTCTrackEvent) => {
      if (event.track.kind === 'video') {
        videoStream.addTrack(event.track);
      } else {
        audioStream.addTrack(event.track);
      }
    };

    peerConnection.addEventListener('track', handler);

    console.log('Adding streams');
    return () => {
      console.log('Removing streams');
      peerConnection.removeEventListener('track', handler);
    };
  }, [peerConnection, peerConnectionState]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = audioStream;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoRef, audioRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [audioRef, volume]);

  return (
    <>
      <video
        ref={videoRef}
        width={width}
        height={height}
        autoPlay={true}
        controls={false}
        muted={true}
        playsInline={true}
        style={{
          display: peerConnectionState !== 'connected' ? 'hidden' : 'block',
        }}
      />
      <audio ref={audioRef} autoPlay={true} controls={false} muted={false} />
    </>
  );
};

export default Video;
