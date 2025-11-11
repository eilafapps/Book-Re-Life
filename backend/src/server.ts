import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { PrismaClient, Role, BookCondition } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';
// FIX: Import `process` to provide type definitions for `process.exit`.
import process from 'process';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// Register plugins
fastify.register(cors);
fastify.register(helmet);
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'a-very-secret-key-that-should-be-in-env',
});

// Authentication decorator
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});


// --- Zod Schemas for Validation ---
const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// --- Helper Functions ---
const getBookCopyDetails = async (bookCopyId: string) => {
    const copy = await prisma.bookCopy.findUnique({
        where: { id: bookCopyId },
        include: {
            bookTitle: {
                include: {
                    author: true,
                    category: true,
                    language: true,
                },
            },
            donor: true
        }
    });
    if (!copy) return null;
    return {
        ...copy,
        title: copy.bookTitle.title,
        author: copy.bookTitle.author.name,
        category: copy.bookTitle.category.name,
        language: copy.bookTitle.language.name,
        donor: copy.donor.name,
        bookId: copy.bookTitle.bookId,
        donorCode: copy.donor.donorCode,
    }
}


// --- Routes ---

// 1. Auth Routes
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { username, password } = LoginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.isActive) {
      return reply.status(401).send({ message: 'Invalid credentials or inactive user.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return reply.status(401).send({ message: 'Invalid credentials.' });
    }

    const token = fastify.jwt.sign({ userId: user.id, username: user.username, role: user.role });
    const { passwordHash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  } catch (error) {
    reply.status(400).send({ message: 'Invalid request body.' });
  }
});

// 2. Admin Routes
fastify.get('/admin/users', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    // @ts-ignore
    if (request.user.role !== Role.Admin) return reply.status(403).send({ message: 'Forbidden' });
    const users = await prisma.user.findMany({ select: { id: true, username: true, role: true, isActive: true } });
    return users;
});

fastify.post('/admin/users', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    // @ts-ignore
    if (request.user.role !== Role.Admin) return reply.status(403).send({ message: 'Forbidden' });
    const { username, password, role } = request.body as any;
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if(existingUser) return reply.status(409).send({ message: 'Username already exists.'});
    
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({ data: { username, passwordHash, role }});
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
});

fastify.patch('/admin/users/:id/toggle-status', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    // @ts-ignore
    if (request.user.role !== Role.Admin) return reply.status(403).send({ message: 'Forbidden' });
    const { id } = request.params as any;
    const user = await prisma.user.findUnique({ where: { id }});
    if(!user) return reply.status(404).send({ message: 'User not found.' });

    const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive }
    });
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
});

// 3. Donor Routes
fastify.get('/donors', { onRequest: [fastify.authenticate] }, async () => {
    return prisma.donor.findMany({ orderBy: { createdAt: 'desc' } });
});

fastify.post('/donors', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { name, email, phone } = request.body as any;
    const latestDonor = await prisma.donor.findFirst({ orderBy: { donorCode: 'desc' }});
    const newDonorCode = latestDonor ? (parseInt(latestDonor.donorCode) + 1).toString() : '501';
    
    return prisma.donor.create({ data: { name, email, phone, donorCode: newDonorCode } });
});

fastify.put('/donors/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, email, phone } = request.body as any;
    return prisma.donor.update({ where: { id }, data: { name, email, phone } });
});

fastify.patch('/donors/:id/toggle-status', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const donor = await prisma.donor.findUnique({ where: { id }});
    if(!donor) return reply.status(404).send({ message: 'Donor not found.'});
    return prisma.donor.update({ where: { id }, data: { isActive: !donor.isActive }});
});


