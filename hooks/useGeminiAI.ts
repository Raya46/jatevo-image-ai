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
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyC-a43p0npnwt1O4bboy10hpeJu3VAEYzM';
const MODEL_NAME = 'gemini-2.5-flash-image-preview';
const USE_MOCK_MODE = process.env.EXPO_PUBLIC_USE_MOCK_MODE === 'true';

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

// Mock image generator for development/testing
const generateMockImage = async (prompt: string): Promise<GalleryImage> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Generate a mock image URL based on the prompt
  const mockImageId = Math.floor(Math.random() * 1000);
  const mockImageUrl = `https://picsum.photos/512/512?random=${mockImageId}`;

  return {
    id: Date.now(),
    uri: mockImageUrl
  };
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
      // Use mock mode if enabled (for development/testing)
      if (USE_MOCK_MODE) {
        console.log('Using mock mode for image generation');
        const mockImage = await generateMockImage(prompt);
        return mockImage;
      }

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

      // Use the correct API method with retry logic
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          result = await (client as any).models.generateContent({
            model: MODEL_NAME,
            contents: [{
              role: 'user',
              parts: parts
            }],
            generationConfig: {
              responseModalities: ['Text', 'Image'],
            },
          });
          break; // Success, exit retry loop
        } catch (apiError: any) {
          // Handle rate limiting (429) errors
          if (apiError?.status === 429 || apiError?.code === 429) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Rate limited. Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

            if (retryCount < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryCount++;
              continue;
            } else {
              // Max retries reached, throw user-friendly error
              throw new Error(
                'API quota exceeded. You have reached the free tier limit for Gemini API. ' +
                'Please try again later or upgrade to a paid plan. ' +
                'Visit: https://ai.google.dev/gemini-api/docs/rate-limits'
              );
            }
          } else {
            // Re-throw non-rate-limiting errors
            throw apiError;
          }
        }
      }

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
      let errorMessage = 'Failed to generate image';

      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('quota') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
          errorMessage = 'API quota exceeded. You have reached the free tier limit for Gemini API. Please try again later or upgrade to a paid plan.';
        } else if (err.message.includes('API key')) {
          errorMessage = 'Invalid API key. Please check your Gemini API key configuration.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }

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
      // Use mock mode if enabled (for development/testing)
      if (USE_MOCK_MODE) {
        console.log('Using mock mode for image editing');
        const mockImage = await generateMockImage(`Edited: ${prompt}`);
        return mockImage;
      }

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

      // Use the correct API method with retry logic
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          result = await (client as any).models.generateContent({
            model: MODEL_NAME,
            contents: [{
              role: 'user',
              parts: parts
            }],
            generationConfig: {
              responseModalities: ['Text', 'Image'],
            },
          });
          break; // Success, exit retry loop
        } catch (apiError: any) {
          // Handle rate limiting (429) errors
          if (apiError?.status === 429 || apiError?.code === 429) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Rate limited (edit). Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

            if (retryCount < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryCount++;
              continue;
            } else {
              // Max retries reached, throw user-friendly error
              throw new Error(
                'API quota exceeded. You have reached the free tier limit for Gemini API. ' +
                'Please try again later or upgrade to a paid plan. ' +
                'Visit: https://ai.google.dev/gemini-api/docs/rate-limits'
              );
            }
          } else {
            // Re-throw non-rate-limiting errors
            throw apiError;
          }
        }
      }

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
      let errorMessage = 'Failed to edit image';

      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('quota') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
          errorMessage = 'API quota exceeded. You have reached the free tier limit for Gemini API. Please try again later or upgrade to a paid plan.';
        } else if (err.message.includes('API key')) {
          errorMessage = 'Invalid API key. Please check your Gemini API key configuration.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
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