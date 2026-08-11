import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Marker, TimelineSegment } from '../types';
import { formatIstTime } from '../utils/time';

const colors = {
  runtime: '#2fa99b',
  unplannedProduction: '#c7db39',
  unknownDowntime: '#ff7c61',
  stoppage: '#5a4ab0',
  minorStoppage: '#5a4ab0',
  axis: '#27303f',
  grid: '#e4e6eb',
  markerPass: '#2d6cdf',
  markerFail: '#1f2f92',
};

type DrawnMarker = Marker & { x: number; yPx: number };

type Props = {
  segments: TimelineSegment[];
  markers: Marker[];
  fromMs: number;
  toMs: number;
};

export function TimelineChart({ segments, markers, fromMs, toMs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawnRef = useRef<DrawnMarker[]>([]);
  const [size, setSize] = useState({ width: 1000, height: 430 });
  const [view, setView] = useState({ from: fromMs, to: toMs });
  const [drag, setDrag] = useState<{ startX: number; endX: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => setView({ from: fromMs, to: toMs }), [fromMs, toMs]);

  useEffect(() => {
    if (!wrapRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      setSize({ width, height: width < 700 ? 340 : 430 });
    });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  const visibleMarkers = useMemo(
    () => markers.filter((marker) => marker.tsMs >= view.from && marker.tsMs <= view.to),
    [markers, view],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const margin = { left: 52, right: 18, top: 34, bottom: 58 };
    const plotW = size.width - margin.left - margin.right;
    const plotH = size.height - margin.top - margin.bottom;
    const bandTop = margin.top + 18;
    const bandH = plotH - 38;
    const scaleX = (ms: number) => margin.left + ((ms - view.from) / (view.to - view.from)) * plotW;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.strokeStyle = '#d8dce4';
    ctx.strokeRect(margin.left, margin.top, plotW, plotH);

    segments.forEach((segment) => {
      if (segment.endMs < view.from || segment.startMs > view.to) return;
      const x = Math.max(margin.left, scaleX(segment.startMs));
      const right = Math.min(margin.left + plotW, scaleX(segment.endMs));
      const w = Math.max(1, right - x);
      ctx.fillStyle = colors[segment.kind];
      ctx.fillRect(x, bandTop, w, bandH);
      if (w > 38) {
        ctx.save();
        ctx.translate(x + w / 2, bandTop + 12);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px Inter, Segoe UI, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(segment.label.toUpperCase(), 0, 0, Math.max(40, bandH - 12));
        ctx.restore();
      }
    });

    const tickCount = size.width < 760 ? 5 : 8;
    ctx.fillStyle = '#586070';
    ctx.strokeStyle = colors.grid;
    ctx.font = '12px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= tickCount; i += 1) {
      const x = margin.left + (plotW / tickCount) * i;
      const ms = view.from + ((view.to - view.from) / tickCount) * i;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();
      ctx.fillText(formatIstTime(ms), x, size.height - 22);
    }

    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left + plotW, margin.top + plotH);
    ctx.stroke();
    ctx.fillStyle = '#697181';
    ctx.font = '12px Inter, Segoe UI, sans-serif';
    ctx.fillText('Shift time', margin.left + plotW / 2, size.height - 6);

    const drawn: DrawnMarker[] = [];
    const passColumns = new Set<number>();

    visibleMarkers.forEach((marker) => {
      const x = scaleX(marker.tsMs);
      const yPx = bandTop + bandH * marker.y;
      const isFail = marker.result === 'FAIL';
      const column = Math.round(x);
      if (!isFail && passColumns.has(column)) return;
      if (!isFail) passColumns.add(column);
      drawn.push({ ...marker, x, yPx });
      ctx.beginPath();
      ctx.arc(x, yPx, isFail ? 3.6 : 2.6, 0, Math.PI * 2);
      ctx.fillStyle = isFail ? colors.markerFail : colors.markerPass;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    drawnRef.current = drawn;

    if (drag) {
      const x = Math.min(drag.startX, drag.endX);
      const w = Math.abs(drag.endX - drag.startX);
      ctx.fillStyle = 'rgba(33, 49, 143, 0.15)';
      ctx.fillRect(x, margin.top, w, plotH);
      ctx.strokeStyle = 'rgba(33, 49, 143, 0.5)';
      ctx.strokeRect(x, margin.top, w, plotH);
    }
  }, [drag, segments, size, view, visibleMarkers]);

  function pointerX(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX - rect.left;
  }

  function xToMs(x: number) {
    const marginLeft = 52;
    const plotW = size.width - marginLeft - 18;
    const clamped = Math.max(marginLeft, Math.min(marginLeft + plotW, x));
    return view.from + ((clamped - marginLeft) / plotW) * (view.to - view.from);
  }

  return (
    <Box>
      <Stack direction="row" gap={1.5} justifyContent="flex-end" flexWrap="wrap" mb={1}>
        <Legend label="Runtime" color={colors.runtime} />
        <Legend label="Unplanned Production" color={colors.unplannedProduction} />
        <Legend label="Unknown Downtime" color={colors.unknownDowntime} />
        <Legend label="Stoppage" color={colors.stoppage} />
      </Stack>
      <Box ref={wrapRef} position="relative" border="1px solid #dcdfe5">
        <Typography position="absolute" top={12} left={10} variant="caption" color="text.secondary">
          Cumulative production
        </Typography>
        <canvas
          ref={canvasRef}
          onDoubleClick={() => setView({ from: fromMs, to: toMs })}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrag({ startX: pointerX(event), endX: pointerX(event) });
          }}
          onPointerMove={(event) => {
            const x = pointerX(event);
            if (drag) {
              setDrag({ ...drag, endX: x });
              return;
            }
            const nearest = drawnRef.current.reduce<DrawnMarker | null>((best, marker) => {
              const distance = Math.abs(marker.x - x);
              return distance < 8 && (!best || distance < Math.abs(best.x - x)) ? marker : best;
            }, null);
            setTooltip(nearest ? { x: nearest.x + 8, y: nearest.yPx - 18, text: nearest.label } : null);
          }}
          onPointerLeave={() => {
            setDrag(null);
            setTooltip(null);
          }}
          onPointerUp={() => {
            if (!drag) return;
            const span = Math.abs(drag.endX - drag.startX);
            if (span > 24) {
              const nextFrom = xToMs(Math.min(drag.startX, drag.endX));
              const nextTo = xToMs(Math.max(drag.startX, drag.endX));
              if (nextTo - nextFrom >= 60_000) setView({ from: nextFrom, to: nextTo });
            }
            setDrag(null);
          }}
        />
        {tooltip ? (
          <Box
            position="absolute"
            left={tooltip.x}
            top={tooltip.y}
            bgcolor="#17213a"
            color="#fff"
            px={1}
            py={0.5}
            borderRadius={1}
            fontSize={12}
            sx={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
          >
            {tooltip.text}
          </Box>
        ) : null}
      </Box>
      <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
        <Chip size="small" label="Shift + drag to zoom into a time range - double-click to reset" variant="outlined" />
        <Chip size="small" label="Canvas markers are thinned per pixel column; FAIL markers are always kept" variant="outlined" />
      </Stack>
    </Box>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <Box width={12} height={12} borderRadius={0.5} bgcolor={color} />
      <Typography variant="caption" fontWeight={700}>
        {label}
      </Typography>
    </Stack>
  );
}
