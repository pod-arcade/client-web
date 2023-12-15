import React from 'react';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import IconButton from '@mui/material/IconButton';

import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeMute from '@mui/icons-material/VolumeMute';

import useHasVolumeSupport from '../hooks/useHasVolumeSupport';

const VolumeSlider: React.FC<{
  volume: number;
  setVolume: (volume: number) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  disabled: boolean;
}> = ({volume, setVolume, muted, setMuted, disabled}) => {
  const hasVolumeSupport = useHasVolumeSupport();

  return (
    <Box
      sx={{
        flex: hasVolumeSupport ? 1 : 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '7rem',
      }}
    >
      <IconButton
        onClick={() => {
          setMuted(!muted);
        }}
        size="small"
        disabled={disabled}
      >
        {muted ? <VolumeMute /> : <VolumeUp />}
      </IconButton>
      {hasVolumeSupport ? (
        <Slider
          sx={{
            width: '100%',
            margin: '0 0.5rem',
            color: 'white',
          }}
          value={muted ? 0 : volume}
          disabled={disabled || muted}
          size="small"
          min={0}
          max={1}
          step={0.01}
          onChange={(_, value) => setVolume(value as number)}
        />
      ) : null}
    </Box>
  );
};
export default VolumeSlider;
