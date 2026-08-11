import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../api/client';
import { SummaryTable } from '../components/SummaryTable';
import { TimelineChart } from '../components/TimelineChart';
import { useAuth } from '../state/AuthContext';
import type { CycleTimeBucket, FlatAsset, MachineIntervals, ShiftOption } from '../types';
import { buildMarkers, buildTimelineSegments, flattenAssets, latestProduceMs, unknownSegmentStats } from '../utils/data';
import { buildHourBuckets, buildShiftOptions, buildShiftWindow, formatIstDateTime } from '../utils/time';
import { buildHourSummary } from '../utils/data';

const defaultDate = '2026-06-23';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [assets, setAssets] = useState<FlatAsset[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedShiftKey, setSelectedShiftKey] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [showIndividual, setShowIndividual] = useState(false);
  const [intervals, setIntervals] = useState<MachineIntervals | null>(null);
  const [cycleTimes, setCycleTimes] = useState<CycleTimeBucket[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      setError('');
      try {
        const [assetTree, shifts] = await Promise.all([api.assets(), api.shifts()]);
        if (cancelled) return;
        const flatAssets = flattenAssets(assetTree);
        const options = buildShiftOptions(shifts);
        setAssets(flatAssets);
        setShiftOptions(options);
        setSelectedAssetId(flatAssets.find((asset) => asset.assetlevel_id <= 20)?.id ?? flatAssets[0]?.id ?? '');
        setSelectedShiftKey(options[0] ? shiftKey(options[0]) : '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load filters.');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  const selectedShift = useMemo(
    () => shiftOptions.find((option) => shiftKey(option) === selectedShiftKey) ?? null,
    [selectedShiftKey, shiftOptions],
  );

  const windowRange = useMemo(() => {
    if (!selectedShift) return null;
    return buildShiftWindow(date, selectedShift);
  }, [date, selectedShift]);

  const loadData = useCallback(async () => {
    if (!selectedAsset || !windowRange) return;
    setLoadingData(true);
    setError('');
    const basePayload = {
      entity_scope: {
        type: 'asset' as const,
        asset: { asset_id: selectedAsset.id, asset_level_id: selectedAsset.assetlevel_id },
      },
      time_range: { from_ts: windowRange.from_ts, to_ts: windowRange.to_ts },
    };

    try {
      const [intervalResponse, cycleResponse] = await Promise.all([
        api.machineIntervals({
          ...basePayload,
          produce_counts: true,
          exact_produces: showIndividual,
          group_produce_counts_by_part_model: true,
        }),
        api.cycleTimes({
          ...basePayload,
          metrics: ['ideal_cycle_time_seconds', 'actual_cycle_time_seconds'],
          distribution: 'hourly',
        }),
      ]);
      setIntervals(intervalResponse);
      setCycleTimes(cycleResponse);
    } catch (err) {
      setIntervals(null);
      setCycleTimes([]);
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoadingData(false);
    }
  }, [selectedAsset, showIndividual, windowRange]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const segments = useMemo(() => (intervals ? buildTimelineSegments(intervals) : []), [intervals]);
  const markers = useMemo(() => (intervals ? buildMarkers(intervals, showIndividual) : []), [intervals, showIndividual]);
  const hourBuckets = useMemo(
    () => (windowRange ? buildHourBuckets(windowRange.fromMs, windowRange.toMs) : []),
    [windowRange],
  );
  const summary = useMemo(
    () => (intervals ? buildHourSummary(hourBuckets, intervals, cycleTimes) : null),
    [cycleTimes, hourBuckets, intervals],
  );
  const unknownStats = useMemo(() => unknownSegmentStats(segments), [segments]);
  const latestProduce = intervals ? latestProduceMs(intervals) : null;

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={900}>
              Timeline Dashboard
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {user?.name}
          </Typography>
          <Tooltip title="Logout">
            <IconButton onClick={logout} color="primary">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Stack spacing={2.25} p={{ xs: 1.5, md: 2.5 }}>
        <Paper elevation={2} sx={{ p: 2.25 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ xs: 'stretch', lg: 'center' }} gap={1.5}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Asset Level</InputLabel>
              <Select label="Asset Level" value="all" disabled>
                <MenuItem value="all">All Levels</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 330 } }} disabled={loadingMeta}>
              <InputLabel>Asset</InputLabel>
              <Select
                label="Asset"
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.target.value)}
              >
                {assets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    <Box component="span" sx={{ pl: asset.depth * 1.5 }}>
                      {asset.codename ?? asset.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }} disabled>
              <InputLabel>Machine (optional)</InputLabel>
              <Select label="Machine (optional)" value="none">
                <MenuItem value="none">-</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            />
            <FormControl size="small" sx={{ minWidth: 240 }} disabled={loadingMeta}>
              <InputLabel>Shift</InputLabel>
              <Select
                label="Shift"
                value={selectedShiftKey}
                onChange={(event) => setSelectedShiftKey(event.target.value)}
              >
                {shiftOptions.map((option) => (
                  <MenuItem key={shiftKey(option)} value={shiftKey(option)}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box flex={1} />
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2">Show Individual produces</Typography>
              <Switch checked={showIndividual} onChange={(event) => setShowIndividual(event.target.checked)} />
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingData}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
            {selectedAsset ? <Chip size="small" color="primary" label={selectedAsset.codename ?? selectedAsset.name} /> : null}
            {windowRange ? (
              <Chip
                size="small"
                label={`${formatIstDateTime(windowRange.fromMs)} - ${formatIstDateTime(windowRange.toMs)}`}
              />
            ) : null}
            <Chip size="small" label="Part model: grouped by API" />
          </Stack>
        </Paper>

        {error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => setRefreshKey((value) => value + 1)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        <Paper elevation={2} sx={{ p: 2.25, minHeight: 520 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1} mb={1.5}>
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight={900}>
                Production History
              </Typography>
              <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  Markers: {showIndividual ? `${markers.length.toLocaleString()} individual produces` : 'hourly totals'}
                </Typography>
              </Stack>
            </Box>
            {loadingData ? <CircularProgress size={26} /> : null}
          </Stack>

          {loadingMeta || (loadingData && !intervals) ? (
            <Box minHeight={360} display="grid" sx={{ placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : intervals && windowRange ? (
            <>
              <TimelineChart segments={segments} markers={markers} fromMs={windowRange.fromMs} toMs={windowRange.toMs} />
              <Stack direction="row" gap={1} flexWrap="wrap" mt={1.25}>
                {latestProduce ? (
                  <Chip
                    variant="outlined"
                    color="primary"
                    sx={{ fontWeight: 800 }}
                    label={`Last observed produce at: ${formatIstDateTime(latestProduce)}`}
                  />
                ) : null}
                {unknownStats.count > 0 ? (
                  <Chip
                    variant="outlined"
                    color="warning"
                    sx={{ fontWeight: 800 }}
                    label={`${unknownStats.count} unknown segments - ${unknownStats.minutes.toFixed(1)} min`}
                  />
                ) : null}
              </Stack>
            </>
          ) : (
            <Box minHeight={360} display="grid" sx={{ placeItems: 'center' }}>
              <Typography color="text.secondary">No data for this shift.</Typography>
            </Box>
          )}
        </Paper>

        {summary ? <SummaryTable buckets={hourBuckets} summary={summary} /> : null}
      </Stack>
    </Box>
  );
}

function shiftKey(option: ShiftOption) {
  return `${option.shiftId}:${option.start}:${option.end}`;
}
