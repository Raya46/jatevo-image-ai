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

  // Convert image URI to base64
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

  // Generate image from text prompt
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

      // Build content parts
      const parts: any[] = [];

      // Add reference images if provided
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

      // Add text prompt
      parts.push({ text: prompt });

      // Use the correct API method
      const result = await (client as any).models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: parts
        }],
        generationConfig: {
          responseModalities: ['Text', 'Image'],
        },
      });

      // Handle image response
      const candidates = result.candidates || [];
      for (const candidate of candidates) {
        const content = candidate.content;
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.inlineData) {
              const inlineData = part.inlineData;
              const imageUri = `data:${inlineData.mimeType};base64,${inlineData.data}`;

              const newImage: GalleryImage = {
                id: Date.now(),
                uri: imageUri
              };

              return newImage;
            }
          }
        }
      }

      // Handle text response
      const textResponse = result.text || '';
      if (textResponse) {
        console.log('AI Response:', textResponse);
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      setError(errorMessage);
      console.error('Gemini API Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Edit existing image with prompt
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
        {
          text: `Edit this image: ${prompt}`
        }
      ];

      // Use the correct API method
      const result = await (client as any).models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: parts
        }],
        generationConfig: {
          responseModalities: ['Text', 'Image'],
        },
      });

      // Handle image response
      const candidates = result.candidates || [];
      for (const candidate of candidates) {
        const content = candidate.content;
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.inlineData) {
              const inlineData = part.inlineData;
              const editedImageUri = `data:${inlineData.mimeType};base64,${inlineData.data}`;

              const editedImage: GalleryImage = {
                id: Date.now(),
                uri: editedImageUri
              };

              return editedImage;
            }
          }
        }
      }

      // Handle text response
      const textResponse = result.text || '';
      if (textResponse) {
        console.log('AI Edit Response:', textResponse);
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit image';
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