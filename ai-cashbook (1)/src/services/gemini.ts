import { GoogleGenAI, Type } from "@google/genai";

export const getApiKey = () => {
  // Priority: Environment Variables -> User Provided Key (Fallback)
  return process.env.GEMINI_API_KEY || 
         import.meta.env.VITE_GEMINI_API_KEY || 
         "AIzaSyCrSRi-asYWLNcWydrvnV5fuPxNlZALWmQ"; // User provided fallback
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              text: `Analyze this receipt or transaction image. Extract the following details:
1. Total amount.
2. Transaction type (money coming in or going out, default to 'out').
3. Date found on the receipt (look for dd-mm-yyyy or dd-mm-yy formats, but return as YYYY-MM-DD).
4. Time found on the receipt (format: HH:mm).
5. Category and Description based on these rules:
   - If it's a restaurant, cafe, or food item:
     - Category: "Food"
     - Description: "Breakfast" (if time 05:00-11:59), "Lunch" (if time 12:00-16:59), "Dinner" (if time 18:00-23:59), or "Food" (if time unknown).
   - If it's fuel, gas, or petrol:
     - Category: "Utilities"
     - Description: "Fuel"
   - If it's a taxi, cab, or transport service:
     - Category: "Transport"
     - Description: "Taxi"
   - Otherwise:
     - Category: Choose a suitable category.
     - Description: A brief, relevant description.

Return the data in JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "The total amount found on the receipt" },
            type: { type: Type.STRING, enum: ["in", "out"], description: "Whether this is income (in) or expense (out)" },
            description: { type: Type.STRING, description: "A short description of the transaction" },
            category: { type: Type.STRING, description: "A category for the transaction" },
            date: { type: Type.STRING, description: "The date on the receipt in YYYY-MM-DD format" },
            time: { type: Type.STRING, description: "The time on the receipt in HH:mm format" },
          },
          required: ["amount", "type", "description", "category"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as TransactionData;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return null;
  }
}
