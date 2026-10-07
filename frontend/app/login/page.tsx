'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/hosted-zones');
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace('/hosted-zones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f3' }}>
      <div style={{ background: '#0f1b2a', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <img src="/aws-logo.svg" alt="AWS" height={26} />
      </div>
      <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #d5dbdb', padding: 32 }}>
          <form onSubmit={onSubmit}>
            <SpaceBetween size="l">
              <Box variant="h1" fontWeight="normal">Sign in</Box>
              {error && <Alert type="error">{error}</Alert>}
              <FormField label="Username">
                <Input
                  value={username}
                  autoFocus
                  onChange={({ detail }) => setUsername(detail.value)}
                />
              </FormField>
              <FormField label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={({ detail }) => setPassword(detail.value)}
                />
              </FormField>
              <Button variant="primary" fullWidth loading={submitting} formAction="submit">
                Sign in
              </Button>
              <Box variant="small" color="text-body-secondary">
                Demo credentials: <strong>admin</strong> / <strong>admin123</strong>
              </Box>
            </SpaceBetween>
          </form>
        </div>
      </div>
    </div>
  );
}