'use client';

import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import type { Campaign } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCollectionCount, listDocuments } from '@/services/firebase/firestore.service';

const chartData = [
  { name: 'Jan', views: 4000, conversions: 2400 },
  { name: 'Fev', views: 3000, conversions: 1398 },
  { name: 'Mar', views: 5000, conversions: 3800 },
  { name: 'Abr', views: 4780, conversions: 3908 },
  { name: 'Mai', views: 5890, conversions: 4800 },
  { name: 'Jun', views: 6390, conversions: 5300 },
];

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [users, campaigns, coupons, draws] = await Promise.all([
        getCollectionCount(FIRESTORE_COLLECTIONS.USERS),
        getCollectionCount(FIRESTORE_COLLECTIONS.CAMPAIGNS),
        getCollectionCount(FIRESTORE_COLLECTIONS.COUPONS),
        getCollectionCount(FIRESTORE_COLLECTIONS.DRAWS),
      ]);

      const campaignList = await listDocuments<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS);
      const totalViews = campaignList.reduce((sum, c) => sum + (c.viewCount || 0), 0);
      const totalConversions = campaignList.reduce((sum, c) => sum + (c.conversionCount || 0), 0);

      return {
        totalUsers: users,
        totalCampaigns: campaigns,
        totalCoupons: coupons,
        totalDraws: draws,
        totalViews,
        totalConversions,
        conversionRate: totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(1) : '0',
      };
    },
  });

  const kpis = [
    { label: 'Usuários', value: stats?.totalUsers ?? '—' },
    { label: 'Campanhas', value: stats?.totalCampaigns ?? '—' },
    { label: 'Cupons', value: stats?.totalCoupons ?? '—' },
    { label: 'Sorteios', value: stats?.totalDraws ?? '—' },
    { label: 'Visualizações', value: stats?.totalViews ?? '—' },
    { label: 'Conversões', value: stats?.totalConversions ?? '—' },
    { label: 'Taxa Conversão', value: stats ? `${stats.conversionRate}%` : '—' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
            <CardTitle>Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} />
                <Line type="monotone" dataKey="views" stroke="#e94560" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#ffd700" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
