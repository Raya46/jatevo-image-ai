import { GoogleGenAI } from '@google/genai';
import { useCallback, useState } from 'react';

interface ImageAsset {
  uri: string;
  base64?: string | null;
}

interface GalleryImage {
  id: number;
  uri: string;
}

interface UseGeminiAIReturn {
  generateImage: (prompt: string, referenceImages?: ImageAsset[]) => Promise<GalleryImage | null>;
  editImage: (imageUri: string, prompt: string) => Promise<GalleryImage | null>;
  isLoading: boolean;
  error: string | null;
}

// Gemini API configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash-image-preview';

// Initialize Gemini AI client
let genAI: GoogleGenAI | null = null;

const getGenAIClient = () => {
  if (!genAI && GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
  }
  return genAI;
};

export const useGeminiAI = (): UseGeminiAIReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uriToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      throw new Error('Failed to convert image to base64');
    }
  };

  const generateImage = useCallback(async (
    prompt: string,
    referenceImages: ImageAsset[] = []
  ): Promise<GalleryImage | null> => {
    setIsLoading(true);
    setError(null);

    try {

      const client = getGenAIClient();
      if (!client) {
        throw new Error('Gemini AI client not initialized. Check your API key.');
      }

      const parts: any[] = [];

      if (referenceImages.length > 0) {
        for (const image of referenceImages) {
          let base64Data = image.base64;
          if (!base64Data && image.uri) {
            base64Data = await uriToBase64(image.uri);
          }
          if (base64Data) {
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            });
          }
        }
      }

      parts.push({ text: prompt });

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts }],
      });

      let imageData = null;
      let textResponse = '';

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = {
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data,
            };
          } else if (part.text) {
            textResponse += part.text;
          }
        }
      }

      if (imageData?.data) {
        const imageUri = `data:${imageData.mimeType};base64,${imageData.data}`;
        return { id: Date.now(), uri: imageUri };
      }

      if (textResponse) {
        console.log('AI Response:', textResponse);
      }

      throw new Error('No image data received from API');

    } catch (err: any) {
      let errorMessage = 'Failed to generate image';

      if (err?.status === 429 || err?.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (err?.status === 403 || err?.message?.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your configuration.';
      } else if (err?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('Gemini API Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editImage = useCallback(async (
    imageUri: string,
    prompt: string
  ): Promise<GalleryImage | null> => {
    setIsLoading(true);
    setError(null);

    try {

      const client = getGenAIClient();
      if (!client) {
        throw new Error('Gemini AI client not initialized. Check your API key.');
      }

      const base64Data = await uriToBase64(imageUri);

      const parts = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        { text: `Edit this image: ${prompt}` }
      ];

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts }],
      });

      let imageData = null;
      let textResponse = '';

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = {
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data,
            };
          } else if (part.text) {
            textResponse += part.text;
          }
        }
      }

      if (imageData?.data) {
        const editedImageUri = `data:${imageData.mimeType};base64,${imageData.data}`;
        return { id: Date.now(), uri: editedImageUri };
      }

      if (textResponse) {
        console.log('AI Edit Response:', textResponse);
      }

      throw new Error('No edited image received from API');

    } catch (err: any) {
      let errorMessage = 'Failed to edit image';

      if (err?.status === 429 || err?.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (err?.status === 403 || err?.message?.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your configuration.';
      } else if (err?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('Gemini Edit API Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateImage,
    editImage,
    isLoading,
    error
  };
};