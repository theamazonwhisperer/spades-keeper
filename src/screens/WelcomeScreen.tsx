import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import { useAuthStore } from '../store/authStore';

export default function WelcomeScreen() {
  const theme = useTheme();
  const { signInWithGoogle, continueAsGuest, isBlocked } = useAuthStore();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(160deg, #0e1117 0%, #162230 50%, #0e1117 100%)`
            : `linear-gradient(160deg, #f0f3f6 0%, #d6eadf 50%, #f0f3f6 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      {/* Hero */}
      <Box className="animate-fade-in" sx={{ textAlign: 'center', mb: 5 }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '5rem', sm: '6rem' },
            lineHeight: 1,
            mb: 1,
            filter: 'drop-shadow(0 4px 16px rgba(95, 189, 125, 0.3))',
          }}
        >
          &#9824;
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: theme.palette.primary.main, mb: 0.5, letterSpacing: '-0.02em' }}
        >
          SpadesKeeper
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Beautiful scorekeeper for Spades
        </Typography>
      </Box>

      {/* Blocked notice */}
      {isBlocked && (
        <Box className="animate-slide-up" sx={{ width: '100%', maxWidth: 360, mb: 3 }}>
          <Card sx={{ bgcolor: alpha(theme.palette.error.main, 0.08), border: `1px solid ${alpha(theme.palette.error.main, 0.4)}` }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <BlockIcon sx={{ color: theme.palette.error.main, fontSize: 20, mt: 0.25 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.error.main, mb: 0.25 }}>
                  Access restricted
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your account has been blocked. Please contact the app owner if you think this is an error.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Sign in options */}
      <Box className="animate-slide-up" sx={{ width: '100%', maxWidth: 360 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={signInWithGoogle}
          sx={{
            py: 1.8,
            fontSize: '1.05rem',
            minHeight: 56,
            mb: 2,
          }}
        >
          Sign in with Google
        </Button>

        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<PersonOutlineIcon />}
          onClick={continueAsGuest}
          sx={{
            py: 1.6,
            fontSize: '1rem',
            minHeight: 56,
            mb: 3,
          }}
        >
          Continue as Guest
        </Button>

        <Card sx={{ bgcolor: alpha(theme.palette.warning.main, 0.08), border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20, mt: 0.25 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.warning.main, mb: 0.25 }}>
                Guest mode uses local storage only
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Your games are saved on this device. If you clear your browser data or switch phones, your data will be lost. Sign in with Google to sync across devices.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
