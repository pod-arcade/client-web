import React, {useCallback, useEffect, useRef, useState} from 'react';

import Box from '@mui/material/Box';

import Metrics from './Metrics';
import Favicon from '../assets/favicon';

import SessionPeerConnection from '../api/session';

const ControlsContainer: React.FC<
  React.PropsWithChildren<{
    session: SessionPeerConnection;
    showMetrics: boolean;
    collapse: boolean;
    video: React.ReactElement;
  }>
> = ({session, video, collapse, showMetrics, children}) => {
  const container = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);

  const hide = useCallback(() => {
    // This is a bit of a hack, but if there is a popover in the document, don't hide the controls
    if (
      !collapse ||
      document.getElementsByClassName('MuiPopover-root').length > 0
    ) {
      return;
    }
    setShowControls(false);
  }, [collapse]);

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
        overflow: 'hidden',
        width: '100%',
        position: 'relative',
      }}
    >
      <Favicon
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          margin: '1rem',
          transition: `opacity ${transition}`,
          opacity: showControls ? 0.6 : 0.25,
        }}
      />
      {video}
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
