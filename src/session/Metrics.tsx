import React, {useEffect, useState, useRef} from 'react';
import {Sparklines, SparklinesLine} from '@jrwats/react-sparklines';
import {lighten} from '@mui/material/styles';
import useComponentSize from '@rehooks/component-size';
import {DarkPurple, Vanilla} from '../theme';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const METRICS_INTERVAL_MS = 250;
const METRICS_SAMPLES = 250;
const SAMPLES_PER_PIXEL = 2;
const AVERAGE_WINDOW = 10;

const simpleMovingAverage = (data: number[]) => {
  let index = AVERAGE_WINDOW - 1;
  const length = data.length + 1;
  const results = new Array<number>();

  while (index < length) {
    index = index + 1;
    const intervalSlice = data.slice(index - AVERAGE_WINDOW, index);
    const sum = intervalSlice.reduce((prev, curr) => prev + curr, 0);
    results.push(sum / AVERAGE_WINDOW);
  }

  return results;
};

const Stat: React.FC<{points: number[]; title: string; unit: string}> = ({
  points,
  title,
  unit,
}) => {
  const sparklineContainerRef = useRef<HTMLDivElement>(null);
  const sparklineContainerSize = useComponentSize(sparklineContainerRef);
  const averagedPoints = simpleMovingAverage(
    points.map(p => (isNaN(p) ? 0 : p))
  ).slice(-sparklineContainerSize.width / SAMPLES_PER_PIXEL, -1);
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
          maxWidth: METRICS_SAMPLES * SAMPLES_PER_PIXEL,
        }}
        ref={sparklineContainerRef}
      >
        <Sparklines
          data={averagedPoints}
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
          {averagedPoints.at(-1)?.toFixed(2)} {unit}
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
    peerConnection.getStats().then(s => console.log(Array.from(s.values())));
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
              (1024 * 1024) /
              (METRICS_INTERVAL_MS / 1000);

            lastStats.videoTotalBytes = stat.bytesReceived;
          } else if (stat.mediaType === 'audio') {
            aggregateStats.audioMegabitsPerSecond =
              (8 * (stat.bytesReceived - (lastStats.audioTotalBytes ?? 0))) /
              (1024 * 1024) /
              (METRICS_INTERVAL_MS / 1000);

            lastStats.audioTotalBytes = stat.bytesReceived;
          }
        }
      }
      if (!first) {
        stats.push(aggregateStats);
        setStats(stats.slice(-METRICS_SAMPLES));
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
        points={stats.map(s => s.roundTripTimeMs ?? 0)}
        title="Round Trip Time"
        unit="ms"
      />
      <Stat
        points={stats.map(s => s.videoJitterMs ?? 0)}
        title="Video Jitter"
        unit="ms"
      />
      <Stat
        points={stats.map(s => s.videoMegabitsPerSecond ?? 0)}
        title="Video Bitrate"
        unit="Mbps"
      />
      <Stat
        points={stats.map(s => s.audioMegabitsPerSecond ?? 0)}
        title="Audio Bitrate"
        unit="Mbps"
      />
    </Box>
  );
};
export default Metrics;
