
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../../types';

interface ToastContextType {
  addToast: (type: 'success' | 'error', message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] w-full max-w-xs space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between w-full p-4 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <p>{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="ml-2 p-1 rounded-full hover:bg-white/20">
              &#x2715;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};