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
        minHeight: '100%',
        alignContent: 'center',
      }}
    >
      <DesktopList />
    </Box>
  );
};
export default DesktopsPage;
