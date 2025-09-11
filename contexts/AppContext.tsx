import { useGeminiAI } from "@/hooks/useGeminiAI";
import { useImageEditing } from "@/hooks/useImageEditing";
import {
  ImageRecord,
  SupabaseImageServiceRN,
} from "@/services/supabaseService";
import { supabase } from "@/utils/supabase";
import * as FileSystem from "expo-file-system";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ImageAsset } from "../helper/QuickEdit/types";

export interface GalleryImage {
  id: number;
  uri: string;
  supabaseRecord?: ImageRecord;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const convertFileUriToDataUrl = async (uri: string) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert file URI to data URL", e);
    return null;
  }
};

interface AppContextType {
  // User state
  userId: string | null;
  isLoadingUser: boolean;

  // Gallery state
  galleryImages: GalleryImage[];
  isLoadingImages: boolean;
  loadGalleryImages: () => Promise<void>;

  // Image generation
  generateWithPrompt: (
    prompt: string,
    images: ImageAsset[],
    onProgress?: (progress: number) => void
  ) => Promise<ImageAsset | null>;
  isGenerating: boolean;

  // Image editing
  handleImageEdit: (
    action: string,
    imageUri: string,
    params?: any,
    shouldSaveToGallery?: boolean,
    onProgress?: (progress: number) => void
  ) => Promise<ImageAsset | null>;
  isEditing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const { generateImage } = useGeminiAI();
  const {
    removeBackground,
    enhanceImage,
    adjustColors,
    cropImage,
    applyFilter,
    isProcessing: editLoading,
  } = useImageEditing();

  // Initialize user
  useEffect(() => {
    const setupUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setUserId(session.user.id);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            throw error;
          }

          if (data.user) {
            setUserId(data.user.id);
          } else {
            throw new Error("Anonymous sign in did not return a user.");
          }
        }
      } catch (e) {
        console.error("User setup failed:", e);
      } finally {
        setIsLoadingUser(false);
      }
    };
    setupUser();
  }, []);

  // Load gallery images when user is available
  const loadGalleryImages = async () => {
    if (!userId) return;

    try {
      setIsLoadingImages(true);
      const images = await SupabaseImageServiceRN.getImagesForUser(userId);

      const galleryImagesData: GalleryImage[] = images.map((record) => ({
        id: record.id || Date.now(),
        uri: record.url,
        supabaseRecord: record,
      }));

      setGalleryImages(galleryImagesData);
    } catch (error) {
      console.error("Failed to load gallery images:", error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadGalleryImages();
    }
  }, [userId]);

  // Generate image with prompt
  const generateWithPrompt = async (
    prompt: string,
    images: ImageAsset[] = [],
    onProgress?: (progress: number) => void
  ): Promise<ImageAsset | null> => {
    if (!userId) return null;

    try {
      console.log(
        "🎯 AppContext generateWithPrompt calling generateImage with progress callback"
      );
      const newImage = await generateImage(prompt, images, onProgress);
      if (newImage) {
        // Convert GalleryImage to ImageAsset
        return {
          uri: newImage.uri,
          width: 1024, // Default dimensions
          height: 1024,
          base64: null,
        };
      }
      return null;
    } catch (err) {
      console.error("Error generating image:", err);
      throw err;
    }
  };

  // Handle image editing
  const handleImageEdit = async (
    action: string,
    imageUri: string,
    params?: any,
    shouldSaveToGallery: boolean = true,
    onProgress?: (progress: number) => void
  ): Promise<ImageAsset | null> => {
    if (!userId) return null;

    try {
      let editedImage: GalleryImage | null = null;
      switch (action) {
        case "save":
          editedImage = {
            id: Date.now(),
            uri: imageUri,
            supabaseRecord: undefined,
          };
          break;
        case "removeBackground":
          editedImage = await removeBackground(imageUri, onProgress);
          break;
        case "enhance":
          editedImage = await enhanceImage(imageUri, onProgress);
          break;
        case "adjust":
          editedImage = await adjustColors(
            imageUri,
            params || "improve colors",
            onProgress
          );
          break;
        case "crop":
          editedImage = await cropImage(imageUri, params, onProgress);
          break;
        case "filter":
          editedImage = await applyFilter(
            imageUri,
            params || "enhance",
            onProgress
          );
          break;
        default:
          console.log("Unknown edit action:", action);
          return null;
      }

      if (editedImage && shouldSaveToGallery) {
        const dataUrl = await convertFileUriToDataUrl(editedImage.uri);
        if (!dataUrl) throw new Error("Failed to prepare image for upload.");

        const saveResult = await SupabaseImageServiceRN.uploadAndSaveImage(
          dataUrl,
          userId,
          onProgress
        );

        if (saveResult.success && saveResult.record) {
          const finalImage: GalleryImage = {
            ...editedImage,
            uri: saveResult.record.url,
            supabaseRecord: saveResult.record,
          };
          setGalleryImages((prev) => [finalImage, ...prev]);
        } else {
          throw new Error("Failed to save edited image to cloud");
        }
      }

      return {
        uri: editedImage?.uri || imageUri,
        width: 1024,
        height: 1024,
        base64: null,
      };
    } catch (err) {
      console.error("Error editing image:", err);
      throw err;
    }
  };

  const value: AppContextType = {
    userId,
    isLoadingUser,
    galleryImages,
    isLoadingImages,
    loadGalleryImages,
    generateWithPrompt,
    isGenerating: false, // You can add loading state here if needed
    handleImageEdit,
    isEditing: editLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
