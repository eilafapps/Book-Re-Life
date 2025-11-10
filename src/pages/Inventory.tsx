import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/mockApi';
import { BookCopyDetails } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Barcode from '../components/Barcode';
import { useToast } from '../components/ui/Toast';

const PrintOptionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialBooks: BookCopyDetails[];
  allBooks: BookCopyDetails[];
}> = ({ isOpen, onClose, initialBooks, allBooks }) => {
    const [printQueue, setPrintQueue] = useState<BookCopyDetails[]>([]);
    const [bookIdInput, setBookIdInput] = useState('');
    const [fromSerialInput, setFromSerialInput] = useState('');
    const [toSerialInput, setToSerialInput] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
             setPrintQueue([...new Map(initialBooks.map(item => [item.id, item])).values()]);
        }
    }, [initialBooks, isOpen]);

    const handleAddRange = () => {
        if (!bookIdInput || !fromSerialInput || !toSerialInput) {
            addToast('error', 'Please fill all range fields.');
            return;
        }
        const from = parseInt(fromSerialInput, 10);
        const to = parseInt(toSerialInput, 10);
        if (isNaN(from) || isNaN(to) || from > to) {
            addToast('error', 'Invalid serial number range.');
            return;
        }

        const booksInRange = allBooks.filter(book =>
            book.bookId === bookIdInput &&
            book.serialNumber >= from &&
            book.serialNumber <= to
        );

        if (booksInRange.length === 0) {
            addToast('error', 'No books found in that range.');
            return;
        }
        
        setPrintQueue(prevQueue => {
            const existingIds = new Set(prevQueue.map(b => b.id));
            const newBooks = booksInRange.filter(b => !existingIds.has(b.id));
            if (newBooks.length > 0) {
                 addToast('success', `${newBooks.length} book(s) added to queue.`);
            } else {
                 addToast('error', 'All books in that range are already in the queue.');
            }
            return [...prevQueue, ...newBooks];
        });

        setBookIdInput('');
        setFromSerialInput('');
        setToSerialInput('');
    };
    
    const handleRemoveFromQueue = (bookId: string) => {
        setPrintQueue(prev => prev.filter(b => b.id !== bookId));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Print Barcode Labels"
            footer={<Button onClick={() => window.print()} disabled={printQueue.length === 0}>Print Queue ({printQueue.length})</Button>}
        >
            <div className="space-y-4">
                <div className="p-4 border rounded-md bg-secondary/50">
                    <h4 className="font-semibold mb-2 text-sm text-secondary-foreground">Add by Serial Number Range</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <Input 
                            placeholder="Book ID" 
                            value={bookIdInput} 
                            onChange={e => setBookIdInput(e.target.value)}
                            className="sm:col-span-2"
                        />
                        <Input type="number" placeholder="From Serial" value={fromSerialInput} onChange={e => setFromSerialInput(e.target.value)} />
                        <Input type="number" placeholder="To Serial" value={toSerialInput} onChange={e => setToSerialInput(e.target.value)} />
                    </div>
                    <Button onClick={handleAddRange} className="mt-2 w-full sm:w-auto" size="sm">Add to Queue</Button>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-sm">Print Queue ({printQueue.length} items)</h4>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2 bg-muted/40">
                         {printQueue.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center p-4">Queue is empty. Select books or add by range.</p>
                        ) : (
                            printQueue.map(book => (
                                <div key={book.id} className="flex justify-between items-center bg-background p-2 rounded shadow-sm">
                                    <div className="text-sm">
                                        <p className="font-medium truncate">{book.title}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{book.bookCode}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveFromQueue(book.id)}>Remove</Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 text-sm">Labels Preview</h4>
                     <div id="print-area" className="grid grid-cols-2 gap-2 p-2 bg-gray-200 rounded-md">
                        {printQueue.map(book => (
                            <div key={book.id} className="bg-white p-2 text-center break-words border border-black flex flex-col items-center">
                                <p className="font-mono text-xs font-bold">{book.bookCode}</p>
                                <div className="my-1">
                                    <Barcode value={book.bookCode} height={35} width={140} />
                                </div>
                                <div className="text-xs w-full flex justify-between">
                                    <span className="truncate pr-1">{book.category}</span>
                                    <span className="font-bold whitespace-nowrap">SAR {book.sellingPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 4px;
                        page-break-inside: avoid;
                    }
                     @page {
                        margin: 0.25in;
                    }
                }
                `}
            </style>
        </Modal>
    );
}

const Inventory: React.FC = () => {
    const [inventory, setInventory] = useState<BookCopyDetails[]>([]);
    const [filteredInventory, setFilteredInventory] = useState<BookCopyDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBooks, setSelectedBooks] = useState<BookCopyDetails[]>([]);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    // Fix: Create a ref for the select-all checkbox to set its indeterminate state.
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadInventory = async () => {
            setLoading(true);
            try {
                const data = await api.getInventory();
                setInventory(data);
                setFilteredInventory(data);
            } catch (error) {
                console.error("Failed to load inventory:", error);
            } finally {
                setLoading(false);
            }
        };
        loadInventory();
    }, []);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filteredData = inventory.filter(item =>
            item.title.toLowerCase().includes(lowercasedFilter) ||
            item.author.toLowerCase().includes(lowercasedFilter) ||
            item.bookCode.toLowerCase().includes(lowercasedFilter) ||
            item.bookId.includes(lowercasedFilter) ||
            item.donorCode.includes(lowercasedFilter)
        );
        setFilteredInventory(filteredData);
    }, [searchTerm, inventory]);
    
    // Fix: Use useEffect to programmatically set the indeterminate property of the checkbox.
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate =
                selectedBooks.length > 0 && selectedBooks.length < filteredInventory.length;
        }
    }, [selectedBooks, filteredInventory]);

    const handleSelectBook = (book: BookCopyDetails) => {
        setSelectedBooks(prev => 
            prev.find(b => b.id === book.id) 
            ? prev.filter(b => b.id !== book.id)
            : [...prev, book]
        );
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedBooks(filteredInventory);
        } else {
            setSelectedBooks([]);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Inventory</CardTitle>
                            <CardDescription>Browse and manage all books in the system.</CardDescription>
                        </div>
                        <Button onClick={() => setIsPrintModalOpen(true)}>Print Labels</Button>
                    </div>
                    <div className="pt-4">
                        <Input 
                            placeholder="Search by title, author, or any code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th scope="col" className="p-4 w-4">
                                        <div className="flex items-center">
                                            {/* Fix: Attach the ref and remove the non-standard `indeterminate` prop. */}
                                            <input id="checkbox-all" type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" 
                                                ref={selectAllCheckboxRef}
                                                onChange={handleSelectAll}
                                                checked={filteredInventory.length > 0 && selectedBooks.length === filteredInventory.length}
                                            />
                                            <label htmlFor="checkbox-all" className="sr-only">checkbox</label>
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3">Title</th>
                                    <th scope="col" className="px-6 py-3">Author</th>
                                    <th scope="col" className="px-6 py-3">Book Code</th>
                                    <th scope="col" className="px-6 py-3">Book ID</th>
                                    <th scope="col" className="px-6 py-3">Serial No.</th>
                                    <th scope="col" className="px-6 py-3">Donor</th>
                                    <th scope="col" className="px-6 py-3">Buying Cost</th>
                                    <th scope="col" className="px-6 py-3">Selling Price</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={10} className="text-center p-6">Loading inventory...</td></tr>
                                ) : filteredInventory.map(book => (
                                    <tr key={book.id} className="bg-white border-b hover:bg-gray-50">
                                         <td className="w-4 p-4">
                                            <div className="flex items-center">
                                                <input id={`checkbox-${book.id}`} type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    checked={!!selectedBooks.find(b => b.id === book.id)}
                                                    onChange={() => handleSelectBook(book)}
                                                />
                                                <label htmlFor={`checkbox-${book.id}`} className="sr-only">checkbox</label>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{book.title}</td>
                                        <td className="px-6 py-4">{book.author}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{book.bookCode}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{book.bookId}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{book.serialNumber.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4">{book.donor}</td>
                                        <td className="px-6 py-4">SAR {book.buyingPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4 font-semibold">SAR {book.sellingPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${book.isSold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {book.isSold ? 'Sold' : 'Available'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <PrintOptionsModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                initialBooks={selectedBooks}
                allBooks={inventory}
            />
        </>
    );
};

export default Inventory;
