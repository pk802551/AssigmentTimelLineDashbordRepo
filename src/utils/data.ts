import type {
  ApiSegment,
  AssetNode,
  CycleTimeBucket,
  FlatAsset,
  HourBucket,
  HourSummary,
  MachineIntervals,
  Marker,
  SegmentKind,
  TimelineSegment,
} from '../types';
import { formatIstDateTime } from './time';

export function flattenAssets(nodes: AssetNode[], depth = 0, parentPath = ''): FlatAsset[] {
  return nodes.flatMap((node) => {
    const label = node.codename ? `${node.name} (${node.codename})` : node.name;
    const path = parentPath ? `${parentPath} / ${label}` : label;
    return [
      { id: node.id, name: node.name, codename: node.codename, assetlevel_id: node.assetlevel_id, depth, path },
      ...flattenAssets(node.children ?? [], depth + 1, path),
    ];
  });
}

function runtimeKind(segment: ApiSegment): SegmentKind {
  return segment.type === 'unknown unplanned production' ? 'unplannedProduction' : 'runtime';
}

function downtimeKind(segment: ApiSegment): SegmentKind {
  if (segment.type === 'minor stoppage') return 'minorStoppage';
  return 'unknownDowntime';
}

export function buildTimelineSegments(data: MachineIntervals): TimelineSegment[] {
  const mapSegment = (segment: ApiSegment, kind: SegmentKind, fallback: string): TimelineSegment => ({
    startMs: Date.parse(segment.start_at),
    endMs: Date.parse(segment.end_at),
    kind,
    label: segment.runtime_name ?? segment.downtime_name ?? segment.stoppage_name ?? segment.type ?? fallback,
  });

  return [
    ...data.runtimes.map((segment) => mapSegment(segment, runtimeKind(segment), 'runtime')),
    ...data.downtimes.map((segment) => mapSegment(segment, downtimeKind(segment), 'unknown')),
    ...data.stoppages.map((segment) => mapSegment(segment, 'stoppage', 'stoppage')),
  ].sort((a, b) => a.startMs - b.startMs);
}

export function buildMarkers(data: MachineIntervals, exact: boolean): Marker[] {
  if (exact && data.produces) {
    return data.produces
      .flatMap((bucket) => bucket.produces)
      .map((produce) => ({
        tsMs: Date.parse(produce.first_seen_ts),
        result: produce.result,
        y: produce.result === 'FAIL' ? 0.3 : 0.72,
        label: `${produce.result} ${formatIstDateTime(Date.parse(produce.first_seen_ts))}`,
      }))
      .sort((a, b) => a.tsMs - b.tsMs);
  }

  return data.produce_counts
    .flatMap((bucket) => {
      const total = (bucket.ok_count ?? 0) + (bucket.ng_count ?? 0);
      if (total === 0) return [];
      const base = Date.parse(bucket.bucket_start);
      const markers: Marker[] = [
        {
          tsMs: base + 30 * 60 * 1000,
          result: bucket.ng_count > 0 ? 'FAIL' : 'PASS',
          y: 0.52,
          label: `${bucket.ok_count} PASS / ${bucket.ng_count} FAIL`,
        },
      ];
      return markers;
    })
    .sort((a, b) => a.tsMs - b.tsMs);
}

export function latestProduceMs(data: MachineIntervals) {
  const exactLatest = data.produces
    ?.flatMap((bucket) => bucket.produces)
    .reduce<number | null>((latest, produce) => Math.max(latest ?? 0, Date.parse(produce.first_seen_ts)), null);

  if (exactLatest) return exactLatest;

  return data.produce_counts.reduce<number | null>((latest, bucket) => {
    const total = bucket.ok_count + bucket.ng_count;
    return total > 0 ? Math.max(latest ?? 0, Date.parse(bucket.bucket_start) + 60 * 60 * 1000) : latest;
  }, null);
}

function emptySummary(length: number): HourSummary {
  const zeros = () => Array.from({ length }, () => 0);
  return {
    total: zeros(),
    pass: zeros(),
    fail: zeros(),
    runtime: zeros(),
    unplannedProduction: zeros(),
    stoppage: zeros(),
    unknownDowntime: zeros(),
    idealCycleTime: Array.from({ length }, () => null),
    actualCycleTime: Array.from({ length }, () => null),
  };
}

function addSegmentMinutes(values: Array<number | null>, buckets: HourBucket[], segment: TimelineSegment) {
  buckets.forEach((bucket, index) => {
    if (!bucket.elapsed) {
      values[index] = null;
      return;
    }
    const overlapStart = Math.max(bucket.startMs, segment.startMs);
    const overlapEnd = Math.min(bucket.endMs, segment.endMs, Date.now());
    if (overlapEnd > overlapStart) {
      values[index] = (values[index] ?? 0) + (overlapEnd - overlapStart) / 60000;
    }
  });
}

function findBucketIndex(buckets: HourBucket[], timestamp: string) {
  const ms = Date.parse(timestamp);
  return buckets.findIndex((bucket) => ms >= bucket.startMs && ms < bucket.endMs);
}

export function buildHourSummary(
  buckets: HourBucket[],
  intervals: MachineIntervals,
  cycleTimes: CycleTimeBucket[],
): HourSummary {
  const summary = emptySummary(buckets.length);

  buckets.forEach((bucket, index) => {
    if (!bucket.elapsed) {
      summary.total[index] = null;
      summary.pass[index] = null;
      summary.fail[index] = null;
      summary.runtime[index] = null;
      summary.unplannedProduction[index] = null;
      summary.stoppage[index] = null;
      summary.unknownDowntime[index] = null;
    }
  });

  intervals.produce_counts.forEach((count) => {
    const index = findBucketIndex(buckets, count.bucket_start);
    if (index < 0 || !buckets[index].elapsed) return;
    summary.pass[index] = (summary.pass[index] ?? 0) + count.ok_count;
    summary.fail[index] = (summary.fail[index] ?? 0) + count.ng_count;
    summary.total[index] = (summary.total[index] ?? 0) + count.ok_count + count.ng_count;
  });

  buildTimelineSegments(intervals).forEach((segment) => {
    if (segment.kind === 'runtime') addSegmentMinutes(summary.runtime, buckets, segment);
    if (segment.kind === 'unplannedProduction') addSegmentMinutes(summary.unplannedProduction, buckets, segment);
    if (segment.kind === 'stoppage' || segment.kind === 'minorStoppage') addSegmentMinutes(summary.stoppage, buckets, segment);
    if (segment.kind === 'unknownDowntime') addSegmentMinutes(summary.unknownDowntime, buckets, segment);
  });

  cycleTimes.forEach((bucket) => {
    const index = findBucketIndex(buckets, bucket.bucket_start);
    if (index < 0 || !buckets[index].elapsed) return;
    summary.idealCycleTime[index] = bucket.ideal_cycle_time_seconds;
    summary.actualCycleTime[index] = bucket.actual_cycle_time_seconds;
  });

  return summary;
}

export function unknownSegmentStats(segments: TimelineSegment[]) {
  return segments.reduce(
    (acc, segment) => {
      if (segment.kind === 'unknownDowntime') {
        acc.count += 1;
        acc.minutes += (segment.endMs - segment.startMs) / 60000;
      }
      return acc;
    },
    { count: 0, minutes: 0 },
  );
}
