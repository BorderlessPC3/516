'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { isDevAuthEnabled } from '@/lib/dev-auth';
import { adminAuthService } from '@/services/auth/admin-auth.service';
import { FIREBASE_CONFIG_ERROR, isFirebaseConfigured } from '@/services/firebase/client';

export default function LoginPage() {
  const router = useRouter();
  const { signInDev } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isDevAuthEnabled()) {
        signInDev();
        router.push('/dashboard');
        return;
      }

      if (!isFirebaseConfigured()) {
        setError(FIREBASE_CONFIG_ERROR);
        return;
      }

      await adminAuthService.signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Heróis dos Prêmios</CardTitle>
          <p className="text-center text-muted-foreground text-sm">Painel Administrativo</p>
        </CardHeader>
        <CardContent>
          {isDevAuthEnabled() && (
            <p className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Modo desenvolvimento: autenticação desativada.
            </p>
          )}
          {!isDevAuthEnabled() && !isFirebaseConfigured() && (
            <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {FIREBASE_CONFIG_ERROR}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!isDevAuthEnabled()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isDevAuthEnabled()}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
