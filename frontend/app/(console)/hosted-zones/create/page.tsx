'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { useBreadcrumbs, useConsole } from '@/lib/console-context';
import { createZone } from '@/lib/zones-api';

const DOMAIN_RE = /^(?=.{1,253}\.?$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}\.?$/i;
const MAX_COMMENT = 256;

export default function CreateHostedZonePage() {
  const router = useRouter();
  const { notify } = useConsole();
  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: 'Hosted zones', href: '/hosted-zones' },
    { text: 'Create hosted zone', href: '/hosted-zones/create' },
  ]);

  const [domain, setDomain] = useState('');
  const [comment, setComment] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [vpcId, setVpcId] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [vpcError, setVpcError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setFormError(null);
    const name = domain.trim();
    let invalid = false;
    if (!name) {
      setDomainError('Domain name is required.');
      invalid = true;
    } else if (!DOMAIN_RE.test(name)) {
      setDomainError('Enter a valid domain name, for example example.com.');
      invalid = true;
    }
    if (type === 'private' && !vpcId.trim()) {
      setVpcError('A VPC ID is required for private hosted zones.');
      invalid = true;
    }
    if (invalid) return;

    setSubmitting(true);
    try {
      const zone = await createZone({
        name,
        type,
        comment: comment.trim() || null,
        vpc_id: type === 'private' ? vpcId.trim() : null,
      });
      notify({
        type: 'success',
        header: `${zone.name.replace(/\.$/, '')} was successfully created.`,
        content:
          'Now you can create records in the hosted zone to specify how you want Route 53 to route traffic for your domain.',
      });
      router.push(`/hosted-zones/${zone.id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create the hosted zone');
      setSubmitting(false);
    }
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="A hosted zone is a container for records, and the records contain information about how you want to route traffic for a specific domain, such as example.com, and its subdomains."
        >
          Create hosted zone
        </Header>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Form
          errorText={formError}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push('/hosted-zones')}>
                Cancel
              </Button>
              <Button variant="primary" loading={submitting} formAction="submit">
                Create hosted zone
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="Domain name"
                  description="This is the name of the domain that you want to route traffic for."
                  constraintText="Valid characters: a-z, 0-9, and - (hyphen). Separate labels with a period."
                  errorText={domainError}
                >
                  <Input
                    value={domain}
                    autoFocus
                    placeholder="example.com"
                    onChange={({ detail }) => {
                      setDomain(detail.value);
                      setDomainError(null);
                    }}
                  />
                </FormField>

                <FormField
                  label="Description - optional"
                  description="This value lets you distinguish hosted zones that have the same name."
                  constraintText={`The description can have up to ${MAX_COMMENT} characters. ${Math.max(0, MAX_COMMENT - comment.length)} remaining.`}
                  errorText={comment.length > MAX_COMMENT ? `Up to ${MAX_COMMENT} characters allowed.` : undefined}
                >
                  <Textarea value={comment} rows={3} onChange={({ detail }) => setComment(detail.value)} />
                </FormField>

                <FormField
                  label="Type"
                  description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC."
                >
                  <RadioGroup
                    value={type}
                    onChange={({ detail }) => setType(detail.value as 'public' | 'private')}
                    items={[
                      {
                        value: 'public',
                        label: 'Public hosted zone',
                        description: 'A public hosted zone determines how traffic is routed on the internet.',
                      },
                      {
                        value: 'private',
                        label: 'Private hosted zone',
                        description: 'A private hosted zone determines how traffic is routed within an Amazon VPC.',
                      },
                    ]}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

            {type === 'private' && (
              <Container header={<Header variant="h2">VPC to associate with the hosted zone</Header>}>
                <FormField
                  label="VPC ID"
                  description="To use this hosted zone for resolving DNS queries, associate it with a VPC."
                  errorText={vpcError}
                >
                  <Input
                    value={vpcId}
                    placeholder="vpc-0123456789abcdef0"
                    onChange={({ detail }) => {
                      setVpcId(detail.value);
                      setVpcError(null);
                    }}
                  />
                </FormField>
              </Container>
            )}
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}