import DesktopList from '../desktops/desktop-list';

import Box from '@mui/material/Box';

const DesktopsPage: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: 2,
      }}
    >
      <DesktopList />
    </Box>
  );
};
export default DesktopsPage;
