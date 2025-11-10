
import { Author, BookCondition, BookCopy, BookTitle, Category, Donor, Language, Role, Sale, User } from '../types';

const API_BASE_URL = '/api'; // Using a relative path for easy proxying in production

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'An API error occurred');
    }
    // Handle cases where the response body might be empty (e.g., for 204 No Content)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
};

const get = (endpoint: string) => fetch(`${API_BASE_URL}${endpoint}`).then(handleResponse);
const post = (endpoint: string, body: any) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
}).then(handleResponse);
const put = (endpoint: string, body: any) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
}).then(handleResponse);
const patch = (endpoint: string) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH'
}).then(handleResponse);


class ApiService {
    // Auth & User Management
    async login(username: string, password_DO_NOT_USE_IN_PROD: string): Promise<User | null> {
        return post('/auth/login', { username, password: password_DO_NOT_USE_IN_PROD });
    }

    async getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
        return get('/users');
    }

    async addUser(data: Pick<User, 'username' | 'role'> & {password: string}): Promise<User> {
        return post('/users', data);
    }

    async toggleUserStatus(id: string): Promise<User> {
        return patch(`/users/${id}/toggle-status`);
    }

    // Data Getters
    async getDonors() { return get('/donors'); }
    async getLanguages() { return get('/languages'); }
    async getCategories() { return get('/categories'); }
    async getAuthors() { return get('/authors'); }
    async getBookTitles() { return get('/book-titles'); }
    async getInventory() { return get('/inventory'); }

    async getBookCopyByCode(code: string) {
        return get(`/inventory/by-code/${code}`);
    }

    async getDashboardData() {
        return get('/dashboard');
    }
    
    // Data Creation / Mutation
    async addDonor(data: { name: string; phone?: string; email?: string }) {
        return post('/donors', data);
    }
    
    async updateDonor(id: string, data: Partial<Pick<Donor, 'name' | 'email' | 'phone'>>) {
        return put(`/donors/${id}`, data);
    }

    async toggleDonorStatus(id: string) {
        return patch(`/donors/${id}/toggle-status`);
    }

    async addLookupItem(type: 'author' | 'language' | 'category', name: string) {
        return post(`/lookup/${type}`, { name });
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
    }) {
        return post('/inventory', data);
    }

    async createSale(cart: { bookCopyId: string, price: number }[], taxRate: number, saleDetails: { soldPartyName?: string, soldPartyContact?: string }) {
        return post('/sales', { cart, taxRate, saleDetails });
    }

    async getDonorPayouts() {
        return get('/payouts/donors');
    }
}

export const api = new ApiService();
