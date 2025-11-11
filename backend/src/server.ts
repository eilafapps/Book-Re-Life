import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { PrismaClient, Role, BookCondition, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { GoogleGenAI, Type } from "@google/genai";
import process from 'process';
import path from 'path';
import fastifyStatic from '@fastify/static';
 // Note: running under CommonJS, so __dirname and __filename are available

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });


// --- Zod Schemas for Validation ---
const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const CreateUserSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
    role: z.nativeEnum(Role),
});

const DonorSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
});

const LookupSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['author', 'category', 'language']),
});

const IntakeSchema = z.object({
    donorId: z.string().cuid(),
    title: z.string().min(1),
    authorId: z.string(), // can be 'new' or a CUID
    languageId: z.string().cuid(),
    categoryId: z.string().cuid(),
    condition: z.nativeEnum(BookCondition),
    shelfLocation: z.string().optional(),
    buyingPrice: z.number().min(0),
    sellingPrice: z.number().min(0),
    isFreeDonation: z.boolean(),
    note: z.string().optional(),
});

const CreateSaleSchema = z.object({
    items: z.array(z.object({
        bookCopyId: z.string().cuid(),
        price: z.number().min(0),
    })).min(1),
    soldPartyName: z.string().optional(),
    soldPartyContact: z.string().optional(),
});

const AiSuggestSchema = z.object({
    title: z.string().min(1),
});


const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// Register plugins
fastify.register(cors);
fastify.register(helmet, { contentSecurityPolicy: false }); // Lenient CSP for development
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

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
    // In a CommonJS environment, `__dirname` is a global variable.
    // The compiled server.js is in `backend/dist`, so this path navigates correctly.
    const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');

    fastify.register(fastifyStatic, {
        root: frontendDistPath,
        prefix: '/',
    });

    fastify.setNotFoundHandler((req, reply) => {
        reply.sendFile('index.html');
    });
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

