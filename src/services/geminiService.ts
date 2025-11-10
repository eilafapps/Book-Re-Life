
import { GoogleGenAI, Type } from "@google/genai";

export interface BookDetailsSuggestion {
  author: string;
  category: string;
  summary: string;
}

// Ensure the API_KEY is available in the environment variables
// Fix: Changed from Vite-specific 'import.meta.env' to 'process.env.API_KEY' to align with
// the coding guidelines and resolve the TypeScript error 'Property 'env' does not exist on type 'ImportMeta''.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this example, we'll log an error.
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const suggestBookDetails = async (title: string): Promise<BookDetailsSuggestion | null> => {
  if (!API_KEY) {
    console.error("Cannot call Gemini API: API key is missing.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on the book title "${title}", suggest the author, a likely category, and a brief one-sentence summary.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            author: {
              type: Type.STRING,
              description: "The author of the book.",
            },
            category: {
              type: Type.STRING,
              description: "A likely category for the book (e.g., 'Science Fiction', 'History', 'Children').",
            },
            summary: {
              type: Type.STRING,
              description: "A very brief, one-sentence summary of the book.",
            },
          },
          required: ["author", "category", "summary"],
        },
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result as BookDetailsSuggestion;
  } catch (error) {
    console.error("Error fetching book details from Gemini API:", error);
    return null;
  }
};