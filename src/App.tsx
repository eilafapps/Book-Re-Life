import React, { useState, useEffect } from 'react';
import { Page, User } from '@/types';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import IntakeForm from '@/pages/IntakeForm';
import POS from '@/pages/POS';
import Inventory from '@/pages/Inventory';
import Donors from '@/pages/Donors';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import { ToastProvider } from '@/components/ui/Toast';
import DonorPayouts from '@/pages/DonorPayouts';
import { api } from '@/services/mockApi';
// Fix: Removed initGeminiService as it's no longer needed per Gemini API guidelines.
// This also resolves the import error.

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<Page>('dashboard');

  // Fix: Removed client-side fetching of API key and gemini initialization
  // to adhere to security best practices and Gemini API guidelines.

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <ToastProvider>
        <Login onLoginSuccess={handleLogin} />
      </ToastProvider>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'intake':
        return <IntakeForm />;
      case 'pos':
        return <POS />;
      case 'inventory':
        return <Inventory />;
      case 'donors':
          return <Donors />;
      case 'admin':
          return <Admin currentUser={currentUser} />;
      case 'payouts':
        return <DonorPayouts />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-secondary/50">
        <Layout 
          activePage={activePage} 
          setActivePage={setActivePage}
          currentUser={currentUser}
          onLogout={handleLogout}
        >
          {renderPage()}
        </Layout>
      </div>
    </ToastProvider>
  );
};

export default App;