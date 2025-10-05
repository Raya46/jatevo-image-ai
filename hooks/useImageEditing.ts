import { useCallback, useState } from "react";
import { useGeminiAI } from "./useGeminiAI";

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
  removeBackground: (
    imageUri: string,
    onProgress?: (progress: number) => void
  ) => Promise<GalleryImage | null>;
  enhanceImage: (
    imageUri: string,
    onProgress?: (progress: number) => void
  ) => Promise<GalleryImage | null>;
  adjustColors: (
    imageUri: string,
    adjustments: string,
    onProgress?: (progress: number) => void
  ) => Promise<GalleryImage | null>;

  cropImage: (
    imageUri: string,
    cropParams: any,
    onProgress?: (progress: number) => void
  ) => Promise<GalleryImage | null>;
  applyFilter: (
    imageUri: string,
    filterType: string,
    onProgress?: (progress: number) => void
  ) => Promise<GalleryImage | null>;

  customEdit: (
    imageUri: string,
    instructions: string,
    onProgress?: (progress: number) => void
  ) => Promise<GalleryImage | null>;

  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export const useImageEditing = (): UseImageEditingReturn => {
  const { generateImage, editImage, isLoading, error } = useGeminiAI();
  const [isProcessing, setIsProcessing] = useState(false);

  const clearError = useCallback(() => {
    // Clear error state
  }, []);

  const safeEdit = useCallback(
    async (
      imageUri: string,
      editPrompt: string,
      operation: string,
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      try {
        if (!imageUri) {
          throw new Error("No image provided for editing");
        }

        if (!editPrompt.trim()) {
          throw new Error("No editing instructions provided");
        }

        const result = await editImage(imageUri, editPrompt, onProgress);

        return result;
      } catch (err) {
        console.error(`${operation} failed:`, err);
        throw err;
      }
    },
    [editImage]
  );

  const removeBackground = useCallback(
    async (
      imageUri: string,
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      setIsProcessing(true);
      try {
        const prompt =
          "Remove the background from this image completely. Make the background transparent or white. Keep the main subject (person, object, or focal point) intact and well-defined. Preserve all details of the main subject. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
        return await safeEdit(
          imageUri,
          prompt,
          "Background Removal",
          onProgress
        );
      } catch (err) {
        console.error("❌ Remove background failed:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [safeEdit]
  );

  const enhanceImage = useCallback(
    async (
      imageUri: string,
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      setIsProcessing(true);
      try {
        const prompt =
          "Enhance the quality of this image significantly. Improve sharpness, clarity, color vibrancy, and overall details. Fix any blur, noise, or compression artifacts. Maintain the original composition and style while making it look professional and high-quality. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
        return await safeEdit(
          imageUri,
          prompt,
          "Image Enhancement",
          onProgress
        );
      } catch (err) {
        console.error("❌ Enhance image failed:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [safeEdit]
  );

  const adjustColors = useCallback(
    async (
      imageUri: string,
      adjustments: string,
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      setIsProcessing(true);
      try {
        const prompt = `Adjust the colors, lighting, and tone of this image according to these specifications: ${adjustments}. Maintain the original composition and subjects while applying the color and lighting changes smoothly and naturally. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.`;
        return await safeEdit(imageUri, prompt, "Color Adjustment", onProgress);
      } catch (err) {
        console.error("❌ Adjust colors failed:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [safeEdit]
  );

  const cropImage = useCallback(
    async (
      imageUri: string,

      cropParams: {
        mode: string;
        region?: { x: number; y: number; width: number; height: number };
        imageSize: { width: number; height: number };
      },
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      setIsProcessing(true);
      try {
        let prompt = "";
        const { mode, region, imageSize } = cropParams;

        if (region) {
          const { x, y, width, height } = region;
          prompt = `The original image size is ${Math.round(imageSize.width)}x${Math.round(imageSize.height)} pixels. Crop this image to the exact pixel region defined by the bounding box: start at x=${Math.round(x)}, y=${Math.round(y)} with a width of ${Math.round(width)} and a height of ${Math.round(height)}. Retain the content within this box and discard everything outside. The final image should have dimensions of ${Math.round(width)}x${Math.round(height)}.`;
        } else {
          prompt = `Crop this image according to these instructions: ${mode}. Focus on the important parts, maintain proper composition, and ensure the cropped result looks balanced and professional.`;
        }

        return await safeEdit(imageUri, prompt, "Image Cropping", onProgress);
      } catch (err) {
        console.error("❌ Crop image failed:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [safeEdit]
  );

  const applyFilter = useCallback(
    async (
      imageUri: string,
      filterType: string,
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      setIsProcessing(true);
      try {
        let prompt = "";

        switch (filterType.toLowerCase()) {
          case "synthwave":
          case "retrowave":
            prompt =
              "Transform this image with a synthwave/retrowave aesthetic. Add neon pink and blue colors, geometric grid patterns, chrome effects, and 80s retro styling. Create a futuristic nostalgic atmosphere. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "anime":
          case "manga":
            prompt =
              "Convert this image to anime/manga art style. Add anime characteristics like large expressive eyes, cel shading, vibrant colors, and clean line art. Maintain the original subject but with anime aesthetics. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "lomo":
          case "lomography":
            prompt =
              "Apply a Lomography camera filter effect. Add strong vignette, increased contrast, warm color shifts, and film grain. Create that classic vintage film photography look. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "glitch":
          case "digital":
            prompt =
              "Apply digital glitch art effects. Add pixel distortions, color channel shifts, scan lines, and digital artifacts. Create an artistic corrupted digital aesthetic. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "oil":
          case "oil painting":
            prompt =
              "Transform this image into an oil painting style. Add brush strokes, paint texture, rich colors, and artistic interpretation while maintaining recognizable features. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "watercolor":
            prompt =
              "Convert this image to watercolor painting style. Add soft edges, color bleeding effects, translucent layers, and artistic brush work. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "sketch":
          case "pencil":
            prompt =
              "Transform this image into a detailed pencil sketch. Add fine line work, shading, crosshatching, and artistic interpretation while preserving key features. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "vintage":
          case "sepia":
            prompt =
              "Apply vintage filter effects. Add sepia tones, aged paper texture, soft focus, and nostalgic color grading. Create a classic old photograph aesthetic. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "cyberpunk":
            prompt =
              "Transform this image with cyberpunk aesthetics. Add neon lighting, urban decay, high contrast, and futuristic digital elements. Create a dark, high-tech atmosphere. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "noir":
          case "black and white":
            prompt =
              "Convert to dramatic film noir style. Use high contrast black and white, dramatic lighting, deep shadows, and cinematic composition. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          case "magazine product":
            prompt =
              "Analyze my product (images) photo and upgrade it to a magazine worthy shot. Auto-add props, adjust lighting, and select the best background based on the dish's style. Make it look luxurious. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.";
            break;

          default:
            prompt = `Apply a ${filterType} artistic filter to this image. Transform the image according to the characteristics and aesthetic of ${filterType} style. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image.`;
        }

        return await safeEdit(
          imageUri,
          prompt,
          `Filter: ${filterType}`,
          onProgress
        );
      } catch (err) {
        console.error("❌ Apply filter failed:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [safeEdit]
  );

  const customEdit = useCallback(
    async (
      imageUri: string,
      instructions: string,
      onProgress?: (progress: number) => void
    ): Promise<GalleryImage | null> => {
      setIsProcessing(true);
      try {
        const prompt = `Apply the following custom edits to this image: ${instructions}. Execute the changes precisely while maintaining image quality and natural appearance. IMPORTANT: Maintain the exact original image dimensions and aspect ratio. Do not resize or crop the image unless specifically requested in the instructions.`;
        return await safeEdit(imageUri, prompt, "Custom Edit", onProgress);
      } catch (err) {
        console.error("❌ Custom edit failed:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [safeEdit]
  );

  return {
    removeBackground,
    enhanceImage,
    adjustColors,

    cropImage,
    applyFilter,
    customEdit,

    isProcessing: isLoading || isProcessing,
    error,
    clearError,
  };
};
