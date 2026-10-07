'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import Multiselect from '@cloudscape-design/components/multiselect';
import type { MultiselectProps } from '@cloudscape-design/components/multiselect';
import Pagination from '@cloudscape-design/components/pagination';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import type { TableProps } from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import DeleteRecordsModal from '@/components/DeleteRecordsModal';
import { useConsole } from '@/lib/console-context';
import { useDebounced } from '@/lib/hooks';
import { FILTER_TYPES, isDefaultRecord, stripDot } from '@/lib/record-utils';
import { listRecords } from '@/lib/records-api';
import type { DnsRecord, HostedZone, RecordList } from '@/lib/types';

const TYPE_OPTIONS: MultiselectProps.Option[] = FILTER_TYPES.map((t) => ({ label: t, value: t }));

interface Props {
  zone: HostedZone;
  onChanged: () => void; // lets the parent refresh the zone's record count
}

export default function RecordsTable({ zone, onChanged }: Props) {
  const router = useRouter();
  const { notify } = useConsole();

  const [filterText, setFilterText] = useState('');
  const [types, setTypes] = useState<readonly MultiselectProps.Option[]>([]);
  const [sorting, setSorting] = useState({ field: 'name', desc: false });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState<RecordList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<DnsRecord[]>([]);
  const [deleting, setDeleting] = useState<DnsRecord[]>([]);

  const search = useDebounced(filterText.trim());
  const typeValues = useMemo(() => types.map((t) => t.value as string), [types]);
  const typeKey = typeValues.join(',');
  const total = data?.total ?? 0;
  const pagesCount = Math.max(1, Math.ceil(total / pageSize));
  const filtered = search !== '' || types.length > 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRecords(zone.id, {
      search: search || undefined,
      types: typeValues,
      sort: sorting.field,
      order: sorting.desc ? 'desc' : 'asc',
      page,
      pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // typeKey stands in for typeValues so the effect doesn't re-run on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id, search, typeKey, sorting, page, pageSize, reloadKey]);

  // If the last row on a page was deleted, step back one page.
  useEffect(() => {
    if (data && page > 1 && data.items.length === 0) setPage(pagesCount);
  }, [data, page, pagesCount]);

  const columns = useMemo<TableProps.ColumnDefinition<DnsRecord>[]>(
    () => [
      { id: 'name', header: 'Record name', cell: (r) => stripDot(r.name), sortingField: 'name', isRowHeader: true },
      { id: 'type', header: 'Type', cell: (r) => r.type, sortingField: 'type' },
      { id: 'policy', header: 'Routing policy', cell: () => 'Simple' },
      { id: 'alias', header: 'Alias', cell: (r) => (r.alias_target ? 'Yes' : 'No') },
      {
        id: 'value',
        header: 'Value/Route traffic to',
        cell: (r) =>
          r.alias_target ? (
            <span>Alias to {stripDot(r.alias_target.dns_name)}</span>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {r.values.map((v, i) => (
                <div key={i}>{v}</div>
              ))}
            </div>
          ),
        minWidth: 280,
      },
      { id: 'ttl', header: 'TTL (seconds)', cell: (r) => r.ttl ?? '-', sortingField: 'ttl' },
    ],
    [],
  );

  function reload() {
    setSelected([]);
    setReloadKey((k) => k + 1);
    onChanged();
  }

  const editable = selected.length === 1 ? selected[0] : null;

  return (
    <>
      <Table
        trackBy="id"
        items={data?.items ?? []}
        loading={loading}
        loadingText="Loading records"
        columnDefinitions={columns}
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected([...detail.selectedItems])}
        isItemDisabled={(r) => isDefaultRecord(r, zone)}
        sortingColumn={{ sortingField: sorting.field }}
        sortingDescending={sorting.desc}
        onSortingChange={({ detail }) => {
          setSorting({ field: detail.sortingColumn.sortingField ?? 'name', desc: !!detail.isDescending });
          setPage(1);
        }}
        header={
          <Header
            counter={`(${total})`}
            description="Automatically generated NS and SOA records for this zone cannot be selected."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={!editable}
                  onClick={() => editable && router.push(`/hosted-zones/${zone.id}/records/${editable.id}/edit`)}
                >
                  Edit record
                </Button>
                <Button disabled={selected.length === 0} onClick={() => setDeleting(selected)}>
                  Delete record
                </Button>
                <Button variant="primary" onClick={() => router.push(`/hosted-zones/${zone.id}/records/new`)}>
                  Create record
                </Button>
              </SpaceBetween>
            }
          >
            Records
          </Header>
        }
        filter={
          <Grid gridDefinition={[{ colspan: { default: 12, xs: 7 } }, { colspan: { default: 12, xs: 5 } }]}>
            <TextFilter
              filteringText={filterText}
              filteringPlaceholder="Filter records by property or value"
              filteringAriaLabel="Filter records"
              countText={filtered ? `${total} ${total === 1 ? 'match' : 'matches'}` : undefined}
              onChange={({ detail }) => {
                setFilterText(detail.filteringText);
                setPage(1);
              }}
            />
            <Multiselect
              selectedOptions={types}
              options={TYPE_OPTIONS}
              placeholder="Filter by type"
              hideTokens
              expandToViewport
              onChange={({ detail }) => {
                setTypes(detail.selectedOptions);
                setPage(1);
              }}
            />
          </Grid>
        }
        pagination={
          <Pagination
            currentPageIndex={page}
            pagesCount={pagesCount}
            onChange={({ detail }) => setPage(detail.currentPageIndex)}
          />
        }
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{ pageSize }}
            pageSizePreference={{
              title: 'Page size',
              options: [25, 50, 100].map((n) => ({ value: n, label: `${n} records` })),
            }}
            onConfirm={({ detail }) => {
              setPageSize(detail.pageSize ?? 50);
              setPage(1);
            }}
          />
        }
        empty={
          error ? (
            <Alert type="error" header="Unable to load records">
              {error}
            </Alert>
          ) : filtered ? (
            <Box textAlign="center" color="inherit">
              <SpaceBetween size="xs">
                <b>No matches</b>
                <span>No records match the current filter.</span>
                <Button
                  onClick={() => {
                    setFilterText('');
                    setTypes([]);
                    setPage(1);
                  }}
                >
                  Clear filter
                </Button>
              </SpaceBetween>
            </Box>
          ) : (
            <Box textAlign="center" color="inherit">
              <SpaceBetween size="xs">
                <b>No records</b>
                <span>This hosted zone has no records.</span>
                <Button onClick={() => router.push(`/hosted-zones/${zone.id}/records/new`)}>Create record</Button>
              </SpaceBetween>
            </Box>
          )
        }
      />

      <DeleteRecordsModal
        zoneId={zone.id}
        records={deleting}
        onDismiss={() => setDeleting([])}
        onDone={(result) => {
          setDeleting([]);
          const n = result.deleted.length;
          if (n > 0) {
            notify({ type: 'success', header: `Successfully deleted ${n} record${n === 1 ? '' : 's'}.` });
          }
          if (result.skipped.length > 0) {
            notify({
              type: 'warning',
              header: `${result.skipped.length} record${result.skipped.length === 1 ? ' was' : 's were'} not deleted.`,
              content: result.skipped[0].reason,
            });
          }
          reload();
        }}
      />
    </>
  );
}