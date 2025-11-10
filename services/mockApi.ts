
import { Author, BookCondition, BookCopy, BookTitle, Category, Donor, Language, Role, Sale, User } from '../types';

// Seed Data
let users: User[] = [
    { id: 'u1', username: 'admin', passwordHash: 'admin123', role: Role.Admin, isActive: true },
    { id: 'u2', username: 'staff', passwordHash: 'staff123', role: Role.Staff, isActive: true },
];
let donors: Donor[] = [
  { id: 'd1', donorCode: '501', name: 'Alice Johnson', email: 'alice@example.com', createdAt: new Date(), updatedAt: new Date(), isActive: true },
  { id: 'd2', donorCode: '502', name: 'Bob Williams', phone: '123-456-7890', createdAt: new Date(), updatedAt: new Date(), isActive: true },
];
let languages: Language[] = [{ id: 'l1', name: 'English' }, { id: 'l2', name: 'Spanish' }];
let categories: Category[] = [{ id: 'c1', name: 'Science Fiction' }, { id: 'c2', name: 'Fantasy' }, { id: 'c3', name: 'History' }];
let authors: Author[] = [{ id: 'a1', name: 'Philip K. Dick' }, { id: 'a2', name: 'J.R.R. Tolkien' }, { id: 'a3', name: 'Yuval Noah Harari' }];
let bookTitles: BookTitle[] = [
  { id: 'bt1', bookId: '1000', title: 'Do Androids Dream of Electric Sheep?', authorId: 'a1', languageId: 'l1', categoryId: 'c1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'bt2', bookId: '1001', title: 'The Hobbit', authorId: 'a2', languageId: 'l1', categoryId: 'c2', createdAt: new Date(), updatedAt: new Date() },
  { id: 'bt3', bookId: '1002', title: 'Sapiens: A Brief History of Humankind', authorId: 'a3', languageId: 'l1', categoryId: 'c3', createdAt: new Date(), updatedAt: new Date() }
];
let bookCopies: BookCopy[] = [
    { id: 'bc1', bookTitleId: 'bt1', donorId: 'd1', shelfLocation: 'A1-01', condition: BookCondition.Good, buyingPrice: 11.29, sellingPrice: 12.99, isFreeDonation: false, serialNumber: 1, bookCode: '10005010001', createdAt: new Date(), updatedAt: new Date(), isSold: false },
    { id: 'bc2', bookTitleId: 'bt1', donorId: 'd2', shelfLocation: 'A1-02', condition: BookCondition.Medium, buyingPrice: 7.39, sellingPrice: 8.50, isFreeDonation: false, serialNumber: 2, bookCode: '10005020002', createdAt: new Date(), updatedAt: new Date(), isSold: false },
    { id: 'bc3', bookTitleId: 'bt2', donorId: 'd1', shelfLocation: 'B2-05', condition: BookCondition.New, buyingPrice: 13.04, sellingPrice: 15.00, isFreeDonation: false, serialNumber: 1, bookCode: '10015010001', createdAt: new Date(), updatedAt: new Date(), isSold: true },
    { id: 'bc4', bookTitleId: 'bt3', donorId: 'd2', shelfLocation: 'C1-10', condition: BookCondition.Good, buyingPrice: 15.65, sellingPrice: 18.00, isFreeDonation: false, serialNumber: 1, bookCode: '10025020001', createdAt: new Date(), updatedAt: new Date(), isSold: false },
];
let sales: Sale[] = [
    { id: 's1', soldAt: new Date(Date.now() - 86400000 * 2), subtotal: 15.00, tax: 0, total: 15.00, items: [{id: 'si1', saleId: 's1', bookCopyId: 'bc3', priceAtSale: 15.00}] }
];

const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockApiService {
    private async generateId() {
        return Math.random().toString(36).substring(2, 10);
    }
    
    // Auth & User Management
    async login(username: string, password_DO_NOT_USE_IN_PROD: string): Promise<User | null> {
        await simulateDelay(500);
        const user = users.find(u => u.username === username && u.passwordHash === password_DO_NOT_USE_IN_PROD);
        if (user && user.isActive) {
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword as User;
        }
        return null;
    }

    async getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
        await simulateDelay(300);
        return users.map(u => {
            const { passwordHash, ...userWithoutPassword } = u;
            return userWithoutPassword as User;
        });
    }

    async addUser(data: Pick<User, 'username' | 'role'> & {password: string}): Promise<User> {
        await simulateDelay(400);
        if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
            throw new Error("Username already exists.");
        }
        const newUser: User = {
            id: await this.generateId(),
            username: data.username,
            passwordHash: data.password, // WARNING: In a real app, hash and salt this!
            role: data.role,
            isActive: true,
        };
        users.push(newUser);
        const { passwordHash, ...userWithoutPassword } = newUser;
        return userWithoutPassword as User;
    }

    async toggleUserStatus(id: string): Promise<User> {
        await simulateDelay(300);
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            throw new Error("User not found");
        }
        users[userIndex].isActive = !users[userIndex].isActive;
        const { passwordHash, ...userWithoutPassword } = users[userIndex];
        return userWithoutPassword as User;
    }


    // Data Getters
    async getDonors() { await simulateDelay(200); return [...donors]; }
    async getLanguages() { await simulateDelay(200); return [...languages]; }
    async getCategories() { await simulateDelay(200); return [...categories]; }
    async getAuthors() { await simulateDelay(200); return [...authors]; }
    async getBookTitles() { await simulateDelay(100); return [...bookTitles]; }
    
    async getInventory() {
        await simulateDelay(500);
        return bookCopies.map(copy => {
            const title = bookTitles.find(t => t.id === copy.bookTitleId);
            const author = authors.find(a => a.id === title?.authorId);
            const category = categories.find(c => c.id === title?.categoryId);
            const language = languages.find(l => l.id === title?.languageId);
            const donor = donors.find(d => d.id === copy.donorId);
            return {
                ...copy,
                title: title?.title || 'Unknown',
                author: author?.name || 'Unknown',
                category: category?.name || 'Unknown',
                language: language?.name || 'Unknown',
                donor: donor?.name || 'Unknown',
                bookId: title?.bookId || 'N/A',
                donorCode: donor?.donorCode || 'N/A'
            };
        });
    }

    async getBookCopyByCode(code: string) {
        await simulateDelay(300);
        const copy = bookCopies.find(c => c.bookCode === code);
        if (!copy) return null;
        
        const title = bookTitles.find(t => t.id === copy.bookTitleId);
        const author = authors.find(a => a.id === title?.authorId);
        const category = categories.find(c => c.id === title?.categoryId);
        return {
            ...copy,
            title: title?.title || 'Unknown',
            author: author?.name || 'Unknown',
            category: category?.name || 'Unknown',
        };
    }

    async getDashboardData() {
        await simulateDelay(600);
        const activeBooks = bookCopies.filter(b => !b.isSold);
        const soldBooksCopies = bookCopies.filter(b => b.isSold);
        
        const totalBooks = activeBooks.length;
        const soldBooks = soldBooksCopies.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const inventoryValue = activeBooks.reduce((sum, book) => sum + book.buyingPrice, 0);
        const costOfGoodsSold = soldBooksCopies.reduce((sum, book) => sum + book.buyingPrice, 0);
        const totalProfit = totalRevenue - costOfGoodsSold;

        const revenueByMonth = sales.reduce((acc, sale) => {
            const month = sale.soldAt.toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!acc[month]) acc[month] = 0;
            acc[month] += sale.total;
            return acc;
        }, {} as Record<string, number>);

        const inventoryByCategory = activeBooks.reduce((acc, copy) => {
            const category = categories.find(c => c.id === bookTitles.find(t => t.id === copy.bookTitleId)?.categoryId)?.name || 'Unknown';
            if (!acc[category]) acc[category] = 0;
            acc[category]++;
            return acc;
        }, {} as Record<string, number>);
        
        const inventoryByDonor = activeBooks.reduce((acc, copy) => {
            const donor = donors.find(d => d.id === copy.donorId)?.name || 'Unknown';
            if (!acc[donor]) acc[donor] = 0;
            acc[donor]++;
            return acc;
        }, {} as Record<string, number>);

        const booksByStock = activeBooks.reduce((acc, copy) => {
            const title = bookTitles.find(t => t.id === copy.bookTitleId)?.title || 'Unknown';
            if (!acc[title]) acc[title] = 0;
            acc[title]++;
            return acc;
        }, {} as Record<string, number>);

        const top5BooksByStock = Object.entries(booksByStock)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            kpis: {
                totalBooks,
                soldBooks,
                totalRevenue,
                inventoryValue,
                totalProfit,
            },
            charts: {
                revenueByMonth: Object.entries(revenueByMonth).map(([name, value]) => ({ name, revenue: value })),
                inventoryByCategory: Object.entries(inventoryByCategory).map(([name, value]) => ({ name, count: value })),
                inventoryByDonor: Object.entries(inventoryByDonor).map(([name, value]) => ({ name, count: value })),
            },
            lists: {
                top5BooksByStock,
            }
        };
    }
    
    // Data Creation / Mutation
    async addDonor(data: { name: string; phone?: string; email?: string }) {
        await simulateDelay(400);
        const newDonor: Donor = {
            id: await this.generateId(),
            donorCode: `${500 + donors.length + 1}`,
            name: data.name,
            phone: data.phone,
            email: data.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
        };
        donors.push(newDonor);
        return newDonor;
    }
    
    async updateDonor(id: string, data: Partial<Pick<Donor, 'name' | 'email' | 'phone'>>) {
        await simulateDelay(400);
        const donorIndex = donors.findIndex(d => d.id === id);
        if (donorIndex === -1) {
            throw new Error("Donor not found");
        }
        donors[donorIndex] = { ...donors[donorIndex], ...data, updatedAt: new Date() };
        return donors[donorIndex];
    }

    async toggleDonorStatus(id: string) {
        await simulateDelay(300);
        const donorIndex = donors.findIndex(d => d.id === id);
        if (donorIndex === -1) {
            throw new Error("Donor not found");
        }
        donors[donorIndex].isActive = !donors[donorIndex].isActive;
        donors[donorIndex].updatedAt = new Date();
        return donors[donorIndex];
    }

    async addLookupItem(type: 'author' | 'language' | 'category', name: string) {
        await simulateDelay(300);
        const newItem = { id: await this.generateId(), name };
        if (type === 'author') authors.push(newItem);
        if (type === 'language') languages.push(newItem);
        if (type === 'category') categories.push(newItem);
        return newItem;
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
        await simulateDelay(800);
        
        // 1. Find or create BookTitle
        let bookTitle = bookTitles.find(bt => 
            bt.title.toLowerCase() === data.title.toLowerCase() &&
            bt.authorId === data.authorId &&
            bt.languageId === data.languageId &&
            bt.categoryId === data.categoryId
        );
        
        if (!bookTitle) {
            bookTitle = {
                id: await this.generateId(),
                bookId: `${1000 + bookTitles.length}`,
                title: data.title,
                authorId: data.authorId,
                languageId: data.languageId,
                categoryId: data.categoryId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            bookTitles.push(bookTitle);
        }

        // 2. Generate serial number for this book title
        const existingCopies = bookCopies.filter(bc => bc.bookTitleId === bookTitle!.id);
        const serialNumber = existingCopies.length + 1;
        
        // 3. Generate Book Code
        const donor = donors.find(d => d.id === data.donorId);
        if(!donor) throw new Error("Donor not found");

        const bookCode = `${bookTitle.bookId}${donor.donorCode}${serialNumber.toString().padStart(4, '0')}`;

        // 4. Create new BookCopy
        const newBookCopy: BookCopy = {
            id: await this.generateId(),
            bookTitleId: bookTitle.id,
            donorId: data.donorId,
            shelfLocation: data.shelfLocation,
            condition: data.condition,
            buyingPrice: data.buyingPrice,
            sellingPrice: data.sellingPrice,
            isFreeDonation: data.isFreeDonation,
            note: data.note,
            serialNumber,
            bookCode,
            createdAt: new Date(),
            updatedAt: new Date(),
            isSold: false,
        };
        bookCopies.push(newBookCopy);
        return newBookCopy;
    }

    async createSale(cart: { bookCopyId: string, price: number }[], taxRate: number, saleDetails: { soldPartyName?: string, soldPartyContact?: string }) {
        await simulateDelay(700);
        
        for (const item of cart) {
            const book = bookCopies.find(bc => bc.id === item.bookCopyId);
            if (!book || book.isSold) {
                throw new Error(`Book with ID ${item.bookCopyId} is not available for sale.`);
            }
        }
        
        const saleId = await this.generateId();
        const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
        const tax = 0; // No tax
        const total = subtotal; // Total is same as subtotal

        const newSale: Sale = {
            id: saleId,
            soldAt: new Date(),
            subtotal,
            tax,
            total,
            soldPartyName: saleDetails.soldPartyName,
            soldPartyContact: saleDetails.soldPartyContact,
            items: cart.map(item => ({
                id: `si-${item.bookCopyId}`,
                saleId,
                bookCopyId: item.bookCopyId,
                priceAtSale: item.price
            }))
        };
        
        sales.push(newSale);
        
        // Mark books as sold
        cart.forEach(item => {
            const bookIndex = bookCopies.findIndex(bc => bc.id === item.bookCopyId);
            if (bookIndex !== -1) {
                bookCopies[bookIndex].isSold = true;
            }
        });
        
        return newSale;
    }

    async getDonorPayouts() {
        await simulateDelay(500);
        const payouts: Record<string, { donor: Donor, totalOwed: number, soldBooksCount: number }> = {};

        const soldCopies = bookCopies.filter(copy => copy.isSold);

        for (const copy of soldCopies) {
            if (copy.buyingPrice > 0) {
                const donor = donors.find(d => d.id === copy.donorId);
                if (donor) {
                    if (!payouts[donor.id]) {
                        payouts[donor.id] = {
                            donor,
                            totalOwed: 0,
                            soldBooksCount: 0,
                        };
                    }
                    payouts[donor.id].totalOwed += copy.buyingPrice;
                    payouts[donor.id].soldBooksCount += 1;
                }
            }
        }
        return Object.values(payouts).sort((a, b) => b.totalOwed - a.totalOwed);
    }
}

export const api = new MockApiService();