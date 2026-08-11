import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { HourBucket, HourSummary } from '../types';
import { formatDurationMinutes, formatSeconds } from '../utils/time';

type Row = {
  label: string;
  values: Array<number | null>;
  format?: (value: number | null) => string | number;
};

export function SummaryTable({ buckets, summary }: { buckets: HourBucket[]; summary: HourSummary }) {
  const rows: Row[] = [
    { label: 'Total', values: summary.total },
    { label: 'Pass', values: summary.pass },
    { label: 'Fail', values: summary.fail },
    { label: 'Runtime', values: summary.runtime, format: formatDurationMinutes },
    { label: 'Unplanned Production', values: summary.unplannedProduction, format: formatDurationMinutes },
    { label: 'Stoppage', values: summary.stoppage, format: formatDurationMinutes },
    { label: 'Unknown Downtime', values: summary.unknownDowntime, format: formatDurationMinutes },
    { label: 'Ideal Cycle Time', values: summary.idealCycleTime, format: formatSeconds },
    { label: 'Actual Cycle Time', values: summary.actualCycleTime, format: formatSeconds },
  ];

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden' }}>
      <Typography variant="h6" fontWeight={800} px={2} py={1.75}>
        Hourly Production & Downtime Summary
      </Typography>
      <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, minWidth: 210 }}>Param</TableCell>
              {buckets.map((bucket) => (
                <TableCell key={bucket.key} align="center" sx={{ fontWeight: 800, color: 'primary.main', minWidth: 130 }}>
                  {bucket.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{row.label}</TableCell>
                {row.values.map((value, index) => (
                  <TableCell key={`${row.label}-${buckets[index]?.key}`} align="center" sx={{ fontWeight: 700 }}>
                    {row.format ? row.format(value) : value === null ? '' : value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
