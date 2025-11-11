
import axios from 'axios';
import { Author, BookCondition, BookCopyDetails, Category, Donor, Language, Role, Sale, User } from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// This is a simplified error handler. In a real app, you might want a global error handler.
const handleApiError = (error: unknown, fallbackMessage: string) => {
    // FIX: The error "Property 'response' does not exist on type 'unknown'" can occur if the
    // `axios.isAxiosError` type guard is not correctly narrowing the `error` type in the
    // project's specific TypeScript environment. This revised implementation is more robust.
    // It safely checks for the response and a nested message property, providing a more
    // reliable error message, and falls back gracefully.
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === 'object' && 'message' in data && typeof (data as {message: unknown}).message === 'string') {
            return (data as {message: string}).message;
        }
        // Fallback to the general error message if no specific one is found in the response.
        return error.message;
    }

    // Handle other types of errors.
    if (error instanceof Error) {
        return error.message;
    }

    return fallbackMessage;
};

// --- API Service Definition ---
export const api = {
    // Auth
    async login(username: string, password_DO_NOT_USE_IN_PROD: string): Promise<{ user: User, token: string }> {
        const { data } = await apiClient.post('/auth/login', { username, password: password_DO_NOT_USE_IN_PROD });
        if(data.token) {
            localStorage.setItem('authToken', data.token);
        }
        return data;
    },

    // Users (Admin)
    async getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
        const { data } = await apiClient.get('/admin/users');
        return data;
    },
    async addUser(userData: Pick<User, 'username' | 'role'> & {password: string}): Promise<User> {
        const { data } = await apiClient.post('/admin/users', userData);
        return data;
    },
    async toggleUserStatus(id: string): Promise<User> {
        const { data } = await apiClient.patch(`/admin/users/${id}/toggle-status`);
        return data;
    },

    // Donors
    async getDonors(): Promise<Donor[]> {
        const { data } = await apiClient.get('/donors');
        return data;
    },
    async addDonor(donorData: { name: string; phone?: string; email?: string }): Promise<Donor> {
        const { data } = await apiClient.post('/donors', donorData);
        return data;
    },
    async updateDonor(id: string, donorData: Partial<Pick<Donor, 'name' | 'email' | 'phone'>>): Promise<Donor> {
        const { data } = await apiClient.put(`/donors/${id}`, donorData);
        return data;
    },
    async toggleDonorStatus(id: string): Promise<Donor> {
        const { data } = await apiClient.patch(`/donors/${id}/toggle-status`);
        return data;
    },

    // Lookups (Authors, Categories, Languages)
    async getLookups(): Promise<{authors: Author[], categories: Category[], languages: Language[]}> {
       const { data } = await apiClient.get('/lookups');
       return data;
    },
    async addLookupItem(type: 'author' | 'language' | 'category', name: string): Promise<any> {
        const { data } = await apiClient.post('/lookups', { type, name });
        return data;
    },
    
    // Inventory & Intake
    async getInventory(): Promise<BookCopyDetails[]> {
        const { data } = await apiClient.get('/inventory');
        return data;
    },
     async getBookTitles() {
        const { data } = await apiClient.get('/inventory/titles');
        return data;
    },
    async getBookCopyByCode(code: string): Promise<BookCopyDetails> {
        const { data } = await apiClient.get(`/inventory/book-copy/${code}`);
        return data;
    },
    async addBookCopy(bookData: any) { // Define a proper type for this
        const { data } = await apiClient.post('/intake', bookData);
        return data;
    },

    // POS
    async createSale(cart: { bookCopyId: string, price: number }[], taxRate: number, saleDetails: { soldPartyName?: string, soldPartyContact?: string }) {
        const { data } = await apiClient.post('/pos/sale', { items: cart, ...saleDetails });
        return data;
    },
    
    // AI Suggestions
    async suggestBookDetails(title: string) {
        try {
            const { data } = await apiClient.post('/ai/suggest-details', { title });
            return data;
        } catch(error) {
            console.error("AI suggestion failed:", error);
            throw new Error(handleApiError(error, "Could not get AI suggestions."));
        }
    },

    // Dashboard & Reports
    async getDashboardData() {
        const { data } = await apiClient.get('/reports/dashboard');
        return data;
    },
    async getDonorPayouts() {
        const { data } = await apiClient.get('/reports/payouts');
        return data;
    }
};
