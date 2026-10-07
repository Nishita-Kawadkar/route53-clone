'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Spinner from '@cloudscape-design/components/spinner';
import RecordForm from '@/components/RecordForm';
import { useBreadcrumbs, useConsole } from '@/lib/console-context';
import { createRecord } from '@/lib/records-api';
import { getZone } from '@/lib/zones-api';
import type { HostedZone } from '@/lib/types';

export default function CreateRecordPage() {
  const router = useRouter();
  const { zoneId } = useParams<{ zoneId: string }>();
  const { notify } = useConsole();
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zoneName = zone ? zone.name.replace(/\.$/, '') : zoneId;
  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: 'Hosted zones', href: '/hosted-zones' },
    { text: zoneName, href: `/hosted-zones/${zoneId}` },
    { text: 'Create record', href: `/hosted-zones/${zoneId}/records/new` },
  ]);

  useEffect(() => {
    getZone(zoneId).then(setZone).catch((e: Error) => setError(e.message));
  }, [zoneId]);

  if (error) return <Alert type="error" header="Hosted zone not found">{error}</Alert>;
  if (!zone) {
    return (
      <Box textAlign="center" padding={{ top: 'xxl' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  const back = () => router.push(`/hosted-zones/${zone.id}`);

  return (
    <ContentLayout
      header={
        <Header variant="h1" description={`Create a record in the hosted zone ${zoneName}.`}>
          Create record
        </Header>
      }
    >
      <RecordForm
        zone={zone}
        submitLabel="Create record"
        onCancel={back}
        onSubmit={async (input) => {
          const rec = await createRecord(zone.id, input);
          notify({
            type: 'success',
            header: `Record ${rec.name.replace(/\.$/, '')} (${rec.type}) was successfully created.`,
          });
          back();
        }}
      />
    </ContentLayout>
  );
}