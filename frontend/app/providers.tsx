'use client';

import { ReactNode, useEffect } from 'react';
import { applyTheme } from '@cloudscape-design/components/theming';
import { AuthProvider } from '@/lib/auth';

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const { reset } = applyTheme({
      theme: {
        tokens: {
          colorBackgroundButtonPrimaryDefault: '#ec7211',
          colorBackgroundButtonPrimaryHover: '#eb5f07',
          colorBackgroundButtonPrimaryActive: '#eb5f07',
          colorTextButtonPrimaryDefault: '#0f1b2a',
          colorTextButtonPrimaryHover: '#0f1b2a',
          colorTextButtonPrimaryActive: '#0f1b2a',
        },
      },
    });
    return reset;
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}