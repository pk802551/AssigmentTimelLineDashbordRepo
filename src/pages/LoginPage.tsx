import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('analytics_user');
  const [password, setPassword] = useState('dashboard123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Invalid username or password.'
          : err instanceof Error
            ? err.message
            : 'Login failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center', px: 2, background: '#eef1f6' }}>
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Timeline Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.75}>
              Sign in to view production history.
            </Typography>
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
