
// Fix: Added missing imports for types used in new method signatures.
import { Author, BookCondition, BookCopy, BookTitle, Category, Donor, Language, Role, Sale, User, BookCopyDetails, PayoutData } from '../types';

const API_BASE_URL = '/api';

class ApiService {
    private token: string | null = null;

    private getHeaders() {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'An API error occurred');
        }
        if (response.status === 204) {
            return {} as T;
        }
        return response.json() as Promise<T>;
    }

    private get<T>(endpoint: string): Promise<T> {
        return fetch(`${API_BASE_URL}${endpoint}`, { headers: this.getHeaders() }).then(res => this.handleResponse<T>(res));
    }

    private post<T>(endpoint:string, body: any): Promise<T> {
        return fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        }).then(res => this.handleResponse<T>(res));
    }

    private put<T>(endpoint: string, body: any): Promise<T> {
        return fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        }).then(res => this.handleResponse<T>(res));
    }

    private patch<T>(endpoint: string): Promise<T> {
        return fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
        }).then(res => this.handleResponse<T>(res));
    }


    // Auth & User Management
    async login(username: string, password_DO_NOT_USE_IN_PROD: string): Promise<User | null> {
        const response = await this.post<{user: User, token: string}>('/auth/login', { username, password: password_DO_NOT_USE_IN_PROD });
        if (response && response.token) {
            this.token = response.token;
            return response.user;
        }
        return null;
    }

    logout() {
        this.token = null;
    }

    async getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
        return this.get('/users');
    }

    async addUser(data: Pick<User, 'username' | 'role'> & {password: string}): Promise<User> {
        return this.post('/users', data);
    }

    async toggleUserStatus(id: string): Promise<User> {
        return this.patch(`/users/${id}/toggle-status`);
    }

    // Data Getters
    // Fix: Added specific return types to all data getter methods.
    async getDonors(): Promise<Donor[]> { return this.get('/donors'); }
    async getLanguages(): Promise<Language[]> { return this.get('/languages'); }
    async getCategories(): Promise<Category[]> { return this.get('/categories'); }
    async getAuthors(): Promise<Author[]> { return this.get('/authors'); }
    async getBookTitles(): Promise<BookTitle[]> { return this.get('/book-titles'); }
    async getInventory(): Promise<BookCopyDetails[]> { return this.get('/inventory'); }

    async getBookCopyByCode(code: string): Promise<BookCopyDetails> {
        return this.get(`/inventory/by-code/${code}`);
    }

    async getDashboardData() {
        return this.get('/dashboard');
    }
    
    // Data Creation / Mutation
    // Fix: Added specific return types to mutation methods.
    async addDonor(data: { name: string; phone?: string; email?: string }): Promise<Donor> {
        return this.post('/donors', data);
    }
    
    async updateDonor(id: string, data: Partial<Pick<Donor, 'name' | 'email' | 'phone'>>): Promise<Donor> {
        return this.put(`/donors/${id}`, data);
    }

    async toggleDonorStatus(id: string): Promise<Donor> {
        return this.patch(`/donors/${id}/toggle-status`);
    }

    // Fix: Used method overloads for type-safe results based on input.
    async addLookupItem(type: 'author', name: string): Promise<Author>;
    async addLookupItem(type: 'language', name: string): Promise<Language>;
    async addLookupItem(type: 'category', name: string): Promise<Category>;
    async addLookupItem(type: 'author' | 'language' | 'category', name: string): Promise<Author | Language | Category> {
        return this.post(`/lookup/${type}`, { name });
    }
    
    async addBookCopy(data: {
        donorId: string;
        title: string;
        authorId: string;
        languageId: string;
        categoryId: string;
        condition: BookCondition;
        shelfLocation: string;
        buyingPrice: number;
        sellingPrice: number;
        isFreeDonation: boolean;
        note?: string;
    }): Promise<BookCopy> {
        return this.post('/inventory', data);
    }

    async createSale(cart: { bookCopyId: string, price: number }[], taxRate: number, saleDetails: { soldPartyName?: string, soldPartyContact?: string }): Promise<Sale> {
        return this.post('/sales', { cart, taxRate, saleDetails });
    }

    async getDonorPayouts(): Promise<PayoutData[]> {
        return this.get('/payouts/donors');
    }
}

export const api = new ApiService();
