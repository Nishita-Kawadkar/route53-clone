'use client';

import { useParams, useRouter } from 'next/navigation';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useBreadcrumbs } from '@/lib/console-context';
import { COMING_SOON_PAGES } from '@/lib/nav';

export default function ComingSoonPage() {
  const router = useRouter();
  const { section } = useParams<{ section: string }>();
  const title = COMING_SOON_PAGES[section];

  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: title ?? 'Not found', href: `/${section}` },
  ]);

  return (
    <ContentLayout header={<Header variant="h1">{title ?? 'Page not found'}</Header>}>
      <Container>
        <Box textAlign="center" padding={{ vertical: 'xxl' }}>
          <SpaceBetween size="m">
            <Box variant="h2" fontWeight="normal">
              {title ? 'Coming soon' : 'This page does not exist'}
            </Box>
            <Box color="text-body-secondary">
              {title
                ? `${title} is not part of this clone yet.`
                : 'Check the address, or use the navigation on the left.'}
            </Box>
            <Button variant="primary" onClick={() => router.push('/hosted-zones')}>
              Go to hosted zones
            </Button>
          </SpaceBetween>
        </Box>
      </Container>
    </ContentLayout>
  );
}