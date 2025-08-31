import { useGeminiAI } from "@/hooks/useGeminiAI";
import { useImageEditing } from "@/hooks/useImageEditing";
import {
  ImageRecord,
  SupabaseImageServiceRN,
} from "@/services/supabaseService";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import MainScreen from "../components/MainScreen";
import QuickEditScreen from "../components/QuickEditScreen";

export interface GalleryImage {
  id: number;
  uri: string;
  supabaseRecord?: ImageRecord;
}

interface ImageAsset {
  uri: string;
  base64?: string | null;
}

const App = () => {
  // State utama aplikasi
  const [currentView, setCurrentView] = useState<"main" | "quickEdit">("main");
  const [quickEditImage, setQuickEditImage] = useState<ImageAsset | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  // AI Hooks
  const { generateImage, isLoading: aiLoading, error: aiError } = useGeminiAI();
  const {
    removeBackground,
    enhanceImage,
    adjustColors,
    cropImage,
    applyFilter,
    isProcessing: editLoading,
  } = useImageEditing();

  const isLoading = aiLoading || editLoading || isLoadingImages;

  // Load real data from Supabase on mount
  useEffect(() => {
    loadGalleryImages();
  }, []);

  const loadGalleryImages = async () => {
    try {
      setIsLoadingImages(true);
      const images = await SupabaseImageServiceRN.getAllImages();

      // Convert Supabase records to GalleryImage format
      const galleryImages: GalleryImage[] = images.map((record) => ({
        id: record.id || Date.now(),
        uri: record.url,
        supabaseRecord: record,
      }));

      setGalleryImages(galleryImages);
      console.log(`Loaded ${galleryImages.length} images from Supabase`);
    } catch (error) {
      console.error("Failed to load gallery images:", error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Fungsi untuk kembali ke layar utama
  const backToHome = () => {
    setQuickEditImage(null);
    setCurrentView("main");
  };

  // Fungsi untuk memilih gambar dari galeri (versi React Native)
  const pickImage = async (onSuccess: (asset: ImageAsset) => void) => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping
        quality: 1,
      });

      if (!result.canceled) {
        const asset = {
          uri: result.assets[0].uri,
          base64: null, // Will be set if needed for API calls
        };
        onSuccess(asset);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // Fungsi untuk menangani 'Quick Edit'
  const handleQuickEditPress = () => {
    console.log("Quick Edit pressed - opening image picker");
    pickImage((asset) => {
      console.log("Image picked:", asset);
      console.log("Image URI:", asset.uri);
      console.log("Setting quickEditImage and switching to quickEdit view");
      setQuickEditImage(asset);
      setCurrentView("quickEdit");
      console.log("State updated - currentView should be 'quickEdit'");
    });
  };

  // Fungsi untuk re-select image dari Quick Edit
  const handleRePickImage = () => {
    console.log("Re-picking image from Quick Edit");
    pickImage((asset) => {
      console.log("New image picked:", asset);
      setQuickEditImage(asset);
    });
  };

  // Fungsi untuk edit gambar dari gallery
  const handleEditImage = (image: GalleryImage) => {
    setQuickEditImage({ uri: image.uri });
    setCurrentView("quickEdit");
  };

  // Real AI-powered image generation with Supabase integration
  const generateWithNanoBanana = async (
    prompt: string,
    images: ImageAsset[] = []
  ) => {
    try {
      const newImage = await generateImage(prompt, images);
      if (newImage) {
        // Save to Supabase first
        if (newImage.uri.startsWith("data:image/")) {
          const saveResult = await SupabaseImageServiceRN.uploadAndSaveImage(
            newImage.uri
          );
          if (saveResult.success && saveResult.record) {
            // Update image with Supabase record
            const imageWithRecord: GalleryImage = {
              ...newImage,
              supabaseRecord: saveResult.record,
            };
            setGalleryImages((prev) => [imageWithRecord, ...prev]);

            if (currentView === "quickEdit") {
              setQuickEditImage({ uri: newImage.uri });
            }

            Alert.alert("Success", "Image generated and saved to cloud!");
          } else {
            // Fallback: add without Supabase record
            setGalleryImages((prev) => [newImage, ...prev]);
            if (currentView === "quickEdit") {
              setQuickEditImage({ uri: newImage.uri });
            }
            Alert.alert("Success", "Image generated successfully!");
          }
        } else {
          // Image is already a URL, just add to gallery
          setGalleryImages((prev) => [newImage, ...prev]);
          if (currentView === "quickEdit") {
            setQuickEditImage({ uri: newImage.uri });
          }
          Alert.alert("Success", "Image generated successfully!");
        }
      }
    } catch (err) {
      console.error("Error generating image:", err);
      Alert.alert("Error", "Failed to generate image. Please try again.");
    }
  };

  // Real AI-powered image editing functions
  const handleImageEdit = async (
    action: string,
    imageUri: string,
    params?: any
  ) => {
    try {
      let editedImage: GalleryImage | null = null;

      switch (action) {
        case "removeBackground":
          editedImage = await removeBackground(imageUri);
          break;
        case "enhance":
          editedImage = await enhanceImage(imageUri);
          break;
        case "adjust":
          editedImage = await adjustColors(
            imageUri,
            params || "improve colors and lighting"
          );
          break;
        case "crop":
          editedImage = await cropImage(imageUri, params || "smart crop");
          break;
        case "filter":
          editedImage = await applyFilter(imageUri, params || "enhance");
          break;
        default:
          console.log("Unknown edit action:", action);
          return;
      }

      if (editedImage) {
        setGalleryImages((prev) => [editedImage!, ...prev]);
        setQuickEditImage({ uri: editedImage!.uri });
      }
    } catch (err) {
      console.error("Error editing image:", err);
      Alert.alert("Error", "Failed to edit image. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-black">
      {isLoading && (
        <View className="absolute inset-0 bg-black/70 flex justify-center items-center z-50">
          <Text className="text-white text-lg">Generating...</Text>
        </View>
      )}
      {currentView === "main" ? (
        <MainScreen
          onQuickEditPress={handleQuickEditPress}
          galleryImages={galleryImages}
          onEditImage={handleEditImage}
          onGenerate={generateWithNanoBanana}
          isLoading={isLoading}
        />
      ) : (
        <QuickEditScreen
          quickEditImage={quickEditImage}
          onBackToHome={backToHome}
          onGenerate={generateWithNanoBanana}
          onImageEdit={handleImageEdit}
          onRePickImage={handleRePickImage}
          isLoading={isLoading}
        />
      )}
    </View>
  );
};

export default App;
