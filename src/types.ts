export enum BookCondition {
  New = 'New',
  Good = 'Good',
  Medium = 'Medium',
  Poor = 'Poor',
}

export enum Role {
  Admin = 'Admin',
  Staff = 'Staff',
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // In a real app, this would be a hash, not plaintext
  role: Role;
  isActive: boolean;
}

export interface Donor {
  id:string;
  donorCode: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Language {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Author {
  id: string;
  name: string;
}

export interface BookTitle {
  id: string;
  bookId: string;
  title: string;
  authorId: string;
  languageId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookCopy {
  id: string;
  bookTitleId: string;
  donorId: string;
  shelfLocation: string;
  condition: BookCondition;
  buyingPrice: number;
  sellingPrice: number;
  isFreeDonation: boolean;
  note?: string;
  serialNumber: number;
  bookCode: string;
  createdAt: Date;
  updatedAt: Date;
  isSold: boolean;
}

export interface Sale {
  id: string;
  soldAt: Date;
  subtotal: number;
  tax: number;
  total: number;
  soldPartyName?: string;
  soldPartyContact?: string;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  bookCopyId: string;
  priceAtSale: number;
}

export interface BookCopyDetails extends BookCopy {
  title: string;
  author: string;
  category: string;
  language: string;
  donor: string;
  bookId: string;
  donorCode: string;
}

export type Page = 'dashboard' | 'intake' | 'pos' | 'inventory' | 'donors' | 'admin' | 'payouts';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  message: string;
}
// Fix: Moved PayoutData interface here to be shared across the application.
export interface PayoutData {
    donor: Donor;
    totalOwed: number;
    soldBooksCount: number;
}