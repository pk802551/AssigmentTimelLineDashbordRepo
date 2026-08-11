import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#21318f' },
    secondary: { main: '#0f9f90' },
    warning: { main: '#ff8a1f' },
    background: { default: '#f4f5f7' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: ['Inter', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'].join(','),
    h1: { letterSpacing: 0 },
    h2: { letterSpacing: 0 },
    h3: { letterSpacing: 0 },
    h4: { letterSpacing: 0 },
    h5: { letterSpacing: 0 },
    h6: { letterSpacing: 0 },
    button: { textTransform: 'none', letterSpacing: 0 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
