import { PrismaClient, Role, BookCondition } from '@prisma/client';
import bcrypt from 'bcrypt';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Clear existing data
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.bookCopy.deleteMany();
  await prisma.bookTitle.deleteMany();
  await prisma.author.deleteMany();
  await prisma.category.deleteMany();
  await prisma.language.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Cleared existing data.');

  // Seed Users
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const staffPassword = await bcrypt.hash('staff123', saltRounds);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.Admin,
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      username: 'staff',
      passwordHash: staffPassword,
      role: Role.Staff,
      isActive: true,
    },
  });
  console.log('Seeded users.');

  // Seed Donors
  const donor1 = await prisma.donor.create({
    data: {
      donorCode: '501',
      name: 'Alice Johnson',
      email: 'alice@example.com',
    },
  });

  const donor2 = await prisma.donor.create({
    data: {
      donorCode: '502',
      name: 'Bob Williams',
      phone: '123-456-7890',
    },
  });
  console.log('Seeded donors.');

  // Seed Languages
  const english = await prisma.language.create({ data: { name: 'English' } });
  const spanish = await prisma.language.create({ data: { name: 'Spanish' } });
  console.log('Seeded languages.');

  // Seed Categories
  const sciFi = await prisma.category.create({ data: { name: 'Science Fiction' } });
  const fantasy = await prisma.category.create({ data: { name: 'Fantasy' } });
  const history = await prisma.category.create({ data: { name: 'History' } });
  console.log('Seeded categories.');

  // Seed Authors
  const author1 = await prisma.author.create({ data: { name: 'Philip K. Dick' } });
  const author2 = await prisma.author.create({ data: { name: 'J.R.R. Tolkien' } });
  const author3 = await prisma.author.create({ data: { name: 'Yuval Noah Harari' } });
  console.log('Seeded authors.');

  // Seed Book Titles
  const bookTitle1 = await prisma.bookTitle.create({
    data: {
      bookId: '1000',
      title: 'Do Androids Dream of Electric Sheep?',
      authorId: author1.id,
      languageId: english.id,
      categoryId: sciFi.id,
    },
  });

  const bookTitle2 = await prisma.bookTitle.create({
    data: {
      bookId: '1001',
      title: 'The Hobbit',
      authorId: author2.id,
      languageId: english.id,
      categoryId: fantasy.id,
    },
  });

  const bookTitle3 = await prisma.bookTitle.create({
    data: {
      bookId: '1002',
      title: 'Sapiens: A Brief History of Humankind',
      authorId: author3.id,
      languageId: english.id,
      categoryId: history.id,
    },
  });
  console.log('Seeded book titles.');
  
  // Seed Book Copies
  const copy1 = await prisma.bookCopy.create({
    data: {
      bookTitleId: bookTitle1.id,
      donorId: donor1.id,
      shelfLocation: 'A1-01',
      condition: BookCondition.Good,
      buyingPrice: 11.29,
      sellingPrice: 12.99,
      isFreeDonation: false,
      serialNumber: 1,
      bookCode: '10005010001',
      isSold: false,
    },
  });

  const copy2 = await prisma.bookCopy.create({
    data: {
      bookTitleId: bookTitle1.id,
      donorId: donor2.id,
      shelfLocation: 'A1-02',
      condition: BookCondition.Medium,
      buyingPrice: 7.39,
      sellingPrice: 8.50,
      isFreeDonation: false,
      serialNumber: 2,
      bookCode: '10005020002',
      isSold: false,
    },
  });
  
  const copy3 = await prisma.bookCopy.create({
    data: {
      bookTitleId: bookTitle2.id,
      donorId: donor1.id,
      shelfLocation: 'B2-05',
      condition: BookCondition.New,
      buyingPrice: 13.04,
      sellingPrice: 15.00,
      isFreeDonation: false,
      serialNumber: 1,
      bookCode: '10015010001',
      isSold: true, // This one is sold
    },
  });
  
  const copy4 = await prisma.bookCopy.create({
    data: {
      bookTitleId: bookTitle3.id,
      donorId: donor2.id,
      shelfLocation: 'C1-10',
      condition: BookCondition.Good,
      buyingPrice: 15.65,
      sellingPrice: 18.00,
      isFreeDonation: false,
      serialNumber: 1,
      bookCode: '10025020001',
      isSold: false,
    },
  });
  console.log('Seeded book copies.');

  // Seed Sales
  await prisma.sale.create({
    data: {
      soldAt: new Date(Date.now() - 86400000 * 2),
      subtotal: 15.00,
      tax: 0,
      total: 15.00,
      items: {
        create: {
          bookCopyId: copy3.id,
          priceAtSale: 15.00,
        },
      },
    },
  });
  console.log('Seeded sales.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });