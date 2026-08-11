export type MesEnvelope<T> = {
  trace_id: string;
  status_code: number;
  message: string;
  data: T;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: string[];
  status?: string;
};

export type AssetNode = {
  id: string;
  name: string;
  codename?: string | null;
  assetlevel_id: number;
  children?: AssetNode[];
};

export type FlatAsset = {
  id: string;
  name: string;
  codename?: string | null;
  assetlevel_id: number;
  depth: number;
  path: string;
};

export type ShiftDefinition = {
  id: string;
  code: string;
  name: string;
  shift_timings: string[];
  is_active: boolean;
};

export type ShiftOption = {
  shiftId: string;
  label: string;
  start: string;
  end: string;
};

export type SegmentKind = 'runtime' | 'unplannedProduction' | 'unknownDowntime' | 'stoppage' | 'minorStoppage';

export type ApiSegment = {
  start_at: string;
  end_at: string;
  type?: string;
  runtime_name?: string | null;
  downtime_name?: string | null;
  stoppage_name?: string | null;
};

export type ProduceCount = {
  bucket_start: string;
  part_model_id: string;
  ok_count: number;
  ng_count: number;
};

export type Produce = {
  produce_id: string;
  first_seen_ts: string;
  result: 'PASS' | 'FAIL' | string;
  produce_type: string;
  part_model_id: string;
};

export type ProduceBucket = {
  bucket_start: string;
  part_model_id: string;
  produces: Produce[];
};

export type MachineIntervals = {
  machine_ids: number[];
  runtimes: ApiSegment[];
  downtimes: ApiSegment[];
  stoppages: ApiSegment[];
  produce_counts: ProduceCount[];
  produces?: ProduceBucket[];
};

export type CycleTimeBucket = {
  bucket_start: string;
  ideal_cycle_time_seconds: number | null;
  actual_cycle_time_seconds: number | null;
};

export type AnalyticsRequest = {
  entity_scope: {
    type: 'asset';
    asset: {
      asset_id: string;
      asset_level_id: number;
    };
  };
  time_range: {
    from_ts: string;
    to_ts: string;
  };
};

export type HourBucket = {
  key: string;
  label: string;
  startMs: number;
  endMs: number;
  elapsed: boolean;
};

export type HourSummary = {
  total: Array<number | null>;
  pass: Array<number | null>;
  fail: Array<number | null>;
  runtime: Array<number | null>;
  unplannedProduction: Array<number | null>;
  stoppage: Array<number | null>;
  unknownDowntime: Array<number | null>;
  idealCycleTime: Array<number | null>;
  actualCycleTime: Array<number | null>;
};

export type TimelineSegment = {
  startMs: number;
  endMs: number;
  kind: SegmentKind;
  label: string;
};

export type Marker = {
  tsMs: number;
  y: number;
  result: 'PASS' | 'FAIL' | string;
  label: string;
};
