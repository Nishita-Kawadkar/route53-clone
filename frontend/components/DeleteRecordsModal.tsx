'use client';

import { useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { bulkDeleteRecords, type BulkDeleteResult } from '@/lib/records-api';
import { stripDot } from '@/lib/record-utils';
import type { DnsRecord } from '@/lib/types';

interface Props {
  zoneId: string;
  records: DnsRecord[]; // empty array = closed
  onDismiss: () => void;
  onDone: (result: BulkDeleteResult) => void;
}

export default function DeleteRecordsModal({ zoneId, records, onDismiss, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBusy(false);
    setError(null);
  }, [records]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      onDone(await bulkDeleteRecords(zoneId, records.map((r) => r.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete the records');
    } finally {
      setBusy(false);
    }
  }

  const count = records.length;

  return (
    <Modal
      visible={count > 0}
      onDismiss={onDismiss}
      header={count === 1 ? 'Delete record' : `Delete ${count} records`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={confirm}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && <Alert type="error">{error}</Alert>}
        <Box>
          {count === 1 ? 'Are you sure you want to delete this record?' : 'Are you sure you want to delete these records?'}{' '}
          This action cannot be undone.
        </Box>
        <ul style={{ margin: 0, paddingLeft: 20, maxHeight: 200, overflowY: 'auto' }}>
          {records.map((r) => (
            <li key={r.id}>
              <b>{stripDot(r.name)}</b> ({r.type})
            </li>
          ))}
        </ul>
      </SpaceBetween>
    </Modal>
  );
}