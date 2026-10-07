'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import ContentLayout from '@cloudscape-design/components/content-layout';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import Tabs from '@cloudscape-design/components/tabs';
import DeleteZoneModal from '@/components/DeleteZoneModal';
import EditZoneModal from '@/components/EditZoneModal';
import RecordsTable from '@/components/RecordsTable';
import { useBreadcrumbs, useConsole } from '@/lib/console-context';
import { getZone } from '@/lib/zones-api';
import type { HostedZone } from '@/lib/types';

function Placeholder({ title }: { title: string }) {
  return (
    <Box textAlign="center" color="text-body-secondary" padding={{ vertical: 'xxl' }}>
      {title} is not part of this clone.
    </Box>
  );
}

export default function HostedZoneDetailPage() {
  const router = useRouter();
  const { zoneId } = useParams<{ zoneId: string }>();
  const { notify } = useConsole();

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HostedZone | null>(null);
  const [deleting, setDeleting] = useState<HostedZone | null>(null);

  const displayName = zone ? zone.name.replace(/\.$/, '') : zoneId;
  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: 'Hosted zones', href: '/hosted-zones' },
    { text: displayName, href: `/hosted-zones/${zoneId}` },
  ]);

  const load = useCallback(() => {
    getZone(zoneId)
      .then((z) => {
        setZone(z);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [zoneId]);

  useEffect(load, [load]);

  if (loading && !zone) {
    return (
      <Box textAlign="center" padding={{ top: 'xxl' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (error || !zone) {
    return (
      <SpaceBetween size="m">
        <Alert type="error" header="Hosted zone not found">
          {error ?? 'The hosted zone could not be loaded.'}
        </Alert>
        <Button onClick={() => router.push('/hosted-zones')}>Back to hosted zones</Button>
      </SpaceBetween>
    );
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setEditing(zone)}>Edit hosted zone</Button>
              <Button onClick={() => setDeleting(zone)}>Delete zone</Button>
            </SpaceBetween>
          }
        >
          {displayName}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <ExpandableSection variant="container" headerText="Hosted zone details" defaultExpanded>
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Hosted zone name</Box>
              <div>{displayName}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">Hosted zone ID</Box>
              <div>{zone.id}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">Type</Box>
              <div>{zone.type === 'private' ? 'Private hosted zone' : 'Public hosted zone'}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">Description</Box>
              <div>{zone.comment || '-'}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">Record count</Box>
              <div>{zone.record_count}</div>
            </div>
            {zone.type === 'private' && (
              <div>
                <Box variant="awsui-key-label">Associated VPC</Box>
                <div>{zone.vpc_id}</div>
              </div>
            )}
          </ColumnLayout>
        </ExpandableSection>

        <Tabs
          tabs={[
            { id: 'records', label: 'Records', content: <RecordsTable zone={zone} onChanged={load} /> },
            { id: 'dnssec', label: 'DNSSEC signing', content: <Placeholder title="DNSSEC signing" /> },
            { id: 'logging', label: 'Query logging', content: <Placeholder title="Query logging" /> },
            { id: 'tags', label: 'Hosted zone tags', content: <Placeholder title="Tags" /> },
          ]}
        />
      </SpaceBetween>

      <EditZoneModal
        zone={editing}
        onDismiss={() => setEditing(null)}
        onSaved={(z) => {
          setEditing(null);
          setZone(z);
          notify({ type: 'success', header: `Hosted zone ${z.name.replace(/\.$/, '')} was successfully updated.` });
        }}
      />
      <DeleteZoneModal
        zone={deleting}
        onDismiss={() => setDeleting(null)}
        onDeleted={(z) => {
          setDeleting(null);
          notify({ type: 'success', header: `Hosted zone ${z.name.replace(/\.$/, '')} was successfully deleted.` });
          router.push('/hosted-zones');
        }}
      />
    </ContentLayout>
  );
}