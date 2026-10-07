'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FlashbarProps } from '@cloudscape-design/components/flashbar';
import type { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';

export interface Notice {
  type: 'success' | 'error' | 'info' | 'warning';
  header?: string;
  content?: ReactNode;
}

interface ConsoleState {
  flashItems: FlashbarProps.MessageDefinition[];
  notify: (notice: Notice) => void;
  breadcrumbs: BreadcrumbGroupProps.Item[];
  setBreadcrumbs: (items: BreadcrumbGroupProps.Item[]) => void;
}

const ConsoleContext = createContext<ConsoleState | null>(null);
let counter = 0;

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<(Notice & { id: string })[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbGroupProps.Item[]>([]);

  const notify = useCallback((notice: Notice) => {
    const id = `notice-${++counter}`;
    setNotices((prev) => [{ ...notice, id }, ...prev].slice(0, 3));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const flashItems = useMemo<FlashbarProps.MessageDefinition[]>(
    () =>
      notices.map((n) => ({
        id: n.id,
        type: n.type,
        header: n.header,
        content: n.content,
        dismissible: true,
        onDismiss: () => dismiss(n.id),
      })),
    [notices, dismiss],
  );

  const value = useMemo(
    () => ({ flashItems, notify, breadcrumbs, setBreadcrumbs }),
    [flashItems, notify, breadcrumbs],
  );
  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole(): ConsoleState {
  const ctx = useContext(ConsoleContext);
  if (!ctx) throw new Error('useConsole must be used within ConsoleProvider');
  return ctx;
}

/** Sets the AppLayout breadcrumbs for the current page. */
export function useBreadcrumbs(items: BreadcrumbGroupProps.Item[]) {
  const { setBreadcrumbs } = useConsole();
  const key = JSON.stringify(items);
  useEffect(() => {
    setBreadcrumbs(JSON.parse(key));
  }, [key, setBreadcrumbs]);
}