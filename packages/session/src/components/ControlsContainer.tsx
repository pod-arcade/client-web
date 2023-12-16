import React, {useCallback, useEffect, useRef, useState} from 'react';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ArrowBack from '@mui/icons-material/ArrowBack';

import Metrics from './Metrics';
import Favicon from '../assets/favicon';

import SessionPeerConnection from '../api/session';
import {useSessionStatus} from '../hooks/useSession';

const ControlsContainer: React.FC<
  React.PropsWithChildren<{
    session: SessionPeerConnection;
    showMetrics: boolean;
    collapse: boolean;
    video: React.ReactElement;
    onBackClick?: () => void;
  }>
> = ({session, video, collapse, showMetrics, onBackClick, children}) => {
  const container = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const peerConnectionState = useSessionStatus(session);

  const hide = useCallback(() => {
    if (
      !collapse ||
      peerConnectionState !== 'connected' ||
      // This is a bit of a hack, but if there is a popover in the document, don't hide the controls
      document.getElementsByClassName('MuiPopover-root').length > 0
    ) {
      return;
    }
    setShowControls(false);
  }, [collapse, peerConnectionState]);

  useEffect(() => {
    if (!container.current) return;

    // when mouse enter or mouse move, restart timer to show controls
    let showControlsTimer: NodeJS.Timeout | undefined = undefined;
    const restartTimer = () => {
      clearTimeout(showControlsTimer);
      // Don't show controls if the mouse is locked (mouse passthrough)
      if (document.pointerLockElement) {
        return;
      }
      setShowControls(true);
      showControlsTimer = setTimeout(hide, 5000);
    };
    container.current.addEventListener('mouseenter', restartTimer);
    container.current.addEventListener('mousemove', restartTimer);
    container.current.addEventListener('mouseleave', hide);

    restartTimer();

    return () => {
      if (!container.current) return;
      clearTimeout(showControlsTimer);
      container.current.removeEventListener('mouseenter', restartTimer);
      container.current.removeEventListener('mousemove', restartTimer);
      container.current.removeEventListener('mouseleave', hide);
    };
  }, [container, hide]);

  const transition = `${showControls ? '0.1s' : '0.7s'} ease-in-out`;

  return (
    <Box
      ref={container}
      sx={{
        flexGrow: 1,
        width: '100%',
        position: 'relative',
      }}
    >
      {video}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: `background-color ${transition}`,
          backgroundColor: showControls ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
        }}
      >
        <Box
          sx={{
            transition: `opacity ${transition}`,
            opacity: showControls ? 1 : 0,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {onBackClick ? (
            <IconButton
              size="small"
              onClick={onBackClick}
              sx={{
                marginLeft: '-5px',
              }}
            >
              <ArrowBack />
            </IconButton>
          ) : null}
          <Box>
            <b>Session {session.sessionId}</b> - {peerConnectionState}
          </Box>
        </Box>
        <Favicon
          sx={{
            transition: `opacity ${transition}`,
            opacity: showControls ? 0.6 : 0.25,
          }}
        />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          bottom: showControls ? 0 : '-3rem',
          opacity: showControls ? 1 : 0.6,
          transition: ['bottom', 'opacity', 'background-color']
            .map(s => `${s} ${transition}`)
            .join(', '),
          overflow: 'hidden',
          left: 0,
          right: 0,
          color: 'white',
          backgroundColor: showControls ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
        }}
      >
        {showMetrics ? (
          <Metrics peerConnection={session.peerConnection} />
        ) : null}
        <Box
          sx={{
            transition: `opacity ${showControls ? '0.1s' : '0.7s'} ease-in-out`,
            opacity: showControls ? 1 : 0,
            height: '3rem',
            overflow: 'hidden',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
export default ControlsContainer;
