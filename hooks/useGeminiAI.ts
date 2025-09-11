import { convertUriToBase64Enhanced } from '@/utils/ImageUriUtils';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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
  generateImage: (prompt: string, referenceImages?: ImageAsset[], onProgress?: (progress: number) => void) => Promise<GalleryImage | null>;
  editImage: (imageUri: string, prompt: string, onProgress?: (progress: number) => void) => Promise<GalleryImage | null>;
  isLoading: boolean;
  error: string | null;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash-image-preview';


export const useGeminiAI = (): UseGeminiAIReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uriToBase64 = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 1024, height: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      return await convertUriToBase64Enhanced(manipulatedImage.uri);

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
    referenceImages: ImageAsset[] = [],
    onProgress?: (progress: number) => void
  ): Promise<GalleryImage | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini AI client not initialized. Check your API key.');
      }

      onProgress?.(2); // Progress: 2% - Starting generation
      const parts: any[] = [];

      if (referenceImages.length > 0) {
        onProgress?.(5); // Progress: 5% - Starting reference image processing

        for (let i = 0; i < referenceImages.length; i++) {
          const image = referenceImages[i];

          try {
            let base64Data = image.base64;

            if (!base64Data && image.uri) {
              onProgress?.(8 + (i * 5)); // Progress: 8%, 13%, 18%, etc.
              base64Data = await uriToBase64(image.uri);
              onProgress?.(12 + (i * 5)); // Progress: 12%, 17%, 22%, etc.
            }

            if (base64Data) {
              parts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data
                }
              });
              onProgress?.(15 + (i + 1) * 8); // Progress: 23%, 31%, 39%, etc. for each image
            } else {
              console.warn(`⚠️ Skipping reference image ${i + 1}: no base64 data`);
            }
          } catch (imageError) {
            console.error(`❌ Failed to process reference image ${i + 1}:`, imageError);
          }
        }
      }

      onProgress?.(25); // Progress: 25% - Reference images processed

      parts.push({ text: prompt });

      onProgress?.(30); // Progress: 30% - Preparing API request
      onProgress?.(35); // Progress: 35% - API request prepared
      onProgress?.(40); // Progress: 40% - Sending API request
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
        }),
      });

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed with status ${apiResponse.status}: ${errorBody}`);
      }

      onProgress?.(60); // Progress: 60% - API request sent, waiting for response
      const response = await apiResponse.json();
      onProgress?.(70); // Progress: 70% - Response received, processing
      onProgress?.(75); // Progress: 75% - Response processed

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
        onProgress?.(80); // Progress: 80% - Image data extracted
        onProgress?.(82); // Progress: 82% - Preparing file save
        const tempFilePath = FileSystem.cacheDirectory + `generated_image_${Date.now()}.jpeg`;

        onProgress?.(85); // Progress: 85% - Saving image file
        await FileSystem.writeAsStringAsync(tempFilePath, imageData.data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        onProgress?.(88); // Progress: 88% - File saved successfully

        const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
        if (fileInfo.exists) {
            // File exists, continue
        }

        onProgress?.(92); // Progress: 92% - File info retrieved
        onProgress?.(95); // Progress: 95% - Image processing complete
        return {
          id: Date.now(),
          uri: tempFilePath
        };
      }

      if (textResponse) {
        console.warn('⚠️ No image data received, but API returned text:', textResponse);
        throw new Error(`API returned a text message instead of an image: ${textResponse.substring(0, 200)}...`);
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
    prompt: string,
    onProgress?: (progress: number) => void
  ): Promise<GalleryImage | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini AI client not initialized. Check your API key.');
      }

      onProgress?.(5); // Progress: 5% - Starting edit
      onProgress?.(8); // Progress: 8% - Preparing image conversion
      const base64Data = await uriToBase64(imageUri);
      onProgress?.(25); // Progress: 25% - Image converted
      onProgress?.(30); // Progress: 30% - Preparing API request

      const parts = [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data }},
        { text: `Edit this image: ${prompt}` }
      ];

      onProgress?.(35); // Progress: 35% - Preparing API request
      onProgress?.(40); // Progress: 40% - Sending edit request
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
        }),
      });

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed with status ${apiResponse.status}: ${errorBody}`);
      }

      onProgress?.(55); // Progress: 55% - API request sent, waiting for response
      const response = await apiResponse.json();
      onProgress?.(65); // Progress: 65% - Response received, processing
      onProgress?.(70); // Progress: 70% - Response processed

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
        onProgress?.(75); // Progress: 75% - Image data extracted
        onProgress?.(78); // Progress: 78% - Preparing file save
        const tempFilePath = FileSystem.cacheDirectory + `edited_image_${Date.now()}.jpeg`;

        onProgress?.(80); // Progress: 80% - Saving edited image file
        await FileSystem.writeAsStringAsync(tempFilePath, imageData.data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        onProgress?.(85); // Progress: 85% - File saved successfully

        const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
        if (fileInfo.exists) {
            // File exists, continue
        }

        onProgress?.(90); // Progress: 90% - File info retrieved
        onProgress?.(95); // Progress: 95% - Edit processing complete
        return {
          id: Date.now(),
          uri: tempFilePath
        };
      }

      if (textResponse) {
        console.warn('⚠️ No image data received, but API returned text:', textResponse);
        throw new Error(`API returned a text message instead of an image: ${textResponse.substring(0, 200)}...`);
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

