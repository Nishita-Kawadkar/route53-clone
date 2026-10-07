'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppLayout from '@cloudscape-design/components/app-layout';
import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Flashbar from '@cloudscape-design/components/flashbar';
import Input from '@cloudscape-design/components/input';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Spinner from '@cloudscape-design/components/spinner';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import { useAuth } from '@/lib/auth';
import { ConsoleProvider, useConsole } from '@/lib/console-context';
import { NAV_ITEMS } from '@/lib/nav';

function Frame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { flashItems, breadcrumbs } = useConsole();
  const [navOpen, setNavOpen] = useState(true);

  const activeHref = '/' + (pathname.split('/')[1] ?? '');
  const isForm = /\/(create|new|edit)$/.test(pathname);
  const contentType = pathname === '/hosted-zones' ? 'table' : isForm ? 'form' : 'default';

  return (
    <>
      <div id="top-nav" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{
            href: '/hosted-zones',
            logo: { src: '/aws-logo.svg', alt: 'AWS' },
          }}
          search={<Input type="search" placeholder="Search" value="" onChange={() => {}} />}
          utilities={[
            {
              type: 'menu-dropdown',
              text: 'Global',
              items: [{ id: 'global', text: 'Global' }],
            },
            {
              type: 'menu-dropdown',
              text: user?.username ?? '',
              description: 'Account ID: 1234-5678-9012',
              iconName: 'user-profile',
              items: [{ id: 'signout', text: 'Sign out' }],
              onItemClick: async ({ detail }) => {
                if (detail.id === 'signout') {
                  await logout();
                  router.replace('/login');
                }
              },
            },
          ]}
          i18nStrings={{
            searchIconAriaLabel: 'Search',
            searchDismissIconAriaLabel: 'Close search',
            overflowMenuTriggerText: 'More',
            overflowMenuTitleText: 'All',
            overflowMenuBackIconAriaLabel: 'Back',
            overflowMenuDismissIconAriaLabel: 'Close menu',
          }}
        />
      </div>

      <AppLayout
        headerSelector="#top-nav"
        footerSelector="#footer"
        contentType={contentType}
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        navigation={
          <SideNavigation
            header={{ text: 'Route 53', href: '/dashboard' }}
            activeHref={activeHref}
            items={NAV_ITEMS}
            onFollow={(e) => {
              e.preventDefault();
              router.push(e.detail.href);
            }}
          />
        }
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbs}
            onFollow={(e) => {
              e.preventDefault();
              router.push(e.detail.href);
            }}
          />
        }
        notifications={<Flashbar items={flashItems} />}
        toolsHide
        content={children}
      />

      <div
        id="footer"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 1000,
          background: '#0f1b2a',
          color: '#d1d5db',
          fontSize: 12,
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>CloudShell &nbsp;&nbsp; Feedback</span>
        <span>© 2026, Amazon Web Services, Inc. or its affiliates. &nbsp; Privacy &nbsp; Terms &nbsp; Cookie preferences</span>
      </div>
    </>
  );
}

export default function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <Box textAlign="center" padding={{ top: 'xxxl' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <ConsoleProvider>
      <Frame>{children}</Frame>
    </ConsoleProvider>
  );
}