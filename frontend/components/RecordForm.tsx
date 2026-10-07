'use client';

import { useMemo, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import Toggle from '@cloudscape-design/components/toggle';
import type { DnsRecord, HostedZone, RecordType } from '@/lib/types';
import type { RecordInput } from '@/lib/records-api';
import {
  ALIAS_TYPES,
  CREATABLE_TYPES,
  VALUE_HINTS,
  isDefaultRecord,
  relativeName,
  stripDot,
} from '@/lib/record-utils';

const MAX_TTL = 2147483647;

interface Props {
  zone: HostedZone;
  record?: DnsRecord;
  submitLabel: string;
  onSubmit: (input: RecordInput) => Promise<void>;
  onCancel: () => void;
}

export default function RecordForm({ zone, record, submitLabel, onSubmit, onCancel }: Props) {
  const locked = record ? isDefaultRecord(record, zone) : false;

  const [name, setName] = useState(record ? relativeName(record.name, zone) : '');
  const [type, setType] = useState<RecordType>(record?.type ?? 'A');
  const [alias, setAlias] = useState(!!record?.alias_target);
  const [valuesText, setValuesText] = useState(record?.values.join('\n') ?? '');
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));
  const [aliasDns, setAliasDns] = useState(record?.alias_target?.dns_name ?? '');
  const [aliasZone, setAliasZone] = useState(record?.alias_target?.hosted_zone_id ?? '');
  const [evalHealth, setEvalHealth] = useState(record?.alias_target?.evaluate_target_health ?? false);

  const [valuesError, setValuesError] = useState<string | null>(null);
  const [ttlError, setTtlError] = useState<string | null>(null);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typeOptions = useMemo(() => {
    const types = locked ? [type] : CREATABLE_TYPES;
    return types.map((t) => ({ label: t, value: t }));
  }, [locked, type]);

  const aliasAllowed = ALIAS_TYPES.includes(type);
  const useAlias = alias && aliasAllowed;
  const hint = VALUE_HINTS[type];
  const zoneBase = stripDot(zone.name);

  const trimmed = name.trim().toLowerCase();
  const preview =
    trimmed === '' || trimmed === '@' || trimmed === zoneBase
      ? zoneBase
      : trimmed.endsWith('.' + zoneBase) || trimmed.endsWith('.')
        ? stripDot(trimmed)
        : `${trimmed}.${zoneBase}`;

  async function submit() {
    setFormError(null);
    setValuesError(null);
    setTtlError(null);
    setAliasError(null);

    const values = valuesText.split('\n').map((v) => v.trim()).filter(Boolean);
    let invalid = false;

    if (useAlias) {
      if (!aliasDns.trim()) {
        setAliasError('Enter the DNS name of the alias target.');
        invalid = true;
      }
    } else {
      if (values.length === 0) {
        setValuesError('Enter at least one value.');
        invalid = true;
      }
      if (!/^\d+$/.test(ttl.trim()) || Number(ttl) > MAX_TTL) {
        setTtlError(`TTL must be a whole number between 0 and ${MAX_TTL}.`);
        invalid = true;
      }
    }
    if (invalid) return;

    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        ttl: useAlias ? 0 : Number(ttl),
        values: useAlias ? [] : values,
        alias_target: useAlias
          ? {
              dns_name: aliasDns.trim(),
              hosted_zone_id: aliasZone.trim() || null,
              evaluate_target_health: evalHealth,
            }
          : null,
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save the record');
      setBusy(false);
    }
  }

  return (
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
            <Button variant="link" formAction="none" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} formAction="submit">
              {submitLabel}
            </Button>
          </SpaceBetween>
        }
      >
        <Container header={<Header variant="h2">Record configuration</Header>}>
          <SpaceBetween size="l">
            <FormField
              label="Record name"
              description="Keep blank to create a record for the root domain."
              constraintText={
                <>
                  Full name: <b>{preview}</b>
                </>
              }
            >
              <Input
                value={name}
                disabled={locked}
                placeholder="www"
                autoFocus={!locked}
                onChange={({ detail }) => setName(detail.value)}
              />
            </FormField>

            <FormField
              label="Record type"
              description={locked ? 'The type of the default records cannot be changed.' : undefined}
            >
              <Select
                selectedOption={{ label: type, value: type }}
                options={typeOptions}
                disabled={locked}
                onChange={({ detail }) => setType(detail.selectedOption.value as RecordType)}
              />
            </FormField>

            {aliasAllowed && (
              <Toggle checked={alias} onChange={({ detail }) => setAlias(detail.checked)}>
                Alias
              </Toggle>
            )}

            {useAlias ? (
              <>
                <FormField
                  label="Route traffic to"
                  description="Enter the DNS name of the AWS resource, or another record in this zone."
                  errorText={aliasError}
                >
                  <Input
                    value={aliasDns}
                    placeholder="d111111abcdef8.cloudfront.net"
                    onChange={({ detail }) => {
                      setAliasDns(detail.value);
                      setAliasError(null);
                    }}
                  />
                </FormField>
                <FormField label="Alias hosted zone ID - optional">
                  <Input
                    value={aliasZone}
                    placeholder="Z2FDTNDATAQYW2"
                    onChange={({ detail }) => setAliasZone(detail.value)}
                  />
                </FormField>
                <Toggle checked={evalHealth} onChange={({ detail }) => setEvalHealth(detail.checked)}>
                  Evaluate target health
                </Toggle>
              </>
            ) : (
              <>
                <FormField
                  label="Value"
                  description={hint.help}
                  errorText={valuesError}
                >
                  <Textarea
                    value={valuesText}
                    rows={5}
                    placeholder={hint.placeholder}
                    onChange={({ detail }) => {
                      setValuesText(detail.value);
                      setValuesError(null);
                    }}
                  />
                </FormField>
                <FormField
                  label="TTL (seconds)"
                  constraintText="Recommended values: 60 to 172800 (two days)."
                  errorText={ttlError}
                >
                  <Input
                    inputMode="numeric"
                    value={ttl}
                    onChange={({ detail }) => {
                      setTtl(detail.value);
                      setTtlError(null);
                    }}
                  />
                </FormField>
              </>
            )}

            <FormField label="Routing policy">
              <Select
                selectedOption={{ label: 'Simple routing', value: 'simple' }}
                options={[{ label: 'Simple routing', value: 'simple' }]}
                disabled
              />
            </FormField>
            <Box variant="small" color="text-body-secondary">
              Weighted, latency, failover and geolocation routing are outside the scope of this clone.
            </Box>
          </SpaceBetween>
        </Container>
      </Form>
    </form>
  );
}