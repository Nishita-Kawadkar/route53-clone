'use client';

import { useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import FormField from '@cloudscape-design/components/form-field';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { updateZone } from '@/lib/zones-api';
import type { HostedZone } from '@/lib/types';

const MAX_LENGTH = 256;

interface Props {
  zone: HostedZone | null;
  onDismiss: () => void;
  onSaved: (zone: HostedZone) => void;
}

export default function EditZoneModal({ zone, onDismiss, onSaved }: Props) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setComment(zone?.comment ?? '');
    setError(null);
    setBusy(false);
  }, [zone]);

  const tooLong = comment.length > MAX_LENGTH;

  async function save() {
    if (!zone) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await updateZone(zone.id, comment.trim() || null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update the hosted zone');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={zone !== null}
      onDismiss={onDismiss}
      header="Edit hosted zone"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={tooLong} onClick={save}>
              Save changes
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && <Alert type="error">{error}</Alert>}
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Hosted zone name</Box>
            <div>{zone?.name}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Type</Box>
            <div>{zone?.type === 'private' ? 'Private hosted zone' : 'Public hosted zone'}</div>
          </div>
        </ColumnLayout>
        <FormField
          label="Description - optional"
          errorText={tooLong ? `The description can have up to ${MAX_LENGTH} characters.` : undefined}
          constraintText={`${Math.max(0, MAX_LENGTH - comment.length)} characters remaining`}
        >
          <Textarea
            value={comment}
            rows={3}
            onChange={({ detail }) => setComment(detail.value)}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}