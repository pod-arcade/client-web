import {useEffect, useState} from 'react';

const useHasGrantedMediaPermissions = () => {
  const [granted, setGranted] = useState(true);
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setGranted(
        devices.some(device => {
          return device.kind === 'audioinput' && device.label !== '';
        })
      );
    });
  }, []);
  return granted;
};
export default useHasGrantedMediaPermissions;
