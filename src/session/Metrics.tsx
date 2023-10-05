import React, {useEffect, useState, useRef} from 'react';
import {Sparklines, SparklinesLine} from '@jrwats/react-sparklines';
import {lighten} from '@mui/material/styles';
import useComponentSize from '@rehooks/component-size';
import {DarkPurple, Vanilla} from '../theme';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const METRICS_INTERVAL_MS = 250;
const METRICS_SAMPLES = (1000 / METRICS_INTERVAL_MS) * 30;

const Stat: React.FC<{points: number[]; title: string; unit: string}> = ({
  points,
  title,
  unit,
}) => {
  const sparklineContainerRef = useRef<HTMLDivElement>(null);
  const sparklineContainerSize = useComponentSize(sparklineContainerRef);
  return (
    <Box
      sx={{
        margin: '0.5rem',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'row',
        background: lighten(DarkPurple, 0.1),
        borderRadius: '0.5rem',
        flexGrow: 1,
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
        }}
        ref={sparklineContainerRef}
      >
        <Sparklines
          data={points.map(p => (isNaN(p) ? 0 : p))}
          width={sparklineContainerSize.width}
          height={sparklineContainerSize.height}
        >
          <SparklinesLine color={Vanilla} />
        </Sparklines>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{marginLeft: '0.5rem', lineHeight: '0.9rem'}}
        >
          <b>{title}</b>
          <br />
          {points.at(-1)?.toFixed(2)} {unit}
        </Typography>
      </Box>
    </Box>
  );
};

const Metrics: React.FC<{peerConnection: RTCPeerConnection}> = ({
  peerConnection,
}) => {
  const [stats, setStats] = useState<
    {
      roundTripTimeMs?: number;
      videoJitterMs?: number;
      videoMegabitsPerSecond?: number;
      audioMegabitsPerSecond?: number;
    }[]
  >([]);

  useEffect(() => {
    let first = true;
    const lastStats: {
      videoTotalBytes?: number;
      audioTotalBytes?: number;
    } = {};
    const interval = setInterval(async () => {
      if (peerConnection.connectionState !== 'connected') {
        return;
      }

      const s = await peerConnection.getStats();
      const aggregateStats: (typeof stats)[0] = {};
      for (const [, stat] of Array.from(s)) {
        if (stat.type === 'candidate-pair' && stat.nominated === true) {
          aggregateStats.roundTripTimeMs = stat.currentRoundTripTime * 1000;
        } else if (stat.type === 'inbound-rtp') {
          if (stat.mediaType === 'video') {
            aggregateStats.videoJitterMs = stat.jitter * 1000;

            aggregateStats.videoMegabitsPerSecond =
              (8 * (stat.bytesReceived - (lastStats.videoTotalBytes ?? 0))) /
              1e6 /
              (1 / METRICS_INTERVAL_MS);

            lastStats.videoTotalBytes = stat.bytesReceived;
          } else {
            aggregateStats.audioMegabitsPerSecond =
              (8 * (stat.bytesReceived - (lastStats.audioTotalBytes ?? 0))) /
              1e6;

            lastStats.audioTotalBytes = stat.bytesReceived;
          }
        }
      }
      if (!first) {
        stats.unshift(aggregateStats);
        setStats(stats.slice(0, METRICS_SAMPLES));
      }
      first = false;
    }, METRICS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [peerConnection]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '64px',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Stat
        points={stats.map(s => s.roundTripTimeMs ?? 0).reverse()}
        title="Round Trip Time"
        unit="ms"
      />
      <Stat
        points={stats.map(s => s.videoJitterMs ?? 0).reverse()}
        title="Video Jitter"
        unit="ms"
      />
      <Stat
        points={stats.map(s => s.videoMegabitsPerSecond ?? 0).reverse()}
        title="Video Bitrate"
        unit="Mbps"
      />
      <Stat
        points={stats.map(s => s.audioMegabitsPerSecond ?? 0).reverse()}
        title="Audio Bitrate"
        unit="Mbps"
      />
    </Box>
  );
};
export default Metrics;