// 2. Admin Routes (all protected)
const adminRoutes = async (fastify: any) => {
    fastify.addHook('onRequest', fastify.authenticate);
    
    // Middleware to check for Admin role
    fastify.addHook('preHandler', async (request: any, reply: any) => {
        if (request.user.role !== Role.Admin) {
            return reply.status(403).send({ message: 'Forbidden: Admin access required.' });
        }
    });

    fastify.get('/users', async () => {
        return prisma.user.findMany({ select: { id: true, username: true, role: true, isActive: true } });
    });

    fastify.post('/users', async (request: any, reply: any) => {
        try {
            const { username, password, role } = CreateUserSchema.parse(request.body);
            const existingUser = await prisma.user.findUnique({ where: { username } });
            if (existingUser) return reply.status(409).send({ message: 'Username already exists.' });

            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await prisma.user.create({ data: { username, passwordHash, role } });
            const { passwordHash: _, ...userWithoutPassword } = newUser;
            return userWithoutPassword;
        } catch (error) {
            reply.status(400).send({ message: 'Invalid data provided.' });
        }
    });

    fastify.patch('/users/:id/toggle-status', async (request: any, reply: any) => {
        const { id } = request.params as any;
        if (id === request.user.userId) {
            return reply.status(400).send({ message: 'You cannot change your own status.' });
        }
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return reply.status(404).send({ message: 'User not found.' });

        const updatedUser = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
        const { passwordHash: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    });
};
fastify.register(adminRoutes, { prefix: '/admin' });


// 3. General Authenticated Routes
const appRoutes = async (fastify: any) => {
    fastify.addHook('onRequest', fastify.authenticate);

    // Donors
    fastify.get('/donors', async () => prisma.donor.findMany({ orderBy: { createdAt: 'desc' } }));
    fastify.post('/donors', async (request: any, reply: any) => {
        try {
            const { name, email, phone } = DonorSchema.parse(request.body);
            const latestDonor = await prisma.donor.findFirst({ orderBy: { donorCode: 'desc' } });
            const newDonorCode = latestDonor ? (parseInt(latestDonor.donorCode) + 1).toString() : '501';
            return prisma.donor.create({ data: { name, email, phone, donorCode: newDonorCode } });
        } catch (error) {
            reply.status(400).send({ message: 'Invalid donor data.' });
        }
    });
    fastify.put('/donors/:id', async (request: any, reply: any) => {
        try {
            const { id } = request.params as any;
            const data = DonorSchema.parse(request.body);
            return prisma.donor.update({ where: { id }, data });
        } catch (error) {
            reply.status(400).send({ message: 'Invalid donor data.' });
        }
    });
    fastify.patch('/donors/:id/toggle-status', async (request: any, reply: any) => {
        const { id } = request.params;
        const donor = await prisma.donor.findUnique({ where: { id } });
        if (!donor) return reply.status(404).send({ message: 'Donor not found.' });
        return prisma.donor.update({ where: { id }, data: { isActive: !donor.isActive } });
    });

    // Lookups
    fastify.get('/lookups', async () => {
        const [authors, categories, languages] = await Promise.all([
            prisma.author.findMany({ orderBy: { name: 'asc' } }),
            prisma.category.findMany({ orderBy: { name: 'asc' } }),
            prisma.language.findMany({ orderBy: { name: 'asc' } }),
        ]);
        return { authors, categories, languages };
    });
    fastify.post('/lookups', async (request: any, reply: any) => {
        try {
            const { type, name } = LookupSchema.parse(request.body);
            if (request.user.role !== Role.Admin) return reply.status(403).send({ message: 'Forbidden' });
            return (prisma as any)[type].create({ data: { name } });
        } catch (error) {
             reply.status(400).send({ message: 'Invalid lookup data.' });
        }
    });
    
    // Intake
    fastify.post('/intake', async (request: any, reply: any) => {
        try {
            const data = IntakeSchema.parse(request.body);
             // 1. Find or create BookTitle
            let bookTitle = await prisma.bookTitle.findFirst({
                where: {
                    title: { equals: data.title, mode: 'insensitive' },
                    authorId: data.authorId,
                    languageId: data.languageId,
                    categoryId: data.categoryId
                }
            });

            if (!bookTitle) {
                const latestBookTitle = await prisma.bookTitle.findFirst({ orderBy: { bookId: 'desc' } });
                const newBookId = latestBookTitle ? (parseInt(latestBookTitle.bookId) + 1).toString() : '1000';
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
             // 2. Generate serial number
            const copyCount = await prisma.bookCopy.count({ where: { bookTitleId: bookTitle.id } });
            const serialNumber = copyCount + 1;

            // 3. Generate Book Code
            const donor = await prisma.donor.findUnique({ where: { id: data.donorId } });
            if (!donor) return reply.status(400).send({ message: 'Donor not found.' });
            const bookCode = `${bookTitle.bookId}${donor.donorCode}${serialNumber.toString().padStart(4, '0')}`;

            // 4. Create BookCopy
            return prisma.bookCopy.create({
                data: { ...data, bookTitleId: bookTitle.id, serialNumber, bookCode }
            });
        } catch (error) {
            fastify.log.error(error);
            reply.status(400).send({ message: 'Invalid intake data.' });
        }
    });

    // Inventory
    fastify.get('/inventory', async () => prisma.bookCopy.findMany({
        orderBy: { createdAt: 'desc' },
        include: { bookTitle: { include: { author: true, category: true, language: true } }, donor: true }
    }).then(copies => copies.map(c => ({
        ...c,
        title: c.bookTitle.title,
        author: c.bookTitle.author.name,
        category: c.bookTitle.category.name,
        language: c.bookTitle.language.name,
        donor: c.donor.name,
        bookId: c.bookTitle.bookId,
        donorCode: c.donor.donorCode,
    })))
    );
     fastify.get('/inventory/titles', async () => prisma.bookTitle.findMany());
     fastify.get('/inventory/book-copy/:code', async (request: any, reply: any) => {
        const { code } = request.params;
        const bookCopy = await prisma.bookCopy.findUnique({
            where: { bookCode: code },
            include: { bookTitle: { include: { author: true, category: true } }, donor: true }
        });
        if (!bookCopy) return reply.status(404).send({ message: 'Book copy not found.' });
         return {
            ...bookCopy,
            title: bookCopy.bookTitle.title,
            author: bookCopy.bookTitle.author.name,
            category: bookCopy.bookTitle.category.name,
        };
     });
    
    // POS
    fastify.post('/pos/sale', async (request: any, reply: any) => {
        try {
            const { items, ...saleDetails } = CreateSaleSchema.parse(request.body);
            const bookCopyIds = items.map(item => item.bookCopyId);
            
            const books = await prisma.bookCopy.findMany({ where: { id: { in: bookCopyIds } } });
            if (books.length !== bookCopyIds.length) {
                return reply.status(400).send({ message: 'One or more books not found.' });
            }
            if (books.some(b => b.isSold)) {
                return reply.status(400).send({ message: 'One or more books have already been sold.' });
            }
            
            const subtotal = items.reduce((sum, item) => sum + item.price, 0);
            
            return await prisma.$transaction(async (tx) => {
                const newSale = await tx.sale.create({
                    data: {
                        subtotal,
                        tax: 0,
                        total: subtotal,
                        soldPartyName: saleDetails.soldPartyName,
                        soldPartyContact: saleDetails.soldPartyContact,
                        items: {
                            create: items.map(item => ({
                                bookCopyId: item.bookCopyId,
                                priceAtSale: item.price,
                            }))
                        }
                    }
                });

                await tx.bookCopy.updateMany({
                    where: { id: { in: bookCopyIds } },
                    data: { isSold: true }
                });

                return newSale;
            });
        } catch(error) {
            fastify.log.error(error);
            reply.status(400).send({ message: 'Invalid sale data.' });
        }
    });

    // Reports
    fastify.get('/reports/dashboard', async () => {
         const activeBooks = await prisma.bookCopy.findMany({ where: { isSold: false }});
         const soldBooksCopies = await prisma.bookCopy.findMany({ where: { isSold: true }});
         const sales = await prisma.sale.findMany();

         const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
         const inventoryValue = activeBooks.reduce((sum, book) => sum + Number(book.buyingPrice), 0);
         const costOfGoodsSold = soldBooksCopies.reduce((sum, book) => sum + Number(book.buyingPrice), 0);

         return {
            kpis: {
                totalBooks: activeBooks.length,
                soldBooks: soldBooksCopies.length,
                totalRevenue,
                inventoryValue,
                totalProfit: totalRevenue - costOfGoodsSold,
            }
            // Chart and list data can be calculated here similarly...
         };
    });
    fastify.get('/reports/payouts', async () => {
        const soldCopies = await prisma.bookCopy.findMany({
            where: { isSold: true, buyingPrice: { gt: 0 } },
            include: { donor: true }
        });
        const payouts: Record<string, { donor: any, totalOwed: number, soldBooksCount: number }> = {};
        for(const copy of soldCopies) {
            if(!payouts[copy.donor.id]) {
                payouts[copy.donor.id] = { donor: copy.donor, totalOwed: 0, soldBooksCount: 0 };
            }
            payouts[copy.donor.id].totalOwed += Number(copy.buyingPrice);
            payouts[copy.donor.id].soldBooksCount++;
        }
        return Object.values(payouts).sort((a,b) => b.totalOwed - a.totalOwed);
    });

    // AI Service
    fastify.post('/ai/suggest-details', async (request: any, reply: any) => {
        try {
            const { title } = AiSuggestSchema.parse(request.body);
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) {
                return reply.status(500).send({ message: "Server is not configured for AI suggestions." });
            }
            const ai = new GoogleGenAI({ apiKey: API_KEY });
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
            return JSON.parse(response.text.trim());
        } catch(error) {
            fastify.log.error(error);
            reply.status(500).send({ message: "Failed to get AI suggestion." });
        }
    });
};
fastify.register(appRoutes);

// --- Server Start ---
const start = async () => {
  try {
    const port = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address()?.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
