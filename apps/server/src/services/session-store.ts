/**
 * session-store.ts -In-memory caches for responses, pending sessions, and hot clusters.
 * Ported from docs/main.py lines 98-150.
 */

import { CACHE_TTL, SESSION_TTL, CACHE_MAX } from "../utils/medical-prompts.js";

// ─── Response Cache (LRU-ish with TTL) ───────────────────────────────────────

interface CacheEntry {
  response: string;
  confidence: number;
  ts: number;       // Date.now() / 1000
  cached_at: string; // ISO string
}

const _responseCache = new Map<string, CacheEntry>();
const _cacheOrder: string[] = []; // track insertion order for LRU eviction

export function cacheGet(key: string): CacheEntry | null {
  const entry = _responseCache.get(key);
  if (!entry) return null;
  if (Date.now() / 1000 - entry.ts > CACHE_TTL) {
    _responseCache.delete(key);
    const idx = _cacheOrder.indexOf(key);
    if (idx !== -1) _cacheOrder.splice(idx, 1);
    return null;
  }
  // Move to end (most recently used)
  const idx = _cacheOrder.indexOf(key);
  if (idx !== -1) _cacheOrder.splice(idx, 1);
  _cacheOrder.push(key);
  return entry;
}

export function cacheSet(key: string, response: string, confidence: number): void {
  _responseCache.set(key, {
    response,
    confidence,
    ts: Date.now() / 1000,
    cached_at: new Date().toISOString(),
  });
  const idx = _cacheOrder.indexOf(key);
  if (idx !== -1) _cacheOrder.splice(idx, 1);
  _cacheOrder.push(key);
  // Evict oldest if over max
  while (_responseCache.size > CACHE_MAX && _cacheOrder.length > 0) {
    const oldest = _cacheOrder.shift()!;
    _responseCache.delete(oldest);
  }
}

// ─── Pending Sessions (doctor-review) ────────────────────────────────────────

interface SessionEntry {
  [key: string]: any;
  expires_at: number;
}

const _pendingSessions = new Map<string, SessionEntry>();

export function sessionStore(sessionId: string, data: Record<string, any>): void {
  _pendingSessions.set(sessionId, { ...data, expires_at: Date.now() / 1000 + SESSION_TTL });
}

export function sessionGet(sessionId: string): SessionEntry | null {
  const entry = _pendingSessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() / 1000 > entry.expires_at) {
    _pendingSessions.delete(sessionId);
    return null;
  }
  return entry;
}

export function sessionClear(sessionId: string): void {
  _pendingSessions.delete(sessionId);
}

// ─── Hot Clusters ────────────────────────────────────────────────────────────

const _hotClusters = new Map<string, number>();

export function hotClusterInc(key: string): void {
  _hotClusters.set(key, (_hotClusters.get(key) ?? 0) + 1);
}

// ─── Accessors (for health / debug endpoints) ────────────────────────────────

export function getPendingSessions(): Array<{
  session_id: string;
  disease_count: number;
  expires_in_s: number;
  data_source: string;
}> {
  const now = Date.now() / 1000;
  const result: Array<{
    session_id: string;
    disease_count: number;
    expires_in_s: number;
    data_source: string;
  }> = [];
  for (const [sid, d] of _pendingSessions) {
    if (now < d.expires_at) {
      result.push({
        session_id: sid,
        disease_count: (d.all_diseases as any[] | undefined)?.length ?? 0,
        expires_in_s: Math.floor(d.expires_at - now),
        data_source: (d.data_source as string) ?? "",
      });
    }
  }
  return result;
}

export function getHotClusters(topN = 10): Array<{ hash: string; query_count: number }> {
  return [..._hotClusters.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([hash, query_count]) => ({ hash, query_count }));
}

export function getCacheSize(): number {
  return _responseCache.size;
}
