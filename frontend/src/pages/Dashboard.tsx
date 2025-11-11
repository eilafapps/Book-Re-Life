import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await api.getDashboardData();
                setKpis(data.kpis);
                setCharts(data.charts);
                setLists(data.lists);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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
                        <CardTitle>{kpis?.totalBooks.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Books Sold</CardDescription>
                        <CardTitle>{kpis?.soldBooks.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={charts?.revenueByMonth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => formatCurrency(value as number)}/>
                                <Tooltip formatter={(value) => formatCurrency(value as number)}/>
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#1f2937" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Books by Stock</CardTitle>
                        <CardDescription>The most numerous titles in your inventory.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4 pt-2">
                            {lists?.top5BooksByStock && lists.top5BooksByStock.length > 0 ? lists.top5BooksByStock.map((book, index) => (
                                <li key={index} className="flex justify-between items-center text-sm">
                                    <span className="truncate pr-4">{book.name}</span>
                                    <span className="font-bold bg-secondary px-2 py-1 rounded-md text-secondary-foreground">{book.count} copies</span>
                                </li>
                            )) : <p className="text-sm text-muted-foreground">Not enough data.</p>}
                        </ul>
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={charts?.inventoryByCategory}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#1f2937" name="Number of Books" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory by Donor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={charts?.inventoryByDonor}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#6b7280" name="Books in Stock" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
