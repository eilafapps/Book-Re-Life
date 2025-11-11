import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { api, handleApiError } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useToast } from '../components/ui/Toast';

interface KpiData {
    totalBooks: number;
    soldBooks: number;
    totalRevenue: number;
    inventoryValue: number;
    totalProfit: number;
}
interface ChartData {
    revenueByMonth: { name: string; revenue: number }[];
    inventoryByCategory: { name: string; count: number }[];
    inventoryByDonor: { name: string; count: number }[];
}
interface ListData {
    top5BooksByStock: { name: string; count: number }[];
}


const Dashboard: React.FC = () => {
    const [kpis, setKpis] = useState<KpiData | null>(null);
    const [charts, setCharts] = useState<ChartData | null>(null);
    const [lists, setLists] = useState<ListData | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await api.getDashboardData();
                setKpis(data.kpis);
                // Set charts and lists if the backend provides them
                // setCharts(data.charts);
                // setLists(data.lists);
            } catch (error) {
                addToast('error', `Dashboard Error: ${handleApiError(error)}`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [addToast]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(value);

    if (loading) {
        return <div className="p-8">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader>
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle>{formatCurrency(kpis?.totalRevenue ?? 0)}</CardTitle>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardDescription>Total Profit</CardDescription>
                        <CardTitle>{formatCurrency(kpis?.totalProfit ?? 0)}</CardTitle>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardDescription>Inventory Value (Cost)</CardDescription>
                        <CardTitle>{formatCurrency(kpis?.inventoryValue ?? 0)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Books In Stock</CardDescription>
                        <CardTitle>{(kpis?.totalBooks ?? 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Books Sold</CardDescription>
                        <CardTitle>{(kpis?.soldBooks ?? 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Placeholder for future charts */}
            <div className="text-center text-muted-foreground p-8">
                <p>More detailed charts and lists will be available in a future update.</p>
            </div>
        </div>
    );
};

export default Dashboard;
