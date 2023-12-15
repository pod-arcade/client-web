import {useEffect, useState} from 'react';

const useHasVolumeSupport = () => {
  const [hasVolumeSupport, setHasVolumeSupport] = useState<boolean>(true);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';
    audio.style.position = 'absolute';

    audio.volume = 0.5;
    document.body.appendChild(audio);

    setTimeout(() => {
      const hasSupport = audio.volume === 0.5;
      setHasVolumeSupport(hasSupport);
      document.body.removeChild(audio);
    }, 0);
  }, []);

  return hasVolumeSupport;
};
export default useHasVolumeSupport;
