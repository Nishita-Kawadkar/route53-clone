'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import Pagination from '@cloudscape-design/components/pagination';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import type { TableProps } from '@cloudscape-design/components/table';
import DeleteZoneModal from '@/components/DeleteZoneModal';
import EditZoneModal from '@/components/EditZoneModal';
import { useBreadcrumbs, useConsole } from '@/lib/console-context';
import { listZones } from '@/lib/zones-api';
import type { HostedZone, ZoneList } from '@/lib/types';

const DEFAULT_QUERY: PropertyFilterProps.Query = { tokens: [], operation: 'and' };

const COLUMN_OPTIONS = [
  { id: 'name', label: 'Hosted zone name', editable: false },
  { id: 'type', label: 'Type' },
  { id: 'created_by', label: 'Created by' },
  { id: 'record_count', label: 'Record count' },
  { id: 'comment', label: 'Description' },
  { id: 'id', label: 'Hosted zone ID' },
];

const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  { key: 'name', propertyLabel: 'Hosted zone name', groupValuesLabel: 'Hosted zone name values', operators: [':'] },
  { key: 'type', propertyLabel: 'Type', groupValuesLabel: 'Type values', operators: ['='] },
  { key: 'comment', propertyLabel: 'Description', groupValuesLabel: 'Description values', operators: [':'] },
  { key: 'zone_id', propertyLabel: 'Hosted zone ID', groupValuesLabel: 'Hosted zone ID values', operators: [':'] },
];

const FILTERING_OPTIONS: PropertyFilterProps.FilteringOption[] = [
  { propertyKey: 'type', value: 'Public' },
  { propertyKey: 'type', value: 'Private' },
];

/** Translate property-filter tokens into API query parameters. */
function toParams(query: PropertyFilterProps.Query) {
  const terms: string[] = [];
  const params: { type?: string; name?: string; comment?: string; zoneId?: string } = {};
  for (const token of query.tokens) {
    const value = String(token.value).trim();
    if (!value) continue;
    switch (token.propertyKey) {
      case 'type':
        if (['public', 'private'].includes(value.toLowerCase())) params.type = value.toLowerCase();
        break;
      case 'name':
        params.name = value;
        break;
      case 'comment':
        params.comment = value;
        break;
      case 'zone_id':
        params.zoneId = value;
        break;
      default:
        terms.push(value); // free text
    }
  }
  return { ...params, search: terms.join(' ') };
}

