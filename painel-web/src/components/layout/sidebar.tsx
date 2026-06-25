'use client';

import { Permission } from '@herois/shared';
import {
  LayoutDashboard,
  Megaphone,
  Video,
  Image,
  Users,
  Ticket,
  Trophy,
  Gift,
  Coins,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: Permission.DASHBOARD_VIEW,
  },
  {
    href: '/campaigns',
    label: 'Campanhas',
    icon: Megaphone,
    permission: Permission.CAMPAIGNS_READ,
  },
  { href: '/videos', label: 'Vídeos', icon: Video, permission: Permission.VIDEOS_READ },
  { href: '/images', label: 'Imagens', icon: Image, permission: Permission.IMAGES_READ },
  { href: '/users', label: 'Usuários', icon: Users, permission: Permission.USERS_READ },
  { href: '/coupons', label: 'Cupons', icon: Ticket, permission: Permission.COUPONS_READ },
  { href: '/draws', label: 'Sorteios', icon: Trophy, permission: Permission.DRAWS_READ },
  { href: '/prizes', label: 'Prêmios', icon: Gift, permission: Permission.PRIZES_READ },
  { href: '/coins', label: 'Moedas', icon: Coins, permission: Permission.COINS_READ },
  {
    href: '/notifications',
    label: 'Notificações',
    icon: Bell,
    permission: Permission.NOTIFICATIONS_READ,
  },
  {
    href: '/settings',
    label: 'Configurações',
    icon: Settings,
    permission: Permission.SETTINGS_READ,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, hasPermission, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">Heróis dos Prêmios</h1>
        <p className="text-sm text-muted-foreground mt-1">Painel Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter((item) => hasPermission(item.permission))
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-sm font-medium truncate">{admin?.name}</p>
        <p className="text-xs text-muted-foreground truncate">{admin?.role}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
