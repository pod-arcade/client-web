import React from 'react';
import {useLatestMessageFromSubscriptionByTopic} from '../hooks/useMqtt';
import {Link} from 'react-router-dom';

export function useDesktopStatus() {
  const metrics = useLatestMessageFromSubscriptionByTopic<Uint8Array | null>(
    'desktops/+/status'
  );

  if (!metrics) {
    return null;
  }

  const ret = {} as {[desktopId: string]: 'online' | 'offline'};
  for (const [topic, value] of Object.entries(metrics)) {
    console.log(topic, value);
    const {groups: {desktopId} = {desktopId: null}} =
      topic.match(/^desktops\/(?<desktopId>.+)\/status$/) ?? {};
    if (desktopId && value) {
      const strValue = Buffer.from(value).toString('utf-8');
      ret[desktopId] = strValue as 'online' | 'offline';
    }
  }
  return ret;
}

const DesktopList: React.FC = () => {
  const desktops = useDesktopStatus();

  console.log(desktops);
  if (!desktops) {
    return <>Loading...</>;
  }
  return (
    <div>
      {Object.entries(desktops).map(([desktopId, status]) => (
        <Link to={`/desktops/${desktopId}`} key={desktopId}>
          {desktopId} {status} <br />
        </Link>
      ))}
    </div>
  );
};

export default DesktopList;
