'use client';

import { useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { api } from '@/lib/api';
import { useBreadcrumbs } from '@/lib/console-context';
import type { ZoneList } from '@/lib/types';

export default function HostedZonesPage() {
  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: 'Hosted zones', href: '/hosted-zones' },
  ]);

  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ZoneList>('/hosted-zones')
      .then((res) => setTotal(res.total))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <ContentLayout header={<Header variant="h1">Hosted zones</Header>}>
      <Container>
        {error ? (
          <Alert type="error">Could not reach the API: {error}</Alert>
        ) : (
          <Alert type="success">Connected to the backend. Hosted zones in the database: {total ?? '…'}</Alert>
        )}
      </Container>
    </ContentLayout>
  );
}