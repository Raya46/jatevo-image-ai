import { useGeminiAI } from "@/hooks/useGeminiAI";
import { useImageEditing } from "@/hooks/useImageEditing";
import {
  ImageRecord,
  SupabaseImageServiceRN,
} from "@/services/supabaseService";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Text, View } from "react-native";
import MainScreen from "../components/MainScreen";
import QuickEditScreen from "../components/QuickEditScreen";
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
    // Asumsi format adalah jpeg karena hook AI kita menyimpannya sebagai jpeg
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert file URI to data URL", e);
    return null;
  }
};

const App = () => {
  const [currentView, setCurrentView] = useState<"main" | "quickEdit">("main");
  const [quickEditImage, setQuickEditImage] = useState<ImageAsset | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const { generateImage } = useGeminiAI();
  const {
    removeBackground,
    enhanceImage,
    adjustColors,
    cropImage,
    applyFilter,
    isProcessing: editLoading,
  } = useImageEditing();

  const isInitialLoading = isLoadingImages;

  useEffect(() => {
    const setupUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          console.log("Existing user session found:", session.user.id);
          setUserId(session.user.id);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            throw error;
          }

          if (data.user) {
            console.log("New anonymous user signed in:", data.user.id);
            setUserId(data.user.id);
          } else {
            throw new Error("Anonymous sign in did not return a user.");
          }
        }
      } catch (e) {
        console.error("User setup failed:", e);
        Alert.alert(
          "Initialization Error",
          "Could not initialize user session."
        );
      }
    };
    setupUser();
  }, []);

  const loadGalleryImages = async (currentUserId: string) => {
    try {
      setIsLoadingImages(true);
      const images =
        await SupabaseImageServiceRN.getImagesForUser(currentUserId);

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

  useEffect(() => {
    if (userId) {
      loadGalleryImages(userId);
    }
  }, [userId]);

  const backToHome = () => {
    setQuickEditImage(null);
    setCurrentView("main");
  };

  const pickImage = async (onSuccess: (asset: ImageAsset) => void) => {
    try {
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
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = {
          uri: result.assets[0].uri,
          base64: null,
          width: 1024,
          height: 1024,
        };
        onSuccess(asset);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

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

  const handleRePickImage = () => {
    console.log("Re-picking image from Quick Edit");
    pickImage((asset) => {
      console.log("New image picked:", asset);
      setQuickEditImage(asset);
    });
  };

  const handleEditImage = (image: GalleryImage) => {
    setQuickEditImage({
      uri: image.uri,
      width: 1024,
      height: 1024,
      base64: null,
    });
    setCurrentView("quickEdit");
  };

  const generateWithNanoBanana = async (
    prompt: string,
    images: { uri: string; base64?: string | null }[] = []
  ): Promise<void> => {
    setIsBusy(true);
    setProgress(10);
    try {
      await delay(50);
      setProgress(50);
      const newImage = await generateImage(prompt, images);

      if (newImage && newImage.uri) {
        const tempImage: GalleryImage = {
          ...newImage,
          supabaseRecord: undefined,
        };
        setGalleryImages((prev) => [tempImage, ...prev]);

        await delay(50);
        setProgress(90);
        const dataUrl = await convertFileUriToDataUrl(newImage.uri);
        if (!dataUrl) throw new Error("Failed to prepare image for upload.");

        const saveResult = await SupabaseImageServiceRN.uploadAndSaveImage(
          dataUrl,
          userId as string
        );

        if (saveResult.success && saveResult.record) {
          const finalImage: GalleryImage = {
            ...newImage,
            uri: saveResult.record.url,
            supabaseRecord: saveResult.record,
          };
          setGalleryImages((prev) =>
            prev.map((img) => (img.id === tempImage.id ? finalImage : img))
          );
          if (currentView === "quickEdit") {
            setQuickEditImage({
              uri: finalImage.uri,
              width: 1024,
              height: 1024,
              base64: null,
            });
          }
        }
        setProgress(100);
      }
    } catch (err) {
      console.error("Error generating image:", err);
      Alert.alert("Error", "Failed to generate image. Please try again.");
    } finally {
      setTimeout(() => {
        setIsBusy(false);
        setProgress(0);
        animatedProgress.setValue(0);
      }, 500);
    }
  };

  const handleImageEdit = async (
    action: string,
    imageUri: string,
    params?: any
  ): Promise<ImageAsset | null> => {
    setIsBusy(true);
    setProgress(10);
    try {
      await delay(50);
      setProgress(50);
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
            params || "improve colors"
          );
          break;
        case "crop":
          editedImage = await cropImage(imageUri, params);
          break;
        case "filter":
          editedImage = await applyFilter(imageUri, params || "enhance");
          break;
        default:
          console.log("Unknown edit action:", action);
          return null;
      }

      if (editedImage) {
        setGalleryImages((prev) => [editedImage, ...prev]);
        setProgress(100);
        return {
          uri: editedImage.uri,
          width: 1024,
          height: 1024,
          base64: null,
        };
      }
      return null;
    } catch (err) {
      console.error("Error editing image:", err);
      Alert.alert("Error", "Failed to edit image. Please try again.");
      return null;
    } finally {
      setTimeout(() => {
        setIsBusy(false);
        setProgress(0);
        animatedProgress.setValue(0);
      }, 500);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {currentView === "main" ? (
        <MainScreen
          onQuickEditPress={handleQuickEditPress}
          galleryImages={galleryImages}
          onEditImage={handleEditImage}
          onGenerate={generateWithNanoBanana}
          isLoading={isBusy}
          isInitialLoading={isInitialLoading}
        />
      ) : (
        <QuickEditScreen
          quickEditImage={quickEditImage}
          onBackToHome={backToHome}
          onGenerate={generateWithNanoBanana}
          onImageEdit={handleImageEdit}
          onRePickImage={handleRePickImage}
          isLoading={isBusy}
        />
      )}

      {isBusy && (
        <View className="absolute inset-0 bg-black/80 flex justify-center items-center z-50">
          <View className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 mx-6 max-w-sm w-full">
            <View className="flex justify-center items-center mb-6">
              <View className="relative">
                <View className="w-20 h-20 bg-purple-600 rounded-full flex justify-center items-center">
                  <Ionicons name="sparkles" size={32} color="white" />
                </View>
                <View className="absolute inset-0 w-20 h-20 bg-purple-400 rounded-full animate-pulse opacity-30" />
              </View>
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-2">
              Creating Magic
            </Text>
            <Text className="text-zinc-400 text-base text-center mb-6">
              AI is processing your request...
            </Text>
            <View
              style={{
                width: "100%",
                height: 8,
                backgroundColor: "#3f3f46",
                borderRadius: 9999,
                marginBottom: 16,
              }}
            >
              <Animated.View
                style={[
                  { height: 8, borderRadius: 9999, backgroundColor: "#a855f7" },
                  {
                    width: animatedProgress.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text className="text-zinc-500 text-sm text-center italic">
              &ldquo;Art takes time, but magic is worth waiting for ✨&rdquo;
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default App;
