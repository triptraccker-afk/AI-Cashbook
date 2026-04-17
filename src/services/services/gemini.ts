import { GoogleGenAI, Type } from "@google/genai";

export const getApiKey = () => {
  // Priority: Environment Variables -> User Provided Key (Fallback)
  return process.env.GEMINI_API_KEY || 
         import.meta.env.VITE_GEMINI_API_KEY || 
         "AIzaSyC5feK4rHwjBxFMFSS_k7V3-9LpGxm6VlY"; // Updated user provided fallback
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 5, initialDelay: number = 3000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      const isRateLimit = errorMessage.includes('429') || 
                          errorMessage.includes('RESOURCE_EXHAUSTED') || 
                          error?.status === 429;
      
      if (isRateLimit && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API rate limit reached. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isRateLimit) {
        throw new Error("AI service is currently busy (Rate Limit). Please try again in a few seconds.");
      }
      throw error;
    }
  }
  throw lastError;
}

export interface TransactionData {
  amount: number;
  type: 'in' | 'out';
  description: string;
  category: string;
  date?: string; // ISO date string or similar
  time?: string; // HH:mm format
}

export async function parseReceipt(base64Image: string, mimeType: string): Promise<TransactionData | null> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: `Analyze this receipt or transaction image. Extract the following details accurately:
1. Total amount (as a number).
2. Transaction type: 'in' for income/money received, 'out' for expense/money spent.
3. Date: DD-MM-YYYY format.
4. Time: HH:mm format (24-hour).
5. Category: One of [Food, Transport, Utilities, Shopping, Entertainment, Health, Education, Salary, Other].
6. Description: A concise summary. 

SPECIAL LOGIC:
- If the category is 'Food', the description MUST ONLY be one of ["Breakfast", "Lunch", "Dinner"] based on the time. DO NOT include hotel or restaurant names.
  - 06:00 to 11:59: "Breakfast"
  - 12:00 to 18:00: "Lunch"
  - 18:01 to 05:59: "Dinner"
- If the vendor or service is "Uber", change the category to 'Transport' and set the description to "Taxi".
- For other bills, include relevant details about the service or item in the description.

Return the data in valid JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["in", "out"] },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
          },
          required: ["amount", "type", "description", "category"],
        },
      },
    }));

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as TransactionData;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return null;
  }
}

export async function parseMultipleReceipts(images: { base64: string, mimeType: string }[]): Promise<TransactionData | null> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            ...images.map(img => ({
              inlineData: {
                data: img.base64,
                mimeType: img.mimeType,
              },
            })),
            {
              text: `Analyze these multiple receipt or transaction images. Combine them into a SINGLE transaction summary.
1. Total amount: Sum of all amounts found in all images.
2. Transaction type: 'in' for income, 'out' for expense. If mixed, default to 'out'.
3. Date: Use the most recent date found in DD-MM-YYYY format.
4. Time: Use the most recent time found in HH:mm format (24-hour).
5. Category: Choose the most appropriate category for the combined set.
6. Description: A concise summary of all items combined.

SPECIAL LOGIC:
- If the category is 'Food', the description MUST ONLY be one of ["Breakfast", "Lunch", "Dinner"] based on the time. DO NOT include hotel or restaurant names.
  - 06:00 to 11:59: "Breakfast"
  - 12:00 to 18:00: "Lunch"
  - 18:01 to 05:59: "Dinner"
- If any vendor or service is "Uber", change the category to 'Transport' and set the description to "Taxi".
- For other bills, include relevant details about the service or item in the description.

Return the data in valid JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["in", "out"] },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
          },
          required: ["amount", "type", "description", "category"],
        },
      },
    }));

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as TransactionData;
  } catch (error) {
    console.error("Error parsing multiple receipts:", error);
    return null;
  }
}
