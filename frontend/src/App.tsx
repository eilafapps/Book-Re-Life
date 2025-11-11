import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Page, User, Role } from './types';
import Layout from './components/Layout';
import { ToastProvider } from './components/ui/Toast';
import { jwtDecode } from 'jwt-decode';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const IntakeForm = lazy(() => import('./pages/IntakeForm'));
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Donors = lazy(() => import('./pages/Donors'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const DonorPayouts = lazy(() => import('./pages/DonorPayouts'));


const getUserFromToken = (token: string): User | null => {
    try {
        const decoded: { userId: string, username: string, role: Role } = jwtDecode(token);
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
  };

  if (isAuthLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
          return <Admin currentUser={currentUser!} />;
      case 'payouts':
        return <DonorPayouts />;
      default:
        return <Dashboard />;
    }
  };
  
  const loadingFallback = <div className="p-8">Loading page...</div>;

  return (
    <ToastProvider>
        {!currentUser ? (
             <Suspense fallback={loadingFallback}>
                <Login onLoginSuccess={handleLogin} />
            </Suspense>
        ) : (
            <div className="min-h-screen bg-secondary/50">
                <Layout 
                activePage={activePage} 
                setActivePage={setActivePage}
                currentUser={currentUser}
                onLogout={handleLogout}
                >
                    <Suspense fallback={loadingFallback}>
                        {renderPage()}
                    </Suspense>
                </Layout>
            </div>
        )}
    </ToastProvider>
  );
};

export default App;
