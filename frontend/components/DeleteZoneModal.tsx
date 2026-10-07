'use client';

import { useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { deleteZone } from '@/lib/zones-api';
import type { HostedZone } from '@/lib/types';

interface Props {
  zone: HostedZone | null;
  onDismiss: () => void;
  onDeleted: (zone: HostedZone) => void;
}

export default function DeleteZoneModal({ zone, onDismiss, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfirmText('');
    setError(null);
    setBusy(false);
  }, [zone?.id]);

  async function confirm() {
    if (!zone) return;
    setBusy(true);
    setError(null);
    try {
      await deleteZone(zone.id);
      onDeleted(zone);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete the hosted zone');
    } finally {
      setBusy(false);
    }
  }

  const extraRecords = zone ? Math.max(0, zone.record_count - 2) : 0;

  return (
    <Modal
      visible={zone !== null}
      onDismiss={onDismiss}
      header="Delete hosted zone"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={confirmText !== 'delete'}
              onClick={confirm}
            >
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && (
          <Alert type="error" header="Could not delete the hosted zone">
            {error}
          </Alert>
        )}
        {extraRecords > 0 && (
          <Alert type="warning">
            This hosted zone contains {extraRecords} record{extraRecords === 1 ? '' : 's'} besides
            the default NS and SOA records. Delete them before deleting the hosted zone.
          </Alert>
        )}
        <Box>
          Are you sure you want to permanently delete the hosted zone <b>{zone?.name}</b>? This
          action cannot be undone.
        </Box>
        <FormField label="To confirm deletion, type delete in the field.">
          <Input
            value={confirmText}
            placeholder="delete"
            onChange={({ detail }) => setConfirmText(detail.value)}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}