export default function HostedZonesPage() {
  const router = useRouter();
  const { notify } = useConsole();
  useBreadcrumbs([
    { text: 'Route 53', href: '/hosted-zones' },
    { text: 'Hosted zones', href: '/hosted-zones' },
  ]);

  const [query, setQuery] = useState<PropertyFilterProps.Query>(DEFAULT_QUERY);
  const [sorting, setSorting] = useState({ field: 'name', desc: false });
  const [page, setPage] = useState(1);
  const [prefs, setPrefs] = useState({
    pageSize: 10,
    visibleContent: COLUMN_OPTIONS.map((c) => c.id),
  });
  const [data, setData] = useState<ZoneList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<HostedZone[]>([]);
  const [editing, setEditing] = useState<HostedZone | null>(null);
  const [deleting, setDeleting] = useState<HostedZone | null>(null);

  const params = useMemo(() => toParams(query), [query]);
  const total = data?.total ?? 0;
  const pagesCount = Math.max(1, Math.ceil(total / prefs.pageSize));
  const current = selected[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listZones({
      ...params,
      sort: sorting.field,
      order: sorting.desc ? 'desc' : 'asc',
      page,
      pageSize: prefs.pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params, sorting, page, prefs.pageSize, reloadKey]);

  // If the last item on a page was deleted, step back to the previous page.
  useEffect(() => {
    if (data && page > 1 && data.items.length === 0) setPage(Math.max(1, pagesCount));
  }, [data, page, pagesCount]);

  const columns = useMemo<TableProps.ColumnDefinition<HostedZone>[]>(
    () => [
      {
        id: 'name',
        header: 'Hosted zone name',
        cell: (z) => (
          <Link
            href={`/hosted-zones/${z.id}`}
            onFollow={(e) => {
              e.preventDefault();
              router.push(`/hosted-zones/${z.id}`);
            }}
          >
            {z.name}
          </Link>
        ),
        sortingField: 'name',
        isRowHeader: true,
      },
      {
        id: 'type',
        header: 'Type',
        cell: (z) => (z.type === 'private' ? 'Private' : 'Public'),
        sortingField: 'type',
      },
      { id: 'created_by', header: 'Created by', cell: () => 'Route 53' },
      { id: 'record_count', header: 'Record count', cell: (z) => z.record_count },
      { id: 'comment', header: 'Description', cell: (z) => z.comment || '-' },
      { id: 'id', header: 'Hosted zone ID', cell: (z) => z.id, sortingField: 'id' },
    ],
    [router],
  );

  function reload() {
    setSelected([]);
    setReloadKey((k) => k + 1);
  }

  return (
    <>
      <Table
        variant="full-page"
        stickyHeader
        trackBy="id"
        items={data?.items ?? []}
        loading={loading}
        loadingText="Loading hosted zones"
        columnDefinitions={columns}
        visibleColumns={prefs.visibleContent}
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected([...detail.selectedItems])}
        sortingColumn={{ sortingField: sorting.field }}
        sortingDescending={sorting.desc}
        onSortingChange={({ detail }) => {
          setSorting({ field: detail.sortingColumn.sortingField ?? 'name', desc: !!detail.isDescending });
          setPage(1);
        }}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${total})`}
            info={<Link variant="info">Info</Link>}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button disabled={!current} onClick={() => current && router.push(`/hosted-zones/${current.id}`)}>
                  View details
                </Button>
                <Button disabled={!current} onClick={() => setEditing(current ?? null)}>
                  Edit
                </Button>
                <Button disabled={!current} onClick={() => setDeleting(current ?? null)}>
                  Delete
                </Button>
                <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
                  Create hosted zone
                </Button>
              </SpaceBetween>
            }
          >
            Hosted zones
          </Header>
        }
        filter={
          <PropertyFilter
            query={query}
            onChange={({ detail }) => {
              setQuery({ ...detail, operation: 'and' });
              setPage(1);
            }}
            filteringProperties={FILTERING_PROPERTIES}
            filteringOptions={FILTERING_OPTIONS}
            filteringPlaceholder="Filter hosted zones by property or value"
            filteringAriaLabel="Filter hosted zones"
            countText={query.tokens.length ? `${total} ${total === 1 ? 'match' : 'matches'}` : undefined}
            expandToViewport
          />
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
            preferences={{ pageSize: prefs.pageSize, visibleContent: prefs.visibleContent }}
            pageSizePreference={{
              title: 'Page size',
              options: [10, 20, 50, 100].map((n) => ({ value: n, label: `${n} hosted zones` })),
            }}
            visibleContentPreference={{
              title: 'Select visible columns',
              options: [{ label: 'Hosted zone properties', options: COLUMN_OPTIONS }],
            }}
            onConfirm={({ detail }) => {
              setPrefs({
                pageSize: detail.pageSize ?? 10,
                visibleContent: [...(detail.visibleContent ?? COLUMN_OPTIONS.map((c) => c.id))],
              });
              setPage(1);
            }}
          />
        }
        empty={
          error ? (
            <Alert type="error" header="Unable to load hosted zones">
              {error}
            </Alert>
          ) : query.tokens.length > 0 ? (
            <Box textAlign="center" color="inherit">
              <SpaceBetween size="xs">
                <b>No matches</b>
                <span>No hosted zones match the current filter.</span>
                <Button
                  onClick={() => {
                    setQuery(DEFAULT_QUERY);
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
                <b>No hosted zones</b>
                <span>There are no hosted zones to display.</span>
                <Button onClick={() => router.push('/hosted-zones/create')}>Create hosted zone</Button>
              </SpaceBetween>
            </Box>
          )
        }
      />

      <EditZoneModal
        zone={editing}
        onDismiss={() => setEditing(null)}
        onSaved={(zone) => {
          setEditing(null);
          notify({ type: 'success', header: `Hosted zone ${zone.name.replace(/\.$/, '')} was successfully updated.` });
          reload();
        }}
      />
      <DeleteZoneModal
        zone={deleting}
        onDismiss={() => setDeleting(null)}
        onDeleted={(zone) => {
          setDeleting(null);
          notify({ type: 'success', header: `Hosted zone ${zone.name.replace(/\.$/, '')} was successfully deleted.` });
          reload();
        }}
      />
    </>
  );
}