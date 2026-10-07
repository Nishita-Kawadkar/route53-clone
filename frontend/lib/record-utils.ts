import type { DnsRecord, HostedZone, RecordType } from './types';

export const CREATABLE_TYPES: RecordType[] = ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NS', 'PTR', 'SRV', 'TXT'];
export const FILTER_TYPES: RecordType[] = ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'];
export const ALIAS_TYPES: RecordType[] = ['A', 'AAAA'];

export const VALUE_HINTS: Record<RecordType, { placeholder: string; help: string }> = {
  A: { placeholder: '192.0.2.235', help: 'Enter one IPv4 address per line.' },
  AAAA: { placeholder: '2001:db8::1', help: 'Enter one IPv6 address per line.' },
  CNAME: { placeholder: 'www.example.com', help: 'Enter a single domain name.' },
  MX: { placeholder: '10 mail.example.com', help: 'Enter one value per line: priority, a space, then the mail server.' },
  NS: { placeholder: 'ns-1.example.net', help: 'Enter one name server per line.' },
  PTR: { placeholder: 'host.example.com', help: 'Enter a single domain name.' },
  SRV: { placeholder: '1 10 5269 xmpp.example.com', help: 'Enter one value per line: priority, weight, port, then the target.' },
  TXT: { placeholder: '"v=spf1 include:example.net ~all"', help: 'Enter one value per line. Values are quoted automatically.' },
  CAA: { placeholder: '0 issue "letsencrypt.org"', help: 'Enter one value per line: flags, tag (issue, issuewild, iodef), then the value.' },
  SOA: { placeholder: '', help: 'The SOA value of the default record.' },
};

/** The default NS and SOA records at the zone apex are protected. */
export function isDefaultRecord(r: DnsRecord, zone: HostedZone): boolean {
  return (r.type === 'NS' || r.type === 'SOA') && r.name === zone.name;
}

/** "www.example.com." -> "www"; apex -> "" */
export function relativeName(recordName: string, zone: HostedZone): string {
  if (recordName === zone.name) return '';
  const suffix = '.' + zone.name;
  return recordName.endsWith(suffix) ? recordName.slice(0, -suffix.length) : recordName;
}

export const stripDot = (s: string) => s.replace(/\.$/, '');