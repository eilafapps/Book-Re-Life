
import React, { useState, useEffect } from 'react';
import { Donor } from '../types';
import { api } from '../services/mockApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

const Donors: React.FC = () => {
    const [donors, setDonors] = useState<Donor[]>([]);
    const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDonor, setCurrentDonor] = useState<Partial<Donor> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { addToast } = useToast();

    const loadDonors = async () => {
        setLoading(true);
        try {
            const data = await api.getDonors();
            setDonors(data);
            setFilteredDonors(data);
        } catch (error) {
            addToast('error', "Failed to load donors.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDonors();
    }, []);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = donors.filter(donor =>
            donor.name.toLowerCase().includes(lowercasedFilter) ||
            (donor.email && donor.email.toLowerCase().includes(lowercasedFilter)) ||
            donor.donorCode.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredDonors(filtered);
    }, [searchTerm, donors]);

    const handleOpenModal = (donor: Partial<Donor> | null = null) => {
        setCurrentDonor(donor ? { ...donor } : { name: '', email: '', phone: '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentDonor(null);
    };

    const handleSaveDonor = async () => {
        if (!currentDonor || !currentDonor.name) {
            addToast('error', 'Donor name is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (currentDonor.id) {
                await api.updateDonor(currentDonor.id, { name: currentDonor.name, email: currentDonor.email, phone: currentDonor.phone });
                addToast('success', 'Donor updated successfully.');
            } else {
                await api.addDonor({ name: currentDonor.name, email: currentDonor.email || undefined, phone: currentDonor.phone || undefined });
                addToast('success', 'Donor added successfully.');
            }
            handleCloseModal();
            await loadDonors();
        } catch (error) {
            addToast('error', 'Failed to save donor.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleToggleStatus = async (donorId: string) => {
        try {
            await api.toggleDonorStatus(donorId);
            addToast('success', 'Donor status updated.');
            await loadDonors();
        } catch (error) {
            addToast('error', 'Failed to update donor status.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentDonor) {
            setCurrentDonor({ ...currentDonor, [e.target.name]: e.target.value });
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Donors</CardTitle>
                            <CardDescription>Manage your book donors.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenModal()}>Add New Donor</Button>
                    </div>
                    <div className="pt-4">
                        <Input 
                            placeholder="Search by name, email, or donor code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                             <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Donor Code</th>
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Contact</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center p-6">Loading donors...</td></tr>
                                ) : filteredDonors.map(donor => (
                                    <tr key={donor.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs">{donor.donorCode}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{donor.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">{donor.email || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{donor.phone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${donor.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {donor.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenModal(donor)}>Edit</Button>
                                            <Button variant={donor.isActive ? 'destructive' : 'secondary'} size="sm" onClick={() => handleToggleStatus(donor.id)}>
                                                {donor.isActive ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={currentDonor?.id ? 'Edit Donor' : 'Add New Donor'}
                    footer={
                        <>
                            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                            <Button onClick={handleSaveDonor} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Donor Name *</label>
                            <Input name="name" value={currentDonor?.name || ''} onChange={handleInputChange} placeholder="John Doe" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Email</label>
                            <Input type="email" name="email" value={currentDonor?.email || ''} onChange={handleInputChange} placeholder="john.doe@example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Phone</label>
                            <Input name="phone" value={currentDonor?.phone || ''} onChange={handleInputChange} placeholder="555-123-4567" />
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default Donors;