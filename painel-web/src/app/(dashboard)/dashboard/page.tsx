'use client';

import {
  FIRESTORE_COLLECTIONS,
  type Campaign,
  type ChartDataPoint,
  type DashboardFilters,
  type DashboardKPIs,
  CampaignStatus,
  CouponStatus,
  DrawStatus,
  toDate,
} from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { exportToCsv, exportToExcel, exportToPdf } from '@/services/export.service';
import { getCollectionCount, listDocuments } from '@/services/firebase/firestore.service';

async function fetchDashboardStats(filters: DashboardFilters): Promise<{
  kpis: DashboardKPIs;
  chartData: ChartDataPoint[];
  campaigns: Campaign[];
}> {
  const [users, campaigns, coupons, draws, notifications, qrScans] = await Promise.all([
    getCollectionCount(FIRESTORE_COLLECTIONS.USERS),
    listDocuments<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS, 500),
    listDocuments(FIRESTORE_COLLECTIONS.COUPONS, 500),
    listDocuments(FIRESTORE_COLLECTIONS.DRAWS, 200),
    listDocuments(FIRESTORE_COLLECTIONS.NOTIFICATIONS, 200),
    listDocuments(FIRESTORE_COLLECTIONS.QR_SCANS, 500),
  ]);

  let filteredCampaigns = campaigns;
  if (filters.campaignId) {
    filteredCampaigns = campaigns.filter((c) => c.id === filters.campaignId);
  }
  if (filters.cityId) {
    filteredCampaigns = filteredCampaigns.filter((c) => c.cityId === filters.cityId);
  }
  if (filters.state) {
    filteredCampaigns = filteredCampaigns.filter((c) => c.state === filters.state);
  }

  const totalViews = filteredCampaigns.reduce((sum, c) => sum + (c.viewCount || 0), 0);
  const totalConversions = filteredCampaigns.reduce((sum, c) => sum + (c.conversionCount || 0), 0);
  const activeCampaigns = filteredCampaigns.filter((c) => c.status === CampaignStatus.ACTIVE).length;
  const activeCoupons = coupons.filter((c) => (c as { status: string }).status === CouponStatus.ACTIVE).length;
  const expiredCoupons = coupons.filter((c) => (c as { status: string }).status === CouponStatus.EXPIRED).length;
  const openDraws = draws.filter((d) => (d as { status: string }).status === DrawStatus.OPEN).length;
  const pushSent = notifications.filter((n) => (n as { status: string }).status === 'SENT').length;

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData: ChartDataPoint[] = monthNames.slice(0, 6).map((name, i) => {
    const monthCampaigns = campaigns.filter((c) => {
      const d = toDate(c.createdAt);
      return d.getMonth() === i;
    });
    return {
      name,
      views: monthCampaigns.reduce((s, c) => s + (c.viewCount || 0), 0),
      conversions: monthCampaigns.reduce((s, c) => s + (c.conversionCount || 0), 0),
      qrScans: Math.floor(qrScans.length / 6),
      coins: monthCampaigns.reduce((s, c) => s + (c.coinReward || 0), 0),
    };
  });

  const kpis: DashboardKPIs = {
    totalUsers: users,
    activeUsers: users,
    inactiveUsers: 0,
    totalCampaigns: campaigns.length,
    activeCampaigns,
    totalCoupons: coupons.length,
    activeCoupons,
    expiredCoupons,
    totalDraws: draws.length,
    openDraws,
    totalViews,
    totalConversions,
    conversionRate: totalViews > 0 ? Number(((totalConversions / totalViews) * 100).toFixed(1)) : 0,
    totalCoins: filteredCampaigns.reduce((s, c) => s + (c.coinReward || 0) * (c.conversionCount || 0), 0),
    totalQrScans: qrScans.length,
    avgWatchTimeSeconds: 0,
    completionRate: totalViews > 0 ? Number(((totalConversions / totalViews) * 100).toFixed(1)) : 0,
    pushSent,
  };

  return { kpis, chartData, campaigns: filteredCampaigns };
}

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', filters],
    queryFn: () => fetchDashboardStats(filters),
  });

  const kpis = data?.kpis;
  const chartData = data?.chartData ?? [];

  const kpiCards = [
    { label: 'Usuários', value: kpis?.totalUsers ?? '—' },
    { label: 'Campanhas Ativas', value: kpis?.activeCampaigns ?? '—' },
    { label: 'Cupons Ativos', value: kpis?.activeCoupons ?? '—' },
    { label: 'Sorteios Abertos', value: kpis?.openDraws ?? '—' },
    { label: 'Visualizações', value: kpis?.totalViews ?? '—' },
    { label: 'Conversões', value: kpis?.totalConversions ?? '—' },
    { label: 'Taxa Conversão', value: kpis ? `${kpis.conversionRate}%` : '—' },
    { label: 'QR Lidos', value: kpis?.totalQrScans ?? '—' },
    { label: 'Moedas Distribuídas', value: kpis?.totalCoins ?? '—' },
    { label: 'Push Enviados', value: kpis?.pushSent ?? '—' },
    { label: 'Taxa Conclusão', value: kpis ? `${kpis.completionRate}%` : '—' },
    { label: 'Cupons Expirados', value: kpis?.expiredCoupons ?? '—' },
  ];

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const rows = (data?.campaigns ?? []).map((c) => ({
      nome: c.name,
      status: c.status,
      visualizacoes: c.viewCount,
      conversoes: c.conversionCount,
      moedas: c.coinReward,
    }));
    const cols = ['nome', 'status', 'visualizacoes', 'conversoes', 'moedas'] as const;

    if (format === 'csv') exportToCsv(rows, [...cols], 'dashboard-campanhas');
    else if (format === 'excel') exportToExcel(rows, [...cols], 'dashboard-campanhas');
    else exportToPdf('Dashboard - Campanhas', JSON.stringify(rows, null, 2), 'dashboard');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>Excel</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Filtrar por estado"
          value={filters.state ?? ''}
          onChange={(e) => setFilters({ ...filters, state: e.target.value })}
        />
        <Input
          placeholder="ID da cidade"
          value={filters.cityId ?? ''}
          onChange={(e) => setFilters({ ...filters, cityId: e.target.value })}
        />
        <Input
          placeholder="ID da campanha"
          value={filters.campaignId ?? ''}
          onChange={(e) => setFilters({ ...filters, campaignId: e.target.value })}
        />
        <Input
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando KPIs...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visualizações vs Conversões</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} />
                <Bar dataKey="views" fill="#e94560" name="Visualizações" />
                <Bar dataKey="conversions" fill="#ffd700" name="Conversões" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Scans e Moedas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} />
                <Line type="monotone" dataKey="qrScans" stroke="#e94560" strokeWidth={2} name="QR Lidos" />
                <Line type="monotone" dataKey="coins" stroke="#ffd700" strokeWidth={2} name="Moedas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