// 4. Lookups Routes
fastify.get('/lookups', { onRequest: [fastify.authenticate] }, async () => {
    const [authors, categories, languages] = await Promise.all([
        prisma.author.findMany({ orderBy: { name: 'asc' } }),
        prisma.category.findMany({ orderBy: { name: 'asc' } }),
        prisma.language.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return { authors, categories, languages };
});

fastify.post('/lookups', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { type, name } = request.body as { type: 'author' | 'category' | 'language', name: string };
    if (!['author', 'category', 'language'].includes(type)) {
        return reply.status(400).send({ message: 'Invalid lookup type' });
    }
    return prisma[type].create({ data: { name }});
});


// 5. Inventory & Intake Routes
fastify.get('/inventory', { onRequest: [fastify.authenticate] }, async () => {
    const copies = await prisma.bookCopy.findMany({
        include: { bookTitle: { include: { author: true, category: true, language: true }}, donor: true },
        orderBy: { createdAt: 'desc' }
    });
    return copies.map(copy => ({
        ...copy,
        title: copy.bookTitle.title,
        author: copy.bookTitle.author.name,
        category: copy.bookTitle.category.name,
        language: copy.bookTitle.language.name,
        donor: copy.donor.name,
        bookId: copy.bookTitle.bookId,
        donorCode: copy.donor.donorCode,
    }));
});

fastify.get('/inventory/titles', { onRequest: [fastify.authenticate] }, async () => {
    return prisma.bookTitle.findMany();
});

fastify.get('/inventory/book-copy/:code', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { code } = request.params as any;
    const copy = await prisma.bookCopy.findUnique({
        where: { bookCode: code },
    });
     if(!copy) return reply.status(404).send({ message: 'Book copy not found.'});
    
    return getBookCopyDetails(copy.id);
});

fastify.post('/intake', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const data = request.body as any;
    
    // Find or create BookTitle
    let bookTitle = await prisma.bookTitle.findFirst({
        where: { 
            title: { equals: data.title, mode: 'insensitive' },
            authorId: data.authorId,
            languageId: data.languageId,
            categoryId: data.categoryId,
        }
    });

    if(!bookTitle) {
        const latestBook = await prisma.bookTitle.findFirst({ orderBy: { bookId: 'desc' }});
        const newBookId = latestBook ? (parseInt(latestBook.bookId) + 1).toString() : '1000';
        bookTitle = await prisma.bookTitle.create({
            data: {
                title: data.title,
                authorId: data.authorId,
                languageId: data.languageId,
                categoryId: data.categoryId,
                bookId: newBookId,
            }
        });
    }

    // Generate serial number
    const copyCount = await prisma.bookCopy.count({ where: { bookTitleId: bookTitle.id }});
    const serialNumber = copyCount + 1;

    // Generate book code
    const donor = await prisma.donor.findUnique({ where: { id: data.donorId }});
    if(!donor) return reply.status(400).send({ message: 'Invalid donor specified.'});
    const bookCode = `${bookTitle.bookId}${donor.donorCode}${serialNumber.toString().padStart(4, '0')}`;
    
    // Create new book copy
    return prisma.bookCopy.create({
        data: {
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
        }
    });
});

// 6. POS Routes
fastify.post('/pos/sale', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { items } = request.body as { items: { bookCopyId: string, price: number }[] };

    return prisma.$transaction(async (tx) => {
        // Check if all books are available
        for (const item of items) {
            const book = await tx.bookCopy.findUnique({ where: { id: item.bookCopyId }});
            if (!book || book.isSold) {
                throw new Error(`Book with ID ${item.bookCopyId} is not available for sale.`);
            }
        }
        
        const subtotal = items.reduce((sum, item) => sum + item.price, 0);
        const tax = 0; // No tax logic yet
        const total = subtotal + tax;

        const sale = await tx.sale.create({
            data: {
                subtotal,
                tax,
                total,
                items: {
                    create: items.map(item => ({
                        bookCopyId: item.bookCopyId,
                        priceAtSale: item.price
                    }))
                }
            }
        });

        // Mark books as sold
        await tx.bookCopy.updateMany({
            where: { id: { in: items.map(i => i.bookCopyId) } },
            data: { isSold: true }
        });

        return sale;
    });
});

