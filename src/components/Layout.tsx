import React, { useMemo } from 'react';
import { Page, User, Role } from '../types';
import Button from './ui/Button';

interface LayoutProps {
  children: React.ReactNode;
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentUser: User;
  onLogout: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactElement;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`}
  >
    <span className="mr-3">{icon}</span>
    {label}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, currentUser, onLogout }) => {
    const navigation = useMemo(() => {
        const allNavItems: { page: Page; label: string; icon: React.ReactElement; roles: Role[] }[] = [
            { page: 'dashboard', label: 'Dashboard', icon: <ChartIcon />, roles: [Role.Admin, Role.Staff] },
            { page: 'intake', label: 'Book Intake', icon: <PlusCircleIcon />, roles: [Role.Admin, Role.Staff] },
            { page: 'pos', label: 'Point of Sale', icon: <CashierIcon />, roles: [Role.Admin, Role.Staff] },
            { page: 'inventory', label: 'Inventory', icon: <BookIcon />, roles: [Role.Admin, Role.Staff] },
            { page: 'donors', label: 'Donors', icon: <UsersIcon />, roles: [Role.Admin] },
            { page: 'payouts', label: 'Donor Payouts', icon: <DollarSignIcon />, roles: [Role.Admin] },
            { page: 'admin', label: 'Admin', icon: <SettingsIcon />, roles: [Role.Admin] },
        ];
        return allNavItems.filter(item => item.roles.includes(currentUser.role));
    }, [currentUser]);
    
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-card border-r border-border p-4 flex flex-col">
        <div className="flex items-center mb-8">
          <BookOpenIcon />
          <h1 className="ml-2 text-xl font-bold text-primary">Book Re-Life</h1>
        </div>
        <nav className="flex flex-col space-y-2">
            {navigation.map(item => (
                <NavItem
                    key={item.page}
                    label={item.label}
                    icon={item.icon}
                    isActive={activePage === item.page}
                    onClick={() => setActivePage(item.page)}
                />
            ))}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
            <div className='p-2 rounded-lg bg-secondary/50'>
              <p className='text-sm font-semibold'>{currentUser.username}</p>
              <p className='text-xs text-muted-foreground'>{currentUser.role}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start mt-2" onClick={onLogout}>
              <LogOutIcon className="mr-2 h-4 w-4" />
              Logout
            </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
            {children}
        </div>
      </main>
    </div>
  );
};

// SVG Icons
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>;
const CashierIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 12h-4M18 10V8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h.01"/><path d="M6 18h.01"/><path d="M10 18h.01"/><path d="M14 14h.01"/><path d="M18 14h.01"/><path d="M14 18h.01"/><path d="M18 18h.01"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;


export default Layout;
