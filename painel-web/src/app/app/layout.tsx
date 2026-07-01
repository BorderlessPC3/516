import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Heróis dos Prêmios',
  description: 'Campanhas promocionais com vídeos, cupons e sorteios.',
};

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
