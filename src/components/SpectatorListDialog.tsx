import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Switch,
  Divider,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import {
  getSpectators,
  setSpectatorEditorAccess,
  subscribeToSpectators,
} from '../lib/cloudSync';
import { useAuthStore } from '../store/authStore';
import { SpectatorInfo } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function isActive(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < ACTIVE_THRESHOLD_MS;
}

export default function SpectatorListDialog({ open, onClose }: Props) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [spectators, setSpectators] = useState<SpectatorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;

    setLoading(true);
    getSpectators(user.id).then(s => {
      setSpectators(s);
      setLoading(false);
    });

    const unsub = subscribeToSpectators(user.id, setSpectators);
    return () => unsub();
  }, [open, user]);

  const handleToggleEditor = async (s: SpectatorInfo) => {
    if (!user) return;
    setToggling(s.spectatorUserId);
    await setSpectatorEditorAccess(user.id, s.spectatorUserId, !s.isEditor);
    setToggling(null);
  };

  const activeSpectators = spectators.filter(s => isActive(s.lastSeen));
  const recentSpectators = spectators.filter(s => !isActive(s.lastSeen));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon fontSize="small" color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Spectators</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Logged-in users currently watching. Grant edit access to let them score.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : activeSpectators.length === 0 && recentSpectators.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No logged-in spectators yet. Share your watch link to invite people.
          </Typography>
        ) : (
          <>
            {activeSpectators.length > 0 && (
              <>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
                  Active Now
                </Typography>
                {activeSpectators.map(s => (
                  <SpectatorRow
                    key={s.spectatorUserId}
                    spectator={s}
                    toggling={toggling === s.spectatorUserId}
                    onToggle={() => handleToggleEditor(s)}
                    theme={theme}
                    active
                  />
                ))}
              </>
            )}
            {recentSpectators.length > 0 && (
              <>
                {activeSpectators.length > 0 && <Divider sx={{ my: 1.5 }} />}
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
                  Recently Watched
                </Typography>
                {recentSpectators.map(s => (
                  <SpectatorRow
                    key={s.spectatorUserId}
                    spectator={s}
                    toggling={toggling === s.spectatorUserId}
                    onToggle={() => handleToggleEditor(s)}
                    theme={theme}
                    active={false}
                  />
                ))}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function SpectatorRow({
  spectator,
  toggling,
  onToggle,
  theme,
  active,
}: {
  spectator: SpectatorInfo;
  toggling: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
  active: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1,
        px: 1.5,
        mb: 0.5,
        borderRadius: 1.5,
        bgcolor: spectator.isEditor
          ? alpha(theme.palette.primary.main, 0.08)
          : alpha(theme.palette.text.secondary, 0.05),
        border: spectator.isEditor
          ? `1px solid ${alpha(theme.palette.primary.main, 0.25)}`
          : '1px solid transparent',
      }}
    >
      {/* Activity indicator */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: active ? 'success.main' : alpha(theme.palette.text.secondary, 0.3),
          flexShrink: 0,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {spectator.displayName || 'Unknown'}
        </Typography>
        {spectator.isEditor && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <EditIcon sx={{ fontSize: 11, color: 'primary.main' }} />
            <Typography variant="caption" color="primary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
              Can edit
            </Typography>
          </Box>
        )}
      </Box>

      {toggling ? (
        <CircularProgress size={18} />
      ) : (
        <Switch
          checked={spectator.isEditor}
          onChange={onToggle}
          size="small"
          color="primary"
        />
      )}
    </Box>
  );
}
