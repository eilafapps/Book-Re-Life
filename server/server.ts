

import express, { Request, Response } from 'express';
import cors from 'cors';
// Fix: Use a named imports for Prisma Client to resolve module resolution errors.
import { PrismaClient, Role, BookCondition } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, generateToken } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Fix: Instantiate PrismaClient from the named import.
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Fix: Removed /api/config endpoint as it is insecure and against Gemini API guidelines.
// The API key should be accessed via process.env in the client build.

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid credentials or inactive user.' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const token = generateToken(user);
        const { passwordHash, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- USER MANAGEMENT (Admin only) ---
// Fix: Use Role for role checks.
app.get('/api/users', authenticateToken(Role.Admin), async (req, res) => {
    const users = await prisma.user.findMany({ select: { id: true, username: true, role: true, isActive: true } });
    res.json(users);
});

// Fix: Use Role for role checks.
app.post('/api/users', authenticateToken(Role.Admin), async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({ data: { username, passwordHash, role } });
        const { passwordHash: _, ...newUser } = user;
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: 'Username may already be taken.' });
    }
});

// Fix: Use Role for role checks.
app.patch('/api/users/:id/toggle-status', authenticateToken(Role.Admin), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const updatedUser = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
        const { passwordHash, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle user status' });
    }
});


// All routes below are protected
app.use('/api', authenticateToken());

// --- LOOKUP DATA ROUTES ---
app.get('/api/languages', async (req, res) => res.json(await prisma.language.findMany({ orderBy: { name: 'asc' } })));
app.get('/api/categories', async (req, res) => res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } })));
app.get('/api/authors', async (req, res) => res.json(await prisma.author.findMany({ orderBy: { name: 'asc' } })));
app.get('/api/book-titles', async (req, res) => res.json(await prisma.bookTitle.findMany({ orderBy: { title: 'asc' } })));

// Fix: Use Role for role checks.
app.post('/api/lookup/:type', authenticateToken(Role.Admin), async (req, res) => {
    const { type } = req.params;
    const { name } = req.body;
    try {
        let result;
        if (type === 'author') result = await prisma.author.create({ data: { name } });
        else if (type === 'language') result = await prisma.language.create({ data: { name } });
        else if (type === 'category') result = await prisma.category.create({ data: { name } });
        else return res.status(400).json({ message: "Invalid lookup type." });
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: `${type} may already exist.` });
    }
});

// --- DONOR ROUTES ---
app.get('/api/donors', async (req, res) => res.json(await prisma.donor.findMany({ orderBy: { name: 'asc' } })));

app.post('/api/donors', async (req, res) => {
    const { name, email, phone } = req.body;
    try {
        const lastDonor = await prisma.donor.findFirst({ orderBy: { donorCode: 'desc' }, select: { donorCode: true } });
        const newCode = lastDonor ? (parseInt(lastDonor.donorCode, 10) + 1).toString() : '1001';
        const newDonor = await prisma.donor.create({ data: { name, email, phone, donorCode: newCode } });
        res.status(201).json(newDonor);
    } catch (error) {
        res.status(500).json({ message: "Failed to create donor." });
    }
});

// Fix: Use Role for role checks.
app.put('/api/donors/:id', authenticateToken(Role.Admin), async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    try {
        const updatedDonor = await prisma.donor.update({ where: { id }, data: { name, email, phone } });
        res.json(updatedDonor);
    } catch (error) {
        res.status(404).json({ message: "Donor not found." });
    }
});

// Fix: Use Role for role checks.
app.patch('/api/donors/:id/toggle-status', authenticateToken(Role.Admin), async (req, res) => {
    const { id } = req.params;
    const donor = await prisma.donor.findUnique({ where: { id } });
    if (!donor) return res.status(404).json({ message: "Donor not found." });
    const updatedDonor = await prisma.donor.update({ where: { id }, data: { isActive: !donor.isActive } });
    res.json(updatedDonor);
});


// --- INVENTORY ROUTES ---
app.get('/api/inventory', async (req, res) => {
    const inventory = await prisma.bookCopy.findMany({
        include: { bookTitle: { include: { author: true, category: true, language: true } }, donor: true },
        orderBy: { createdAt: 'desc' }
    });
    const response = inventory.map(i => ({
        ...i,
        title: i.bookTitle.title,
        author: i.bookTitle.author.name,
        category: i.bookTitle.category.name,
        language: i.bookTitle.language.name,
        donor: i.donor.name,
        bookId: i.bookTitle.bookId,
        donorCode: i.donor.donorCode
    }));
    res.json(response);
});

app.get('/api/inventory/by-code/:code', async (req, res) => {
    const { code } = req.params;
    const book = await prisma.bookCopy.findUnique({
        where: { bookCode: code },
        include: { bookTitle: { include: { author: true, category: true } } }
    });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ ...book, title: book.bookTitle.title, author: book.bookTitle.author.name, category: book.bookTitle.category.name });
});

