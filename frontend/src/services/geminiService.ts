import { api, handleApiError } from './api';

export interface BookDetailsSuggestion {
  author: string;
  category: string;
  summary: string;
}

/**
 * Gets book detail suggestions by calling our own backend, which then calls the Gemini API.
 * This keeps the API key secure on the server.
 * @param title The title of the book.
 * @returns A promise that resolves to the book details suggestion or null on failure.
 */
export const suggestBookDetails = async (title: string): Promise<BookDetailsSuggestion | null> => {
  if (!title) {
    console.error("Title is required to suggest book details.");
    return null;
  }

  try {
    // This calls our backend endpoint at /ai/suggest-details
    const result = await api.suggestBookDetails(title);
    return result as BookDetailsSuggestion;
  } catch (error) {
    console.error("Error fetching book details from backend via geminiService:", error);
    // Re-throw the error so the component calling this function can catch it and show a toast to the user.
    throw error;
  }
};