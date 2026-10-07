import { api } from './api';
import type { DnsRecord, RecordList, RecordType } from './types';

export interface RecordQuery {
  search?: string;
  types?: string[];
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface RecordInput {
  name: string;
  type: RecordType;
  ttl: number;
  values: string[];
  alias_target: {
    dns_name: string;
    hosted_zone_id: string | null;
    evaluate_target_health: boolean;
  } | null;
}

export interface BulkDeleteResult {
  deleted: number[];
  skipped: { id: number; reason: string }[];
}

const base = (zoneId: string) => `/hosted-zones/${zoneId}/records`;

export function listRecords(zoneId: string, q: RecordQuery) {
  const p = new URLSearchParams({
    sort: q.sort,
    order: q.order,
    page: String(q.page),
    page_size: String(q.pageSize),
  });
  if (q.search) p.set('search', q.search);
  q.types?.forEach((t) => p.append('type', t)); // repeatable: ?type=A&type=TXT
  return api.get<RecordList>(`${base(zoneId)}?${p.toString()}`);
}

export const getRecord = (zoneId: string, id: number) =>
  api.get<DnsRecord>(`${base(zoneId)}/${id}`);

export const createRecord = (zoneId: string, body: RecordInput) =>
  api.post<DnsRecord>(base(zoneId), body);

export const updateRecord = (zoneId: string, id: number, body: RecordInput) =>
  api.put<DnsRecord>(`${base(zoneId)}/${id}`, body);

export const bulkDeleteRecords = (zoneId: string, ids: number[]) =>
  api.post<BulkDeleteResult>(`${base(zoneId)}/bulk-delete`, { ids });