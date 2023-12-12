import {useEffect, useState} from 'react';

export default function useFullscreenElement() {
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>();
  useEffect(() => {
    const listener = () => {
      setFullscreenElement(document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', listener);
    return () => {
      document.removeEventListener('fullscreenchange', listener);
    };
  }, []);
  return fullscreenElement;
}
