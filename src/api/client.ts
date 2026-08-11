import authLoginFixture from '../fixtures/sample-auth-login.json';
import authLogoutFixture from '../fixtures/sample-auth-logout.json';
import authMeFixture from '../fixtures/sample-auth-me.json';
import error401Fixture from '../fixtures/sample-error-401.json';
import assetsFixture from '../fixtures/sample-assets-tree.json';
import shiftsFixture from '../fixtures/sample-shifts.json';
import intervalsFixture from '../fixtures/sample-machine-intervals.json';
import cycleTimeFixture from '../fixtures/sample-analytics-query-cycle-time.json';
import { API_BASE_URL, TOKEN_STORAGE_KEY, USE_FIXTURES } from '../config';
import type {
  AnalyticsRequest,
  AssetNode,
  CycleTimeBucket,
  LoginResponse,
  MachineIntervals,
  MesEnvelope,
  ShiftDefinition,
  User,
} from '../types';

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function fixtureData<T>(fixture: MesEnvelope<T> & { note_for_candidate?: string }) {
  return fixture.data;
}

async function fixtureRequest<T>(data: T) {
  await wait(150);
  return data;
}

function fixtureUnauthorized(): never {
  throw new ApiError(error401Fixture.message, error401Fixture.status_code, error401Fixture);
}

async function request<T>(path: string, options: RequestInit = {}, retry = 0): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  let body: MesEnvelope<T> | Record<string, unknown> | null = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const envelope = body as MesEnvelope<T> | null;
  const status = envelope?.status_code ?? response.status;
  const message = envelope?.message ?? response.statusText;

  if (!response.ok || status >= 400) {
    if (status >= 500 && retry < 2) {
      await wait(400 * 2 ** retry);
      return request<T>(path, options, retry + 1);
    }
    if (status === 401 && path !== '/auth/login') {
      clearStoredToken();
      onUnauthorized?.();
    }
    throw new ApiError(message || 'Request failed', status, body);
  }

  return (envelope && 'data' in envelope ? envelope.data : body) as T;
}

export const api = {
  login: (username: string, password: string) => {
    if (USE_FIXTURES) {
      if (username === 'analytics_user' && password === 'dashboard123') {
        return fixtureRequest(fixtureData<LoginResponse>(authLoginFixture));
      }
      return Promise.reject(new ApiError('Invalid username or password.', 401, error401Fixture));
    }
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  me: () => {
    if (USE_FIXTURES) {
      return getStoredToken() ? fixtureRequest(fixtureData<User>(authMeFixture)) : Promise.reject(fixtureUnauthorized());
    }
    return request<User>('/auth/me');
  },
  logout: () => {
    if (USE_FIXTURES) {
      return fixtureRequest(fixtureData<null>(authLogoutFixture));
    }
    return request('/auth/logout', { method: 'POST' });
  },
  assets: () => {
    if (USE_FIXTURES) {
      return fixtureRequest(fixtureData<AssetNode[]>(assetsFixture));
    }
    return request<AssetNode[]>('/core/assets/tree');
  },
  shifts: () => {
    if (USE_FIXTURES) {
      return fixtureRequest(fixtureData<ShiftDefinition[]>(shiftsFixture));
    }
    return request<ShiftDefinition[]>('/core/shifts');
  },
  machineIntervals: (_payload: AnalyticsRequest & {
    produce_counts: true;
    exact_produces: boolean;
    group_produce_counts_by_part_model: true;
  }) => {
    if (USE_FIXTURES) {
      return fixtureRequest(fixtureData<MachineIntervals>(intervalsFixture));
    }
    return request<MachineIntervals>('/analytics-query/machine-intervals', {
      method: 'POST',
      body: JSON.stringify(_payload),
    });
  },
  cycleTimes: (_payload: AnalyticsRequest & { metrics: string[]; distribution: 'hourly' }) => {
    if (USE_FIXTURES) {
      return fixtureRequest(fixtureData<CycleTimeBucket[]>(cycleTimeFixture));
    }
    return request<CycleTimeBucket[]>('/analytics-query', {
      method: 'POST',
      body: JSON.stringify(_payload),
    });
  },
};

export { ApiError };
