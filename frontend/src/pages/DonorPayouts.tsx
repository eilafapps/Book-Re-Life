import React, { useState, useEffect } from 'react';
import { api, handleApiError } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Donor } from '../types';
import { useToast } from '../components/ui/Toast';

interface PayoutData {
    donor: Donor;
    totalOwed: number;
    soldBooksCount: number;
}

const DonorPayouts: React.FC = () => {
    const [payouts, setPayouts] = useState<PayoutData[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchPayouts = async () => {
            setLoading(true);
            try {
                const data = await api.getDonorPayouts();
                setPayouts(data);
            } catch (error) {
                addToast('error', handleApiError(error));
            } finally {
                setLoading(false);
            }
        };
        fetchPayouts();
    }, []);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(value);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Donor Payouts</CardTitle>
                <CardDescription>
                    This report shows the total amount owed to each donor for their books that have been sold.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted">
                            <tr>
                                <th scope="col" className="px-6 py-3">Donor Name</th>
                                <th scope="col" className="px-6 py-3">Donor Code</th>
                                <th scope="col" className="px-6 py-3">Sold Books Count</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Owed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center p-6">Loading payout data...</td></tr>
                            ) : payouts.length === 0 ? (
                                <tr><td colSpan={4} className="text-center p-6 text-muted-foreground">No sold books with a buying cost yet.</td></tr>
                            ) : payouts.map(({ donor, totalOwed, soldBooksCount }) => (
                                <tr key={donor.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{donor.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{donor.donorCode}</td>
                                    <td className="px-6 py-4">{soldBooksCount}</td>
                                    <td className="px-6 py-4 font-semibold text-right">{formatCurrency(totalOwed)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default DonorPayouts;