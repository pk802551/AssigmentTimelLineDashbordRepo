import { FormEvent, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import TimelineIcon from '@mui/icons-material/Timeline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import KeyIcon from '@mui/icons-material/Key';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('analytics_user');
  const [password, setPassword] = useState('dashboard123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const heroBg = `${import.meta.env.BASE_URL}factory_analytics_hero.jpg`;
  const lineBg = `${import.meta.env.BASE_URL}industrial_line_timeline.jpg`;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      await login(u, p);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid username or password.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleQuickFill = () => {
    setUsername('analytics_user');
    setPassword('dashboard123');
    setError('');
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        background: 'linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #0b132b 100%)',
        py: { xs: 3, md: 6 },
        px: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#ffffff',
          }}
        >
          <Box
            sx={{
              flex: { md: 1.1 },
              background: 'linear-gradient(145deg, #0a1128 0%, #101f42 100%)',
              color: '#ffffff',
              p: { xs: 3.5, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -100,
                left: -100,
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(47, 169, 155, 0.3) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            <Box position="relative" zIndex={2}>
              <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 44,
                    height: 44,
                    boxShadow: '0 4px 14px rgba(45, 108, 223, 0.4)',
                  }}
                >
                  <TimelineIcon fontSize="medium" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800} letterSpacing={0.5} sx={{ color: '#ffffff' }}>
                    SMART MES
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    Industrial Machine Timeline Analytics
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box position="relative" zIndex={2} my={{ xs: 3, md: 4 }}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)',
                  transition: 'transform 0.4s ease',
                  '&:hover': {
                    transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={heroBg}
                  alt="Dashboard Preview"
                  sx={{
                    width: '100%',
                    height: { xs: 180, sm: 220, md: 240 },
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(10, 17, 40, 0.85) 0%, transparent 60%)',
                  }}
                />
                <Chip
                  icon={<SpeedIcon sx={{ color: '#2fa99b !important' }} />}
                  label="10,000+ Canvas Data Points"
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    bgcolor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1.5,
                  mt: 2.5,
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Box
                  component="img"
                  src={lineBg}
                  alt="Line Monitoring"
                  sx={{
                    width: 64,
                    height: 48,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                  }}
                />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#f8fafc' }}>
                    Live Line Inspection
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Shift runtimes, downtimes & PASS/FAIL tracking
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Stack direction="row" gap={2} flexWrap="wrap" position="relative" zIndex={2}>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <PrecisionManufacturingIcon sx={{ color: '#2fa99b', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                  Machine Interval Tiling
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <TimelineIcon sx={{ color: '#38bdf8', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                  Hourly Cycle Time Metrics
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              flex: { md: 0.9 },
              p: { xs: 3.5, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              bgcolor: '#ffffff',
            }}
          >
            <Stack component="form" spacing={3} onSubmit={handleSubmit}>
              <Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  Sign In
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.75}>
                  Enter your credentials to access the Timeline Dashboard.
                </Typography>
              </Box>

              {error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              ) : null}

              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                fullWidth
                variant="outlined"
                placeholder="analytics_user"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((prev) => !prev)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 6px 20px rgba(31, 47, 146, 0.3)',
                }}
              >
                {loading ? 'Signing in...' : 'Sign in to Dashboard'}
              </Button>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: '#f8fafc',
                  borderColor: '#e2e8f0',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" gap={1}>
                    <KeyIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="text.primary" display="block">
                        Test Credentials
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        User: <strong>analytics_user</strong> | Pass: <strong>dashboard123</strong>
                      </Typography>
                    </Box>
                  </Stack>
                  <Button size="small" variant="text" onClick={handleQuickFill} sx={{ fontWeight: 700 }}>
                    Auto Fill
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}


