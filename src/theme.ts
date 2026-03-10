import { createTheme, alpha } from '@mui/material/styles';

// SEO Guru-inspired dark palette + TAW brand green
// Display: Space Grotesk | Body: DM Sans | Mono: JetBrains Mono

const displayFont = '"Space Grotesk", "Helvetica Neue", sans-serif';
const bodyFont = '"DM Sans", "Helvetica Neue", sans-serif';
const monoFont = '"JetBrains Mono", "Fira Code", monospace';

export { monoFont };

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B6B3A',
      light: '#4CAF72',
      dark: '#0D3D20',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#4A7C6F',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#BA1A1A',
    },
    success: {
      main: '#2E7D52',
    },
    warning: {
      main: '#F5A623',
    },
    background: {
      default: '#f0f3f6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1C19',
      secondary: '#555D65',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: displayFont, fontWeight: 700 },
    h2: { fontFamily: displayFont, fontWeight: 700 },
    h3: { fontFamily: displayFont, fontWeight: 700 },
    h4: { fontFamily: displayFont, fontWeight: 700, fontSize: '2.2rem' },
    h5: { fontFamily: displayFont, fontWeight: 700, fontSize: '1.8rem' },
    h6: { fontFamily: displayFont, fontWeight: 600, fontSize: '1.3rem' },
    subtitle1: { fontFamily: displayFont, fontWeight: 600, fontSize: '1.1rem' },
    subtitle2: { fontFamily: displayFont, fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.95rem' },
    button: { fontFamily: bodyFont, fontWeight: 600, textTransform: 'none' as const, letterSpacing: 0.3 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, textTransform: 'none', fontWeight: 600, minHeight: 48 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1B6B3A 0%, #0D3D20 100%)',
          boxShadow: '0 2px 8px rgba(27,107,58,0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #228A4A 0%, #145030 100%)',
            boxShadow: '0 4px 16px rgba(27,107,58,0.4)',
          },
        },
        sizeSmall: { minHeight: 36 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1B6B3A',
              boxShadow: '0 0 0 3px rgba(27, 107, 58, 0.15)',
            },
          },
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5fbd7d',
      light: '#8dd4a1',
      dark: '#3a9958',
      contrastText: '#003919',
    },
    secondary: {
      main: '#83CDB8',
      contrastText: '#003730',
    },
    error: {
      main: '#f85149',
    },
    success: {
      main: '#5fbd7d',
    },
    warning: {
      main: '#d29922',
    },
    background: {
      default: '#0e1117',
      paper: '#161b22',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: displayFont, fontWeight: 700 },
    h2: { fontFamily: displayFont, fontWeight: 700 },
    h3: { fontFamily: displayFont, fontWeight: 700 },
    h4: { fontFamily: displayFont, fontWeight: 700, fontSize: '2.2rem' },
    h5: { fontFamily: displayFont, fontWeight: 700, fontSize: '1.8rem' },
    h6: { fontFamily: displayFont, fontWeight: 600, fontSize: '1.3rem' },
    subtitle1: { fontFamily: displayFont, fontWeight: 600, fontSize: '1.1rem' },
    subtitle2: { fontFamily: displayFont, fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.95rem' },
    button: { fontFamily: bodyFont, fontWeight: 600, textTransform: 'none' as const, letterSpacing: 0.3 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          backgroundColor: theme.palette.background.paper,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.25),
          },
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, textTransform: 'none', fontWeight: 600, minHeight: 48 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #5fbd7d 0%, #4aa86a 100%)',
          color: '#003919',
          boxShadow: '0 2px 12px rgba(95, 189, 125, 0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #6ec98b 0%, #55b576 100%)',
            boxShadow: '0 4px 20px rgba(95, 189, 125, 0.35)',
          },
        },
        outlined: ({ theme }) => ({
          borderColor: alpha(theme.palette.primary.main, 0.3),
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        }),
        sizeSmall: { minHeight: 36 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: 'none',
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: alpha(theme.palette.primary.main, 0.1),
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          borderRadius: 16,
        }),
      },
    },
  },
});
