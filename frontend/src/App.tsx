
import React, { useState, useEffect } from 'react';
import { Page, User, Role } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import IntakeForm from './pages/IntakeForm';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Donors from './pages/Donors';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { ToastProvider } from './components/ui/Toast';
import DonorPayouts from './pages/DonorPayouts';
import { jwtDecode } from 'jwt-decode'; // You'll need to add a JWT decoding library

// Helper to decode JWT and get user info
const getUserFromToken = (token: string): User | null => {
    try {
        const decoded: { userId: string, username: string, role: Role } = jwtDecode(token);
        // This is a simplified user object. Adjust based on your JWT payload.
        return { id: decoded.userId, username: decoded.username, role: decoded.role, isActive: true, passwordHash: '' };
    } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem('authToken');
        return null;
    }
};


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      const user = getUserFromToken(token);
      if (user) {
        setCurrentUser(user);
      }
    }
    setIsAuthLoading(false);
  }, []);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('authToken');
    // We don't need to set a page, as the component will re-render to the login page
  };

  if (isAuthLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>; // Or a proper spinner
  }
  
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
