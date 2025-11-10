import { GoogleGenAI, Type } from "@google/genai";

export interface BookDetailsSuggestion {
  author: string;
  category: string;
  summary: string;
}

// Fix: Initialize the Gemini client directly using the API key from environment variables
// as per the Gemini API guidelines. The build tool must be configured to expose `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const suggestBookDetails = async (title: string): Promise<BookDetailsSuggestion | null> => {
  // Fix: The API key is now handled during initialization.
  // The guideline is to assume the key is available.
  if (!process.env.API_KEY) {
    console.error("Cannot call Gemini API: API key is missing. Make sure it is set in the environment variables and exposed to the client build.");
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

    // Safely access the text property
    const text = response.text;
    if (text) {
        const jsonString = text.trim();
        const result = JSON.parse(jsonString);
        return result as BookDetailsSuggestion;
    }
    return null;
  } catch (error) {
    console.error("Error fetching book details from Gemini API:", error);
    return null;
  }
};