import { debugImageUri } from '@/utils/ImageUriUtils';
import { useCallback, useState } from 'react';
import { useGeminiAI } from './useGeminiAI';

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

interface UseImageEditingReturn {
  // Basic editing operations
  removeBackground: (imageUri: string) => Promise<GalleryImage | null>;
  enhanceImage: (imageUri: string) => Promise<GalleryImage | null>;
  adjustColors: (imageUri: string, adjustments: string) => Promise<GalleryImage | null>;

  // Advanced operations
  combineImages: (images: ImageAsset[], prompt: string) => Promise<GalleryImage | null>;
  cropImage: (imageUri: string, cropInstructions: string) => Promise<GalleryImage | null>;
  applyFilter: (imageUri: string, filterType: string) => Promise<GalleryImage | null>;

  // Custom editing
  customEdit: (imageUri: string, instructions: string) => Promise<GalleryImage | null>;

  // Utility
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export const useImageEditing = (): UseImageEditingReturn => {
  const { generateImage, editImage, isLoading, error } = useGeminiAI();
  const [isProcessing, setIsProcessing] = useState(false);

  const clearError = useCallback(() => {
    // Error clearing is handled by useGeminiAI hook
    console.log('🧹 Clearing error state');
  }, []);

  // Safe edit wrapper dengan error handling dan debugging
  const safeEdit = useCallback(async (
    imageUri: string,
    editPrompt: string,
    operation: string
  ): Promise<GalleryImage | null> => {
    try {
      console.log(`Starting ${operation}...`);
      console.log('Image URI:', imageUri.substring(0, 100) + '...');
      console.log('Edit prompt:', editPrompt);

      if (!imageUri) {
        throw new Error('No image provided for editing');
      }

      if (!editPrompt.trim()) {
        throw new Error('No editing instructions provided');
      }

      // Debug URI conversion issues
      await debugImageUri(imageUri);

      const result = await editImage(imageUri, editPrompt);
      
      if (result) {
        console.log(`${operation} completed successfully`);
      } else {
        console.log(`${operation} failed - no result returned`);
      }

      return result;

    } catch (err) {
      console.error(`${operation} failed:`, err);
      throw err; // Re-throw to be handled by the calling function
    }
  }, [editImage]);

  // Remove background from image
  const removeBackground = useCallback(async (imageUri: string): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = "Remove the background from this image completely. Make the background transparent or white. Keep the main subject (person, object, or focal point) intact and well-defined. Preserve all details of the main subject.";
      return await safeEdit(imageUri, prompt, 'Background Removal');
    } catch (err) {
      console.error('❌ Remove background failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [safeEdit]);

  // Enhance image quality
  const enhanceImage = useCallback(async (imageUri: string): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = "Enhance the quality of this image significantly. Improve sharpness, clarity, color vibrancy, and overall details. Fix any blur, noise, or compression artifacts. Maintain the original composition and style while making it look professional and high-quality.";
      return await safeEdit(imageUri, prompt, 'Image Enhancement');
    } catch (err) {
      console.error('❌ Enhance image failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [safeEdit]);

  // Adjust colors and lighting
  const adjustColors = useCallback(async (
    imageUri: string,
    adjustments: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = `Adjust the colors, lighting, and tone of this image according to these specifications: ${adjustments}. Maintain the original composition and subjects while applying the color and lighting changes smoothly and naturally.`;
      return await safeEdit(imageUri, prompt, 'Color Adjustment');
    } catch (err) {
      console.error('❌ Adjust colors failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [safeEdit]);

  // Combine multiple images
  const combineImages = useCallback(async (
    images: ImageAsset[],
    prompt: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      console.log('🔗 Combining', images.length, 'images...');
      
      if (images.length === 0) {
        throw new Error('No images provided for combination');
      }

      const combinationPrompt = `Combine these ${images.length} images creatively according to this instruction: ${prompt}. Create a cohesive, well-composed final image that incorporates elements from all provided images.`;
      
      return await generateImage(combinationPrompt, images);
    } catch (err) {
      console.error('❌ Combine images failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [generateImage]);

  // Crop image with instructions
  const cropImage = useCallback(async (
    imageUri: string,
    cropInstructions: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = `Crop this image according to these instructions: ${cropInstructions}. Focus on the important parts, maintain proper composition, and ensure the cropped result looks balanced and professional.`;
      return await safeEdit(imageUri, prompt, 'Image Cropping');
    } catch (err) {
      console.error('❌ Crop image failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [safeEdit]);

  // Apply artistic filters
  const applyFilter = useCallback(async (
    imageUri: string,
    filterType: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      let prompt = '';

      switch (filterType.toLowerCase()) {
        case 'synthwave':
        case 'retrowave':
          prompt = "Transform this image with a synthwave/retrowave aesthetic. Add neon pink and blue colors, geometric grid patterns, chrome effects, and 80s retro styling. Create a futuristic nostalgic atmosphere.";
          break;
          
        case 'anime':
        case 'manga':
          prompt = "Convert this image to anime/manga art style. Add anime characteristics like large expressive eyes, cel shading, vibrant colors, and clean line art. Maintain the original subject but with anime aesthetics.";
          break;
          
        case 'lomo':
        case 'lomography':
          prompt = "Apply a Lomography camera filter effect. Add strong vignette, increased contrast, warm color shifts, and film grain. Create that classic vintage film photography look.";
          break;
          
        case 'glitch':
        case 'digital':
          prompt = "Apply digital glitch art effects. Add pixel distortions, color channel shifts, scan lines, and digital artifacts. Create an artistic corrupted digital aesthetic.";
          break;
          
        case 'oil':
        case 'oil painting':
          prompt = "Transform this image into an oil painting style. Add brush strokes, paint texture, rich colors, and artistic interpretation while maintaining recognizable features.";
          break;
          
        case 'watercolor':
          prompt = "Convert this image to watercolor painting style. Add soft edges, color bleeding effects, translucent layers, and artistic brush work.";
          break;
          
        case 'sketch':
        case 'pencil':
          prompt = "Transform this image into a detailed pencil sketch. Add fine line work, shading, crosshatching, and artistic interpretation while preserving key features.";
          break;
          
        case 'vintage':
        case 'sepia':
          prompt = "Apply vintage filter effects. Add sepia tones, aged paper texture, soft focus, and nostalgic color grading. Create a classic old photograph aesthetic.";
          break;
          
        case 'cyberpunk':
          prompt = "Transform this image with cyberpunk aesthetics. Add neon lighting, urban decay, high contrast, and futuristic digital elements. Create a dark, high-tech atmosphere.";
          break;
          
        case 'noir':
        case 'black and white':
          prompt = "Convert to dramatic film noir style. Use high contrast black and white, dramatic lighting, deep shadows, and cinematic composition.";
          break;
          
        default:
          prompt = `Apply a ${filterType} artistic filter to this image. Transform the image according to the characteristics and aesthetic of ${filterType} style.`;
      }

      console.log('🎨 Applying filter:', filterType);
      return await safeEdit(imageUri, prompt, `Filter: ${filterType}`);
    } catch (err) {
      console.error('❌ Apply filter failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [safeEdit]);

  // Custom editing with user-provided instructions
  const customEdit = useCallback(async (
    imageUri: string,
    instructions: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = `Apply the following custom edits to this image: ${instructions}. Execute the changes precisely while maintaining image quality and natural appearance.`;
      return await safeEdit(imageUri, prompt, 'Custom Edit');
    } catch (err) {
      console.error('❌ Custom edit failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [safeEdit]);

  return {
    // Basic operations
    removeBackground,
    enhanceImage,
    adjustColors,
    
    // Advanced operations
    combineImages,
    cropImage,
    applyFilter,
    customEdit,
    
    // State
    isProcessing: isLoading || isProcessing,
    error,
    clearError
  };
};