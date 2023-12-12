import 'webrtc-adapter';
import React, {useEffect, useRef} from 'react';
import SessionPeerConnection from '../api/session';

const Video: React.FunctionComponent<{
  width: string;
  height?: string;
  session: SessionPeerConnection;
  volume: number;
  onVideoElement: (videoElement: HTMLVideoElement) => void;
}> = ({width, height, session, volume, onVideoElement}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      onVideoElement(videoRef.current);
    }
  }, [videoRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = session.audioStream;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = session.videoStream;
    }
  }, [session, videoRef, audioRef]);

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
          background: 'black',
          pointerEvents: 'none',
        }}
      />
      <audio
        ref={audioRef}
        autoPlay={true}
        controls={false}
        muted={volume === 0}
      />
    </>
  );
};

export default Video;
