/// <reference types="vite/client" />

import axios, { AxiosError } from 'axios';
import { Author, Category, Donor, Language, Sale, User, BookCopyDetails, BookTitle } from '../types';

const apiClient = axios.create({
  // The VITE_API_BASE_URL must be set in the frontend/.env file
  // Example: VITE_API_BASE_URL=http://localhost:3001
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A more robust error handler.
export const handleApiError = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        // FIX: Safely access the message property from the error response data.
        // The response data can be of 'unknown' type, so we need to check if it's an object
        // with a 'message' property before accessing it.
        const serverErrorData = error.response?.data;
        if (serverErrorData && typeof serverErrorData === 'object' && 'message' in serverErrorData && typeof (serverErrorData as { message: unknown }).message === 'string') {
            return (serverErrorData as { message: string }).message;
        }
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred.';
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
    async addLookupItem(type: 'author' | 'language' | 'category', name: string): Promise<Author | Category | Language> {
        const { data } = await apiClient.post('/lookups', { type, name });
        return data;
    },
    
    // Inventory & Intake
    async getInventory(): Promise<BookCopyDetails[]> {
        const { data } = await apiClient.get('/inventory');
        return data;
    },
     async getBookTitles(): Promise<BookTitle[]> {
        const { data } = await apiClient.get('/inventory/titles');
        return data;
    },
    async getBookCopyByCode(code: string): Promise<BookCopyDetails> {
        const { data } = await apiClient.get(`/inventory/book-copy/${code}`);
        return data;
    },
    async addBookCopy(bookData: any) { // Consider creating a specific DTO for this
        const { data } = await apiClient.post('/intake', bookData);
        return data;
    },

    // POS
    async createSale(cart: { bookCopyId: string, price: number }[], saleDetails: { soldPartyName?: string, soldPartyContact?: string }): Promise<Sale> {
        const { data } = await apiClient.post('/pos/sale', { items: cart, ...saleDetails });
        return data;
    },
    
    // AI Suggestions
    async suggestBookDetails(title: string) {
        const { data } = await apiClient.post('/ai/suggest-details', { title });
        return data;
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