
import React, { useState, useRef } from 'react';
import { api } from '../services/mockApi';
import { BookCopy, Sale } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';

type CartItem = BookCopy & { title: string; author: string; category: string; salePrice: number };
const TAX_RATE = 0.0; // No tax

const ReceiptModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    receiptData: { sale: Sale, items: CartItem[] } | null;
}> = ({ isOpen, onClose, receiptData }) => {
    if (!receiptData) return null;

    const { sale, items } = receiptData;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Receipt: ${sale.id}`}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint}>Print Receipt</Button>
                </>
            }
        >
            <div id="receipt-content" className="font-mono text-xs text-black bg-white p-4 max-w-sm mx-auto">
                <div className="text-center space-y-1 mb-4">
                    <h2 className="text-lg font-bold">Book Re-Life</h2>
                    <p>Sale ID: {sale.id}</p>
                    <p>Date: {new Date(sale.soldAt).toLocaleString()}</p>
                </div>
                <div className="border-t border-b border-dashed border-black py-2 space-y-1">
                    {items.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-2">
                           <span className="col-span-3 truncate">{item.title}</span>
                           <span className="text-right">SAR {item.salePrice.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 space-y-1">
                     <div className="flex justify-between font-bold">
                        <span>Subtotal:</span>
                        <span>SAR {sale.subtotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between font-bold text-base">
                        <span>TOTAL:</span>
                        <span>SAR {sale.total.toFixed(2)}</span>
                    </div>
                </div>
                 <div className="text-center mt-6">
                    <p>Thank you for your purchase!</p>
                </div>
            </div>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #receipt-content, #receipt-content * {
                            visibility: visible;
                        }
                        #receipt-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 0;
                            margin: 0;
                            font-size: 10pt;
                        }
                    }
                `}
            </style>
        </Modal>
    );
};


const POS: React.FC = () => {
    const [bookCode, setBookCode] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [receiptData, setReceiptData] = useState<{ sale: Sale, items: CartItem[] } | null>(null);
    const { addToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAddBook = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!bookCode) return;

        setIsLoading(true);
        try {
            if (cart.some(item => item.bookCode === bookCode)) {
                addToast('error', 'This book is already in the cart.');
                return;
            }

            const book = await api.getBookCopyByCode(bookCode);
            if (!book) {
                addToast('error', 'Book code not found.');
                return;
            }
            if (book.isSold) {
                addToast('error', 'This book has already been sold.');
                return;
            }

            setCart([...cart, { ...book, salePrice: book.sellingPrice }]);
            setBookCode('');
            inputRef.current?.focus();
        } catch (error) {
            addToast('error', 'Failed to fetch book details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveItem = (bookCopyId: string) => {
        setCart(cart.filter(item => item.id !== bookCopyId));
    };

    const handlePriceChange = (bookCopyId: string, newPrice: number) => {
        setCart(cart.map(item => item.id === bookCopyId ? { ...item, salePrice: newPrice } : item));
    };

    const handleCheckout = async () => {
        if(cart.length === 0) {
            addToast('error', 'Cart is empty.');
            return;
        }
        setIsCheckingOut(true);
        try {
            const cartForSale = [...cart];
            const sale = await api.createSale(
                cartForSale.map(item => ({ bookCopyId: item.id, price: item.salePrice })),
                TAX_RATE,
                {}
            );
            addToast('success', 'Sale completed successfully!');
            setReceiptData({ sale, items: cartForSale });
            setCart([]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast('error', `Checkout failed: ${errorMessage}`);
        } finally {
            setIsCheckingOut(false);
        }
    }

    const subtotal = cart.reduce((sum, item) => sum + item.salePrice, 0);
    const total = subtotal; // No tax
    
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Point of Sale</CardTitle>
                            <CardDescription>Scan a book's barcode or enter its code to add it to the sale.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddBook} className="flex gap-2">
                                <Input
                                    ref={inputRef}
                                    value={bookCode}
                                    onChange={e => setBookCode(e.target.value)}
                                    placeholder="Enter or scan Book Code (e.g., 10005010001)"
                                    disabled={isLoading}
                                    autoFocus
                                    className="max-w-sm"
                                />
                                <Button type="submit" disabled={isLoading || !bookCode}>
                                    {isLoading ? 'Searching...' : 'Add to Cart'}
                                </Button>
                            </form>

                            <div className="mt-6 flow-root">
                                <ul role="list" className="-my-6 divide-y divide-border">
                                    {cart.length === 0 && <p className="text-center text-muted-foreground py-10">Your cart is empty.</p>}
                                    {cart.map(item => (
                                        <li key={item.id} className="flex py-6">
                                            <div className="ml-4 flex flex-1 flex-col">
                                                <div>
                                                    <div className="flex justify-between text-base font-medium text-foreground">
                                                        <h3>{item.title}</h3>
                                                        <Input type="number" value={item.salePrice.toFixed(2)} onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)} className="w-24 text-right" />
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">{item.author}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">Condition: {item.condition}</p>
                                                </div>
                                                <div className="flex flex-1 items-end justify-between text-sm">
                                                    <p className="text-gray-500">{item.bookCode}</p>
                                                    <div className="flex">
                                                        <Button variant="ghost" type="button" onClick={() => handleRemoveItem(item.id)}>Remove</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>SAR {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>SAR {total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckingOut || cart.length === 0}>
                                {isCheckingOut ? "Processing..." : "Complete Sale"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
            <ReceiptModal
                isOpen={!!receiptData}
                onClose={() => setReceiptData(null)}
                receiptData={receiptData}
            />
        </>
    );
};

export default POS;