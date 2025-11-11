
import React, { useState, useEffect } from 'react';
import { Author, Category, Language, Role, User } from '../types';
import { api } from '../services/mockApi';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';

type LookupType = 'author' | 'language' | 'category';

interface ManageSectionProps<T extends { id: string; name: string }> {
  title: string;
  items: T[];
  onAdd: (name: string) => Promise<void>;
}

const ManageSection = <T extends { id: string; name: string }>({ title, items, onAdd }: ManageSectionProps<T>) => {
    const [newItemName, setNewItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        
        setIsSubmitting(true);
        try {
            await onAdd(newItemName);
            setNewItemName('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage {title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <Input 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={`New ${title.slice(0, -1)} Name`}
                        disabled={isSubmitting}
                    />
                    <Button type="submit" disabled={isSubmitting || !newItemName.trim()}>
                        {isSubmitting ? 'Adding...' : 'Add'}
                    </Button>
                </form>
                <ul className="h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-secondary/30">
                     {items.length > 0 ? items.map(item => (
                        <li key={item.id} className="text-sm p-2 bg-background rounded-md shadow-sm">{item.name}</li>
                    )) : <p className="text-sm text-muted-foreground text-center p-4">No {title.toLowerCase()} yet.</p>}
                </ul>
            </CardContent>
        </Card>
    );
};


const Admin: React.FC<{currentUser: User}> = ({currentUser}) => {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [authors, setAuthors] = useState<Author[]>([]);
    const [users, setUsers] = useState<Omit<User, 'passwordHash'>[]>([]);

    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isSubmittingUser, setIsSubmittingUser] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<Role>(Role.Staff);


    const fetchData = async () => {
        try {
            const [langs, cats, auths, userList] = await Promise.all([
                api.getLanguages(),
                api.getCategories(),
                api.getAuthors(),
                api.getUsers()
            ]);
            setLanguages(langs);
            setCategories(cats);
            setAuthors(auths);
            setUsers(userList);
        } catch {
            addToast('error', 'Failed to load lookup data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddItem = async (type: LookupType, name: string) => {
        try {
            await api.addLookupItem(type, name);
            addToast('success', `${type.charAt(0).toUpperCase() + type.slice(1)} added.`);
            setLoading(true);
            await fetchData();
        } catch {
            addToast('error', `Failed to add ${type}.`);
        }
    };

    const handleAddUser = async () => {
        if (!newUsername || !newPassword) {
            addToast('error', 'Username and password are required.');
            return;
        }
        setIsSubmittingUser(true);
        try {
            await api.addUser({ username: newUsername, password: newPassword, role: newRole });
            addToast('success', 'User created successfully.');
            setIsUserModalOpen(false);
            setNewUsername('');
            setNewPassword('');
            setNewRole(Role.Staff);
            await fetchData();
        } catch (error) {
            addToast('error', error instanceof Error ? error.message : 'Failed to create user.');
        } finally {
            setIsSubmittingUser(false);
        }
    };
    
    const handleToggleUserStatus = async (userId: string) => {
        try {
            await api.toggleUserStatus(userId);
            addToast('success', 'User status updated.');
            await fetchData();
        } catch (error) {
            addToast('error', 'Failed to update user status.');
        }
    }
    
    if (loading) return <div className="p-8">Loading admin panel...</div>;

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
                <p className="text-muted-foreground">Manage system-wide lookup values and users.</p>

                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-center">
                             <CardTitle>Manage Users</CardTitle>
                             <Button onClick={() => setIsUserModalOpen(true)}>Add New User</Button>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm text-left">
                             <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Username</th>
                                    <th scope="col" className="px-6 py-3">Role</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{user.username}</td>
                                        <td className="px-6 py-4">{user.role}</td>
                                        <td className="px-6 py-4">
                                             <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button 
                                                variant={user.isActive ? 'destructive' : 'secondary'} 
                                                size="sm"
                                                onClick={() => handleToggleUserStatus(user.id)}
                                                disabled={user.id === currentUser.id}
                                            >
                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ManageSection title="Categories" items={categories} onAdd={(name) => handleAddItem('category', name)} />
                    <ManageSection title="Languages" items={languages} onAdd={(name) => handleAddItem('language', name)} />
                    <ManageSection title="Authors" items={authors} onAdd={(name) => handleAddItem('author', name)} />
                </div>
            </div>

            <Modal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                title="Add New User"
                footer={<>
                    <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddUser} disabled={isSubmittingUser}>{isSubmittingUser ? 'Saving...' : 'Save User'}</Button>
                </>}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Username *</label>
                        <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g., jsmith" />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Password *</label>
                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Role *</label>
                        <Select value={newRole} onChange={e => setNewRole(e.target.value as Role)}>
                            <option value={Role.Staff}>Staff</option>
                            <option value={Role.Admin}>Admin</option>
                        </Select>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Admin;