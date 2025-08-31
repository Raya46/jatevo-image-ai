import { useCallback, useState } from 'react';
import { useGeminiAI } from './useGeminiAI';

interface ImageAsset {
  uri: string;
  base64?: string | null;
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

  // Utility
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export const useImageEditing = (): UseImageEditingReturn => {
  const { generateImage, editImage, isLoading, error } = useGeminiAI();
  const [isProcessing, setIsProcessing] = useState(false);

  const clearError = useCallback(() => {
    // Error clearing is handled by useGeminiAI
  }, []);

  // Remove background from image
  const removeBackground = useCallback(async (imageUri: string): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = "Remove the background from this image and make it transparent. Keep the main subject intact.";
      return await editImage(imageUri, prompt);
    } finally {
      setIsProcessing(false);
    }
  }, [editImage]);

  // Enhance image quality
  const enhanceImage = useCallback(async (imageUri: string): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = "Enhance the quality of this image. Improve sharpness, colors, and details while maintaining the original composition.";
      return await editImage(imageUri, prompt);
    } finally {
      setIsProcessing(false);
    }
  }, [editImage]);

  // Adjust colors and lighting
  const adjustColors = useCallback(async (
    imageUri: string,
    adjustments: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      const prompt = `Adjust the colors and lighting of this image: ${adjustments}`;
      return await editImage(imageUri, prompt);
    } finally {
      setIsProcessing(false);
    }
  }, [editImage]);

  // Combine multiple images
  const combineImages = useCallback(async (
    images: ImageAsset[],
    prompt: string
  ): Promise<GalleryImage | null> => {
    setIsProcessing(true);
    try {
      return await generateImage(prompt, images);
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
      const prompt = `Crop this image according to these instructions: ${cropInstructions}. Maintain the important parts and proper composition.`;
      return await editImage(imageUri, prompt);
    } finally {
      setIsProcessing(false);
    }
  }, [editImage]);

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
          prompt = "Apply a synthwave/retrowave aesthetic filter to this image. Add neon colors, geometric patterns, and 80s retro styling.";
          break;
        case 'anime':
          prompt = "Transform this image into anime style. Add anime characteristics, cel shading, and vibrant colors.";
          break;
        case 'lomo':
          prompt = "Apply a Lomography filter to this image. Add vignette, increased contrast, and film-like color shifts.";
          break;
        case 'glitch':
          prompt = "Apply a glitch/artistic distortion effect to this image. Add digital artifacts and corrupted pixels.";
          break;
        default:
          prompt = `Apply a ${filterType} artistic filter to this image.`;
      }

      return await editImage(imageUri, prompt);
    } finally {
      setIsProcessing(false);
    }
  }, [editImage]);

  return {
    removeBackground,
    enhanceImage,
    adjustColors,
    combineImages,
    cropImage,
    applyFilter,
    isProcessing: isLoading || isProcessing,
    error,
    clearError
  };
};