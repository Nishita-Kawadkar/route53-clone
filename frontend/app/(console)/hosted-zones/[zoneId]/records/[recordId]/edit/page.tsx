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
import { getRecord, updateRecord } from '@/lib/records-api';
import { getZone } from '@/lib/zones-api';
import type { DnsRecord, HostedZone } from '@/lib/types';

export default function EditRecordPage() {
  const router = useRouter();
  const { zoneId, recordId } = useParams<{ zoneId: string; recordId: string }>();
  const { notify } = useConsole();
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [record, setRecord] = useState<DnsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zoneName = zone ? zone.name.replace(/\.$/, '') : zoneId;
  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: 'Hosted zones', href: '/hosted-zones' },
    { text: zoneName, href: `/hosted-zones/${zoneId}` },
    { text: 'Edit record', href: `/hosted-zones/${zoneId}/records/${recordId}/edit` },
  ]);

  useEffect(() => {
    Promise.all([getZone(zoneId), getRecord(zoneId, Number(recordId))])
      .then(([z, r]) => {
        setZone(z);
        setRecord(r);
      })
      .catch((e: Error) => setError(e.message));
  }, [zoneId, recordId]);

  if (error) return <Alert type="error" header="Record not found">{error}</Alert>;
  if (!zone || !record) {
    return (
      <Box textAlign="center" padding={{ top: 'xxl' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  const back = () => router.push(`/hosted-zones/${zone.id}`);

  return (
    <ContentLayout header={<Header variant="h1">Edit record</Header>}>
      <RecordForm
        zone={zone}
        record={record}
        submitLabel="Save changes"
        onCancel={back}
        onSubmit={async (input) => {
          const rec = await updateRecord(zone.id, record.id, input);
          notify({
            type: 'success',
            header: `Record ${rec.name.replace(/\.$/, '')} (${rec.type}) was successfully updated.`,
          });
          back();
        }}
      />
    </ContentLayout>
  );
}