// 7. AI Routes
fastify.post('/ai/suggest-details', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { title } = request.body as any;
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
        return reply.status(500).send({ message: "Server is not configured for AI suggestions." });
    }
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the book title "${title}", suggest the author, a likely category, and a brief one-sentence summary.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        author: { type: Type.STRING },
                        category: { type: Type.STRING },
                        summary: { type: Type.STRING },
                    },
                    required: ["author", "category", "summary"],
                },
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch(error) {
        fastify.log.error(error);
        reply.status(500).send({ message: "Failed to get AI suggestion." });
    }
});

// 8. Reports Routes
fastify.get('/reports/dashboard', { onRequest: [fastify.authenticate] }, async () => {
    const activeBooks = await prisma.bookCopy.findMany({ where: { isSold: false }, include: { bookTitle: { include: { category: true }}, donor: true }});
    const soldBooksCopies = await prisma.bookCopy.findMany({ where: { isSold: true }});
    const sales = await prisma.sale.findMany();

    const totalBooks = activeBooks.length;
    const soldBooks = soldBooksCopies.length;
    // FIX: Convert Prisma Decimal to number for calculations.
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total.toNumber(), 0);
    const inventoryValue = activeBooks.reduce((sum, book) => sum + book.buyingPrice.toNumber(), 0);
    const costOfGoodsSold = soldBooksCopies.reduce((sum, book) => sum + book.buyingPrice.toNumber(), 0);
    const totalProfit = totalRevenue - costOfGoodsSold;

    // This is simplified. A real app might group by month properly.
    const revenueByMonth = sales.reduce((acc, sale) => {
        const month = new Date(sale.soldAt).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) acc[month] = 0;
        // FIX: Convert Prisma Decimal to number before adding.
        acc[month] += sale.total.toNumber();
        return acc;
    }, {} as Record<string, number>);

    const inventoryByCategory = activeBooks.reduce((acc, copy) => {
        const category = copy.bookTitle.category.name || 'Unknown';
        if (!acc[category]) acc[category] = 0;
        acc[category]++;
        return acc;
    }, {} as Record<string, number>);

    const booksByStock = activeBooks.reduce((acc, copy) => {
        const title = copy.bookTitle.title || 'Unknown';
        if (!acc[title]) acc[title] = 0;
        acc[title]++;
        return acc;
    }, {} as Record<string, number>);

    return {
        kpis: { totalBooks, soldBooks, totalRevenue, inventoryValue, totalProfit },
        charts: {
            revenueByMonth: Object.entries(revenueByMonth).map(([name, value]) => ({ name, revenue: value })),
            inventoryByCategory: Object.entries(inventoryByCategory).map(([name, value]) => ({ name, count: value })),
        },
        lists: {
            top5BooksByStock: Object.entries(booksByStock).sort(([,a],[,b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count })),
        }
    };
});

fastify.get('/reports/payouts', { onRequest: [fastify.authenticate] }, async () => {
     const soldCopies = await prisma.bookCopy.findMany({
         where: { isSold: true, buyingPrice: { gt: 0 } },
         include: { donor: true }
     });

    const payouts: Record<string, { donor: any, totalOwed: number, soldBooksCount: number }> = {};

    for (const copy of soldCopies) {
        if (!payouts[copy.donor.id]) {
            payouts[copy.donor.id] = { donor: copy.donor, totalOwed: 0, soldBooksCount: 0 };
        }
        // FIX: Convert Prisma Decimal to number before adding.
        payouts[copy.donor.id].totalOwed += copy.buyingPrice.toNumber();
        payouts[copy.donor.id].soldBooksCount += 1;
    }
    return Object.values(payouts).sort((a, b) => b.totalOwed - a.totalOwed);
});


// --- Server Start ---
const start = async () => {
  try {
    const port = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${(fastify.server.address() as any).port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();