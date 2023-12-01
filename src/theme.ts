import {darken, createTheme} from '@mui/material/styles';

export const DarkOrange = '#FE8D06';
export const Tomato = '#EA5C45';
export const Parchment = '#F5EAD3';
export const DarkPurple = '#311A34';
export const Razzmatazz = '#DB3A74';

const theme = createTheme({
  typography: {
    fontFamily: 'sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  palette: {
    mode: 'dark',
    background: {
      default: darken(DarkPurple, 0.7),
      paper: DarkPurple,
    },
    primary: {
      main: DarkOrange,
    },
    secondary: {
      main: Tomato,
    },
    info: {
      main: Parchment,
    },
    divider: Razzmatazz,
  },
});

export default theme;
