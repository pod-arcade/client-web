import {darken, createTheme} from '@mui/material/styles';

export const CambridgeBlue = '#80B7AF';
export const Coral = '#EE8B63';
export const Vanilla = '#F8E9B1';
export const DarkPurple = '#2E1D3C';
export const WalnutBrown = '#5C574F';

const theme = createTheme({
  typography: {
    fontFamily: 'sans-serif',
  },
  palette: {
    mode: 'dark',
    background: {
      default: darken(DarkPurple, 0.7),
    },
    primary: {
      main: CambridgeBlue,
    },
    secondary: {
      main: Coral,
    },
  },
});

export default theme;