app.post('/api/inventory', async (req, res) => {
    const { donorId, title, authorId, languageId, categoryId, condition, shelfLocation, buyingPrice, sellingPrice, isFreeDonation, note } = req.body;
    try {
        const bookTitle = await prisma.bookTitle.upsert({
            where: { title_authorId_languageId_categoryId: { title, authorId, languageId, categoryId } },
            update: {},
            create: { title, authorId, languageId, categoryId, bookId: (await prisma.bookTitle.count()).toString().padStart(6, '0') + 'B' },
        });

        const lastSerial = await prisma.bookCopy.findFirst({ where: { bookTitleId: bookTitle.id }, orderBy: { serialNumber: 'desc' } });
        const newSerial = (lastSerial?.serialNumber || 0) + 1;

        const bookCode = `${bookTitle.bookId}${newSerial.toString().padStart(4, '0')}`;

        const newBookCopy = await prisma.bookCopy.create({
            data: {
                bookTitleId: bookTitle.id,
                donorId,
                // Fix: Use BookCondition for the type cast.
                condition: condition as BookCondition,
                shelfLocation,
                buyingPrice,
                sellingPrice,
                isFreeDonation,
                note,
                serialNumber: newSerial,
                bookCode,
            }
        });
        res.status(201).json(newBookCopy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to add book copy" });
    }
});

// --- POS / SALES ROUTES ---
app.post('/api/sales', async (req, res) => {
    const { cart, saleDetails } = req.body;
    const subtotal = cart.reduce((acc: number, item: any) => acc + item.price, 0);
    const tax = 0; // Tax is 0 based on frontend
    const total = subtotal + tax;

    try {
        const sale = await prisma.$transaction(async (tx) => {
            const newSale = await tx.sale.create({
                data: {
                    subtotal, tax, total, ...saleDetails,
                    items: {
                        create: cart.map((item: any) => ({
                            bookCopyId: item.bookCopyId,
                            priceAtSale: item.price
                        }))
                    }
                },
                include: { items: true }
            });

            await tx.bookCopy.updateMany({
                where: { id: { in: cart.map((item: any) => item.bookCopyId) } },
                data: { isSold: true }
            });

            return newSale;
        });
        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Transaction failed. One of the books might have been sold already.' });
    }
});

// --- REPORTING ROUTES ---
// Fix: Use Role for role checks.
app.get('/api/dashboard', authenticateToken(Role.Admin), async (req, res) => {
    const allBooks = await prisma.bookCopy.findMany();
    const soldBooks = allBooks.filter(b => b.isSold);
    const totalRevenue = await prisma.sale.aggregate({ _sum: { total: true } });
    const totalCostOfGoodsSold = soldBooks.reduce((sum, b) => sum + b.buyingPrice, 0);

    const kpis = {
        totalBooks: allBooks.filter(b => !b.isSold).length,
        soldBooks: soldBooks.length,
        totalRevenue: totalRevenue._sum.total || 0,
        inventoryValue: allBooks.filter(b => !b.isSold).reduce((sum, b) => sum + b.buyingPrice, 0),
        totalProfit: (totalRevenue._sum.total || 0) - totalCostOfGoodsSold,
    };
    
    // In a real app, these would be more efficient aggregate queries
    const inventoryByCategory = await prisma.bookCopy.groupBy({ by: ['bookTitleId'], _count: { id: true } });
    const bookTitles = await prisma.bookTitle.findMany({ where: { id: { in: inventoryByCategory.map(i => i.bookTitleId) } }, include: { category: true } });
    const catMap = bookTitles.reduce((acc, bt) => {
        const count = inventoryByCategory.find(i => i.bookTitleId === bt.id)?._count.id || 0;
        acc[bt.category.name] = (acc[bt.category.name] || 0) + count;
        return acc;
    }, {} as Record<string, number>);

    res.json({
        kpis,
        charts: {
            revenueByMonth: [], // Placeholder
            inventoryByCategory: Object.entries(catMap).map(([name, count]) => ({name, count})),
            inventoryByDonor: [], // Placeholder
        },
        lists: {
            top5BooksByStock: [] // Placeholder
        }
    });
});

// Fix: Use Role for role checks.
app.get('/api/payouts/donors', authenticateToken(Role.Admin), async (req, res) => {
    const soldBooks = await prisma.bookCopy.findMany({
        where: { isSold: true, isFreeDonation: false },
        include: { donor: true }
    });

    const payouts = soldBooks.reduce((acc, book) => {
        if (!acc[book.donorId]) {
            acc[book.donorId] = {
                donor: book.donor,
                totalOwed: 0,
                soldBooksCount: 0
            };
        }
        acc[book.donorId].totalOwed += book.buyingPrice;
        acc[book.donorId].soldBooksCount++;
        return acc;
    }, {} as Record<string, { donor: any, totalOwed: number, soldBooksCount: number }>);
    
    res.json(Object.values(payouts));
});


// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Fix: Add explicit types for req and res to resolve overload ambiguity.
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Seed initial user if none exist
async function main() {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        console.log("No users found. Seeding initial admin and staff users...");
        const adminPass = await bcrypt.hash('admin123', 10);
        const staffPass = await bcrypt.hash('staff123', 10);
        await prisma.user.createMany({
            data: [
                // Fix: Use Role for enum values.
                { username: 'admin', passwordHash: adminPass, role: Role.Admin },
                { username: 'staff', passwordHash: staffPass, role: Role.Staff },
            ]
        });
        console.log("Initial users created.");
    }
}

main().catch(e => {
    console.error(e);
    // Fix: Cast process to `any` to resolve potential type conflicts with other libraries.
    (process as any).exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});


app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
