import { convertUriToBase64Enhanced } from '@/utils/ImageUriUtils';
import { GoogleGenAI } from '@google/genai';
import { useCallback, useState } from 'react';

interface ImageAsset {
  uri: string;
  base64?: string | null;
  height?: number;
  width?: number;
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

  // React Native compatible base64 conversion using utility
  const uriToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('Converting URI using enhanced utility function...');
      return await convertUriToBase64Enhanced(uri);
    } catch (err) {
      console.error('Enhanced conversion failed, trying fallback...');
      
      // Fallback method
      if (uri.startsWith('data:image/')) {
        const base64 = uri.split(',')[1];
        if (!base64) {
          throw new Error('Invalid data URL format');
        }
        return base64;
      }
      
      throw new Error(`Failed to convert URI to base64: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const generateImage = useCallback(async (
    prompt: string,
    referenceImages: ImageAsset[] = []
  ): Promise<GalleryImage | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting image generation...');
      console.log('📝 Prompt:', prompt);
      console.log('🖼️ Reference images:', referenceImages.length);

      const client = getGenAIClient();
      if (!client) {
        throw new Error('Gemini AI client not initialized. Check your API key.');
      }

      const parts: any[] = [];

      // Process reference images
      if (referenceImages.length > 0) {
        console.log('🔄 Processing reference images...');
        
        for (let i = 0; i < referenceImages.length; i++) {
          const image = referenceImages[i];
          
          try {
            let base64Data = image.base64;
            
            // If no base64 provided, convert from URI
            if (!base64Data && image.uri) {
              console.log(`🔄 Converting reference image ${i + 1} to base64...`);
              base64Data = await uriToBase64(image.uri);
            }
            
            if (base64Data) {
              parts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data
                }
              });
              console.log(`✅ Reference image ${i + 1} added successfully`);
            } else {
              console.warn(`⚠️ Skipping reference image ${i + 1}: no base64 data`);
            }
          } catch (imageError) {
            console.error(`❌ Failed to process reference image ${i + 1}:`, imageError);
            // Continue with other images instead of failing completely
          }
        }
      }

      // Add text prompt
      parts.push({ text: prompt });

      console.log('🔄 Sending request to Gemini API...');
      console.log('📊 Total parts:', parts.length);

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts }],
      });

      console.log('✅ Received response from Gemini API');

      let imageData = null;
      let textResponse = '';

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = {
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data,
            };
            console.log('🖼️ Image data found in response');
          } else if (part.text) {
            textResponse += part.text;
            console.log('💬 Text response:', part.text.substring(0, 100) + '...');
          }
        }
      }

      if (imageData?.data) {
        const imageUri = `data:${imageData.mimeType};base64,${imageData.data}`;
        console.log('✅ Image generated successfully');
        console.log('📊 Generated image size:', Math.round(imageUri.length / 1024), 'KB');
        
        return { 
          id: Date.now(), 
          uri: imageUri 
        };
      }

      if (textResponse) {
        console.log('💬 AI Response:', textResponse);
      }

      throw new Error('No image data received from API');

    } catch (err: any) {
      console.error('❌ Image generation failed:', err);
      
      let errorMessage = 'Failed to generate image';

      if (err?.status === 429 || err?.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (err?.status === 403 || err?.message?.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your configuration.';
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
      console.log('🎨 Starting image editing...');
      console.log('🖼️ Image URI type:', imageUri.startsWith('data:') ? 'Data URL' : 'Remote URL');
      console.log('📝 Edit prompt:', prompt);

      const client = getGenAIClient();
      if (!client) {
        throw new Error('Gemini AI client not initialized. Check your API key.');
      }

      console.log('🔄 Converting image to base64...');
      const base64Data = await uriToBase64(imageUri);
      console.log('✅ Image converted to base64 successfully');

      const parts = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        { text: `Edit this image: ${prompt}` }
      ];

      console.log('🔄 Sending edit request to Gemini API...');

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts }],
      });

      console.log('✅ Received edit response from Gemini API');

      let imageData = null;
      let textResponse = '';

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = {
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data,
            };
            console.log('🖼️ Edited image data found in response');
          } else if (part.text) {
            textResponse += part.text;
            console.log('💬 Edit response text:', part.text.substring(0, 100) + '...');
          }
        }
      }

      if (imageData?.data) {
        const editedImageUri = `data:${imageData.mimeType};base64,${imageData.data}`;
        console.log('✅ Image edited successfully');
        console.log('📊 Edited image size:', Math.round(editedImageUri.length / 1024), 'KB');
        
        return { 
          id: Date.now(), 
          uri: editedImageUri 
        };
      }

      if (textResponse) {
        console.log('💬 AI Edit Response:', textResponse);
      }

      throw new Error('No edited image received from API');

    } catch (err: any) {
      console.error('❌ Image editing failed:', err);
      
      let errorMessage = 'Failed to edit image';

      if (err?.status === 429 || err?.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (err?.status === 403 || err?.message?.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your configuration.';
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err?.message?.includes('base64')) {
        errorMessage = 'Failed to process image. Please try with a different image.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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