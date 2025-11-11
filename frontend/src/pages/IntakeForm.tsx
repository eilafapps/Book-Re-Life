import React, { useState, useEffect } from 'react';
import { Author, BookCondition, Category, Donor, Language, BookTitle } from '../types';
import { api, handleApiError } from '../services/api';
import { suggestBookDetails } from '../services/geminiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

const FormGroup: React.FC<{ label: string; children: React.ReactNode, hint?: string }> = ({ label, children, hint }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium leading-none">{label}</label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const IntakeForm: React.FC = () => {
    // Dropdown data
    const [donors, setDonors] = useState<Donor[]>([]);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [authors, setAuthors] = useState<Author[]>([]);
    const [bookTitles, setBookTitles] = useState<BookTitle[]>([]);


    // Form state
    const [donorId, setDonorId] = useState('');
    const [title, setTitle] = useState('');
    const [titleSuggestions, setTitleSuggestions] = useState<BookTitle[]>([]);
    const [authorId, setAuthorId] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [languageId, setLanguageId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [condition, setCondition] = useState<BookCondition>(BookCondition.Good);
    const [shelfLocation, setShelfLocation] = useState('');
    const [note, setNote] = useState('');
    const [isFreeDonation, setIsFreeDonation] = useState(false);
    const [buyingPrice, setBuyingPrice] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
    
    const { addToast } = useToast();

    const fetchData = async () => {
        try {
            const [donorsData, lookupsData, bookTitlesData] = await Promise.all([
                api.getDonors(),
                api.getLookups(),
                api.getBookTitles()
            ]);
            setDonors(donorsData.filter(d => d.isActive)); // Only show active donors
            setLanguages(lookupsData.languages);
            setCategories(lookupsData.categories);
            setAuthors(lookupsData.authors);
            setBookTitles(bookTitlesData);
        } catch (error) {
            addToast('error', 'Failed to load initial form data.');
            console.error(error);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);
    
    useEffect(() => {
        if(isFreeDonation) {
            setBuyingPrice('0');
        } else {
            const cost = parseFloat(buyingPrice);
            if (!isNaN(cost) && cost >= 0) {
                setSellingPrice((cost * 1.15).toFixed(2));
            } else {
                setSellingPrice('');
            }
        }
    }, [buyingPrice, isFreeDonation]);

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        if (newTitle.length > 1) {
            const suggestions = bookTitles.filter(bt =>
                bt.title.toLowerCase().includes(newTitle.toLowerCase())
            );
            setTitleSuggestions(suggestions);
        } else {
            setTitleSuggestions([]);
        }
    };

    const handleSuggestionClick = (book: BookTitle) => {
        setTitle(book.title);
        setAuthorId(book.authorId);
        setLanguageId(book.languageId);
        setCategoryId(book.categoryId);
        setTitleSuggestions([]); // Hide suggestions
        addToast('success', 'Existing book found! Details auto-filled.');
    };

    const resetForm = () => {
        setDonorId('');
        setTitle('');
        setAuthorId('');
        setNewAuthor('');
        setLanguageId('');
        setCategoryId('');
        setCondition(BookCondition.Good);
        setShelfLocation('');
        setBuyingPrice('');
        setSellingPrice('');
        setIsFreeDonation(false);
        setNote('');
    };
    
    const handleAiSuggest = async () => {
        if (!title) {
            addToast('error', 'Please enter a book title first.');
            return;
        }
        setIsAiLoading(true);
        try {
            const suggestion = await suggestBookDetails(title);
            if (suggestion) {
                // Try to match author
                const existingAuthor = authors.find(a => a.name.toLowerCase() === suggestion.author.toLowerCase());
                if (existingAuthor) {
                    setAuthorId(existingAuthor.id);
                    setNewAuthor('');
                } else {
                    setAuthorId('new');
                    setNewAuthor(suggestion.author);
                }
                
                // Try to match category
                const existingCategory = categories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
                if (existingCategory) {
                    setCategoryId(existingCategory.id);
                }

                setNote(suggestion.summary);
                addToast('success', 'AI suggestions applied!');
            } else {
                addToast('error', 'Could not get AI suggestions.');
            }
        } catch (error) {
            addToast('error', handleApiError(error));
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Handle new author
            let finalAuthorId = authorId;
            if (authorId === 'new' && newAuthor) {
                const createdAuthor = await api.addLookupItem('author', newAuthor);
                finalAuthorId = createdAuthor.id;
                setAuthors([...authors, createdAuthor]);
            }
            
            const finalBuyingPrice = parseFloat(buyingPrice) || 0;
            const finalSellingPrice = parseFloat(sellingPrice) || 0;

            if (!donorId || !title || !finalAuthorId || !languageId || !categoryId) {
                 addToast('error', 'Please fill all required fields.');
                 setIsSubmitting(false);
                 return;
            }

            if (finalSellingPrice < finalBuyingPrice) {
                addToast('error', 'Selling price cannot be less than buying cost.');
                setIsSubmitting(false);
                return;
            }

            const result = await api.addBookCopy({
                donorId,
                title,
                authorId: finalAuthorId,
                languageId,
                categoryId,
                condition,
                shelfLocation,
                buyingPrice: finalBuyingPrice,
                sellingPrice: finalSellingPrice,
                isFreeDonation,
                note,
            });
            
            addToast('success', `Book added! Code: ${result.bookCode}`);
            resetForm();
            // Refresh book titles for auto-complete
            setBookTitles(await api.getBookTitles());
        } catch (error) {
            addToast('error', handleApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>New Book Intake</CardTitle>
                        <CardDescription>Enter details for a new book donation. Required fields are marked with *</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormGroup label="Donor *">
                                    <div className="flex gap-2">
                                        <Select value={donorId} onChange={(e) => setDonorId(e.target.value)} required>
                                            <option value="" disabled>Select a donor</option>
                                            {donors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.donorCode})</option>)}
                                        </Select>
                                        <Button type="button" variant="outline" onClick={() => setIsDonorModalOpen(true)}>New</Button>
                                    </div>
                                </FormGroup>
                                <FormGroup label="Shelf Location">
                                    <Input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} placeholder="e.g., Aisle 3, Shelf B" />
                                </FormGroup>
                            </div>
                            
                            <div className="border-t border-border my-6"></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <FormGroup label="Book Title *">
                                    <div className="relative">
                                        <Input 
                                            value={title} 
                                            onChange={(e) => handleTitleChange(e.target.value)} 
                                            placeholder="e.g., The Great Gatsby" 
                                            required 
                                            autoComplete="off"
                                        />
                                        {titleSuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-card border border-border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                                {titleSuggestions.map(book => (
                                                    <li 
                                                        key={book.id}
                                                        className="px-3 py-2 cursor-pointer hover:bg-accent"
                                                        onMouseDown={() => handleSuggestionClick(book)}
                                                    >
                                                        {book.title}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </FormGroup>
                                <div>
                                    <Button type="button" variant="secondary" onClick={handleAiSuggest} disabled={isAiLoading || !title}>
                                        {isAiLoading ? 'Thinking...' : 'Suggest Details with AI'}
                                        <SparkleIcon />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormGroup label="Author *">
                                    <Select value={authorId} onChange={(e) => setAuthorId(e.target.value)} required>
                                        <option value="" disabled>Select an author</option>
                                        {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        <option value="new">-- Add New Author --</option>
                                    </Select>
                                    {authorId === 'new' && (
                                        <Input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Enter new author name" required className="mt-2" />
                                    )}
                                </FormGroup>
                                <FormGroup label="Language *">
                                    <Select value={languageId} onChange={(e) => setLanguageId(e.target.value)} required>
                                        <option value="" disabled>Select a language</option>
                                        {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </Select>
                                </FormGroup>
                                 <FormGroup label="Category *">
                                    <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                                        <option value="" disabled>Select a category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                </FormGroup>
                                <FormGroup label="Condition *">
                                    <Select value={condition} onChange={(e) => setCondition(e.target.value as BookCondition)} required>
                                        {Object.values(BookCondition).map(c => <option key={c} value={c}>{c}</option>)}
                                    </Select>
                                </FormGroup>
                            </div>
                            
                             <div className="border-t border-border my-6"></div>

                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" id="isFree" checked={isFreeDonation} onChange={(e) => setIsFreeDonation(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                    <label htmlFor="isFree" className="text-sm font-medium">Donated for free</label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormGroup label="Buying Cost (SAR) *">
                                        <Input type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} placeholder="e.g., 5.00" min="0" step="0.01" required disabled={isFreeDonation} />
                                    </FormGroup>
                                    {isFreeDonation ? (
                                        <FormGroup label="Selling Price (SAR) *">
                                            <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="e.g., 9.99" min="0" step="0.01" required />
                                        </FormGroup>
                                    ) : (
                                        <FormGroup label="Selling Price (Auto +15%)">
                                            <Input type="text" value={sellingPrice} disabled readOnly className="bg-muted" />
                                        </FormGroup>
                                    )}
                                </div>
                            </div>

                             <FormGroup label="Note / AI Summary">
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Optional notes about the book or condition..."></textarea>
                            </FormGroup>
                            
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Add Book to Inventory'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <AddDonorModal 
                isOpen={isDonorModalOpen} 
                onClose={() => setIsDonorModalOpen(false)}
                onDonorAdded={(newDonor) => {
                    setDonors([...donors, newDonor]);
                    setDonorId(newDonor.id);
                    setIsDonorModalOpen(false);
                    addToast('success', 'New donor added!');
                }}
            />
        </>
    );
};


const AddDonorModal: React.FC<{ isOpen: boolean, onClose: () => void, onDonorAdded: (donor: Donor) => void }> = ({ isOpen, onClose, onDonorAdded }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async () => {
        if (!name) {
            addToast('error', 'Donor name is required.');
            return;
        }
        setIsSubmitting(true);
        try {
            const newDonor = await api.addDonor({ name, email, phone });
            onDonorAdded(newDonor);
            setName('');
            setEmail('');
            setPhone('');
        } catch (error) {
            addToast('error', handleApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Donor"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Donor'}</Button>
                </>
            }
        >
            <div className="space-y-4">
                <FormGroup label="Donor Name *">
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
                </FormGroup>
                <FormGroup label="Email">
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john.doe@example.com" />
                </FormGroup>
                <FormGroup label="Phone">
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-123-4567" />
                </FormGroup>
            </div>
        </Modal>
    );
};

const SparkleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><path d="M9.5 2.5 12 8l2.5-5.5L17 5l-2.5 5.5L17 16l-2.5-2.5-2.5 2.5-2.5-5.5L7 16l2.5-5.5L7 5l2.5-2.5Z"/></svg>

export default IntakeForm;
