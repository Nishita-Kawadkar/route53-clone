export interface User {
  id: number;
  username: string;
}

export interface HostedZone {
  id: string;
  name: string;
  type: 'public' | 'private';
  comment: string | null;
  vpc_id: string | null;
  record_count: number;
  created_at: string;
}

export interface ZoneList {
  items: HostedZone[];
  total: number;
  page: number;
  page_size: number;
}

export type RecordType = 'A' | 'AAAA' | 'CAA' | 'CNAME' | 'MX' | 'NS' | 'PTR' | 'SOA' | 'SRV' | 'TXT';

export interface DnsRecord {
  id: number;
  zone_id: string;
  name: string;
  type: RecordType;
  ttl: number | null;
  values: string[];
  alias_target: { dns_name: string; hosted_zone_id: string | null; evaluate_target_health: boolean } | null;
  routing_policy: string;
  created_at: string;
  updated_at: string;
}

export interface RecordList {
  items: DnsRecord[];
  total: number;
  page: number;
  page_size: number;
}