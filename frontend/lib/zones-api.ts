import { api } from './api';
import type { HostedZone, ZoneList } from './types';

export interface ZoneQuery {
  search?: string;
  type?: string;
  name?: string;
  comment?: string;
  zoneId?: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export function listZones(q: ZoneQuery) {
  const p = new URLSearchParams({
    sort: q.sort,
    order: q.order,
    page: String(q.page),
    page_size: String(q.pageSize),
  });
  if (q.search) p.set('search', q.search);
  if (q.type) p.set('type', q.type);
  if (q.name) p.set('name', q.name);
  if (q.comment) p.set('comment', q.comment);
  if (q.zoneId) p.set('zone_id', q.zoneId);
  return api.get<ZoneList>(`/hosted-zones?${p.toString()}`);
}

export const getZone = (id: string) => api.get<HostedZone>(`/hosted-zones/${id}`);

export const createZone = (body: {
  name: string;
  type: 'public' | 'private';
  comment: string | null;
  vpc_id: string | null;
}) => api.post<HostedZone>('/hosted-zones', body);

export const updateZone = (id: string, comment: string | null) =>
  api.patch<HostedZone>(`/hosted-zones/${id}`, { comment });

export const deleteZone = (id: string) => api.delete(`/hosted-zones/${id}`);