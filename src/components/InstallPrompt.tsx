import { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, alpha, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const theme = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem('install-prompt-dismissed');
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
    }

    // Pick up event if it fired before React mounted
    const globalPrompt = (window as Window & { __pwa_deferred_prompt?: BeforeInstallPromptEvent }).__pwa_deferred_prompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
      (window as Window & { __pwa_deferred_prompt?: BeforeInstallPromptEvent }).__pwa_deferred_prompt = undefined;
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', String(Date.now()));
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <Box
      className="animate-slide-up"
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        p: 2,
        borderRadius: 3,
        bgcolor: alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <GetAppIcon color="primary" />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Install SpadesKeeper
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Add to your home screen for quick access
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        onClick={handleInstall}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Install
      </Button>
      <IconButton size="small" onClick={handleDismiss} sx={{ ml: -0.5 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
