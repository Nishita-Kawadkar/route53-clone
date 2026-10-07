import type { SideNavigationProps } from '@cloudscape-design/components/side-navigation';

export const NAV_ITEMS: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/dashboard' },
  { type: 'link', text: 'Hosted zones', href: '/hosted-zones' },
  { type: 'link', text: 'Health checks', href: '/health-checks' },
  { type: 'link', text: 'Profiles', href: '/profiles' },
  { type: 'divider' },
  {
    type: 'section',
    text: 'Traffic flow',
    defaultExpanded: true,
    items: [
      { type: 'link', text: 'Traffic policies', href: '/traffic-policies' },
      { type: 'link', text: 'Policy records', href: '/policy-records' },
    ],
  },
  {
    type: 'section',
    text: 'Resolver',
    defaultExpanded: true,
    items: [
      { type: 'link', text: 'VPCs', href: '/vpcs' },
      { type: 'link', text: 'Inbound endpoints', href: '/inbound-endpoints' },
      { type: 'link', text: 'Outbound endpoints', href: '/outbound-endpoints' },
      { type: 'link', text: 'Rules', href: '/rules' },
      { type: 'link', text: 'Query logging', href: '/query-logging' },
    ],
  },
];

/** URL slug -> page title for every mocked section. */
export const COMING_SOON_PAGES: Record<string, string> = {
  dashboard: 'Dashboard',
  'health-checks': 'Health checks',
  profiles: 'Profiles',
  'traffic-policies': 'Traffic policies',
  'policy-records': 'Policy records',
  vpcs: 'Resolver VPCs',
  'inbound-endpoints': 'Inbound endpoints',
  'outbound-endpoints': 'Outbound endpoints',
  rules: 'Resolver rules',
  'query-logging': 'Query logging',
};

