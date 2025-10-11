import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ImageAsset } from "../helper/QuickEdit/types";
import { SupabaseImageServiceRN } from "../services/supabaseService";
import LoadingModal from "./LoadingModal";

interface ProfessionalHeadshotProps {
  onGenerate: (
    prompt: string,
    images: ImageAsset[],
    onProgress?: (progress: number) => void
  ) => Promise<ImageAsset | null>;
  userId: string | null;
}

const ProfessionalHeadshot: React.FC<ProfessionalHeadshotProps> = ({
  onGenerate,
  userId,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageAsset | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const pickImage = async () => {
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
        quality: 1,
        base64: true,
      });

      if (!result.canceled) {
        const asset: ImageAsset = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 || null,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
        setSelectedImage(asset);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const startProgressAnimation = () => {
    animatedProgress.setValue(0);
    Animated.timing(animatedProgress, {
      toValue: 90,
      duration: 2500,
      useNativeDriver: false,
    }).start();
  };

  const completeProgressAnimation = () => {
    Animated.timing(animatedProgress, {
      toValue: 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const resetProgressAnimation = () => {
    setCurrentProgress(0);
    animatedProgress.setValue(0);
  };

  const generateHeadshot = async () => {
    if (!selectedImage) {
      Alert.alert("Missing Image", "Please select an image first");
      return;
    }

    setIsGenerating(true);
    resetProgressAnimation();

    // Start progress animation
    startProgressAnimation();

    try {
      // Default system prompt for professional headshot generation with professional background
      const systemPrompt = `Create a highly realistic, super HD professional headshot photo. The person MUST be wearing formal professional attire such as a suit, tuxedo, dress shirt with tie, or other business-appropriate clothing. Transform the person into a professional headshot with perfect lighting, ultra-realistic details, professional quality, and natural appearance. Replace the background with a clean, professional studio background such as a solid color backdrop (white, gray, or blue), office setting, or conference room. Generate in 3:4 aspect ratio, photorealistic quality, 8K resolution, perfect skin texture, natural lighting, and professional appearance.`;

      const result = await onGenerate(
        systemPrompt,
        [selectedImage],
        (progress: number) => {
          setCurrentProgress(progress);
          animatedProgress.setValue(progress);
        }
      );

      if (result) {
        setGeneratedImage(result);
        completeProgressAnimation();
        setCurrentProgress(100);
      }
    } catch (error) {
      console.error("Generation error:", error);
      resetProgressAnimation();
      Alert.alert("Error", "Failed to generate image");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        resetProgressAnimation();
      }, 600);
    }
  };

  const saveImage = async () => {
    if (!generatedImage || !userId) {
      Alert.alert("Error", "Unable to save image - missing user information");
      return;
    }

    setIsSaving(true);
    resetProgressAnimation();

    try {
      // Step 1: Request permissions (10%)
      animatedProgress.setValue(10);
      setCurrentProgress(10);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        resetProgressAnimation();
        Alert.alert("Permission needed", "Need permission to save to gallery");
        setIsSaving(false);
        return;
      }

      // Step 2: Save to gallery (40%)
      animatedProgress.setValue(40);
      setCurrentProgress(40);
      await MediaLibrary.saveToLibraryAsync(generatedImage.uri);

      // Step 3: Convert to base64 (70%)
      animatedProgress.setValue(70);
      setCurrentProgress(70);
      const base64 = await FileSystem.readAsStringAsync(generatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataURL = `data:image/jpeg;base64,${base64}`;

      // Step 4: Upload to Supabase (90% - 100%)
      animatedProgress.setValue(90);
      setCurrentProgress(90);
      const result = await SupabaseImageServiceRN.uploadAndSaveImage(
        dataURL,
        userId,
        (progress: number) => {
          // Map Supabase progress (5%-100%) to remaining progress (90%-100%)
          const mappedProgress = 90 + progress * 0.1;
          setCurrentProgress(mappedProgress);
          animatedProgress.setValue(mappedProgress);
        }
      );

      if (result.success) {
        completeProgressAnimation();
        setCurrentProgress(100);
        setTimeout(() => {
          Alert.alert(
            "Success",
            "Image saved to gallery and cloud successfully!"
          );
        }, 300);
      } else {
        resetProgressAnimation();
        Alert.alert(
          "Partial Success",
          "Image saved to gallery but failed to save to cloud"
        );
      }
    } catch (error) {
      console.error("Save error:", error);
      resetProgressAnimation();
      Alert.alert("Error", "Failed to save image");
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        resetProgressAnimation();
      }, 600);
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setGeneratedImage(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 items-center p-4">
          {(selectedImage || generatedImage) && (
            <View
              className="flex-row justify-between mb-4"
              style={{ minHeight: 300 }}
            >
              {/* Original Image */}
              <View className="w-[48%]">
                <Text className="text-gray-700 text-sm font-semibold mb-2 text-center">
                  Original Photo
                </Text>
                <View className="aspect-[3/4] bg-white border border-gray-300 rounded-lg p-2 relative">
                  {selectedImage ? (
                    <>
                      <Image
                        source={{ uri: selectedImage.uri }}
                        className="w-full h-full rounded-lg"
                        resizeMode="cover"
                      />
                      {/* Cancel Button on Original Image */}
                      <TouchableOpacity
                        onPress={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded-full flex-row items-center"
                      >
                        <Ionicons name="close" size={12} color="white" />
                        <Text className="text-white text-xs font-semibold ml-1">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={pickImage}
                      className="w-full h-full rounded-lg border-2 border-dashed border-gray-300 flex justify-center items-center"
                    >
                      <Ionicons name="add" size={32} color="#9ca3af" />
                      <Text className="text-gray-500 text-sm mt-2">
                        Add Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Generated Image */}
              <View className="w-[48%]">
                <Text className="text-gray-700 text-sm font-semibold mb-2 text-center">
                  Professional Result
                </Text>
                <View className="aspect-[3/4] bg-white border border-gray-300 rounded-lg p-2 relative">
                  {generatedImage ? (
                    <>
                      <Image
                        source={{ uri: generatedImage.uri }}
                        className="w-full h-full rounded-lg"
                        resizeMode="cover"
                      />
                      {/* Save Button on Generated Image */}
                      <TouchableOpacity
                        onPress={saveImage}
                        disabled={isSaving}
                        className="absolute top-2 right-2 bg-green-500 px-2 py-1 rounded-full flex-row items-center"
                      >
                        <Ionicons
                          name={isSaving ? "hourglass" : "download"}
                          size={12}
                          color="white"
                        />
                        <Text className="text-white text-xs font-semibold ml-1">
                          {isSaving ? "..." : "Save"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View className="w-full h-full rounded-lg bg-gray-50 flex justify-center items-center">
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color="#d1d5db"
                      />
                      <Text className="text-gray-400 text-sm mt-2">
                        Result will appear here
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {selectedImage && !generatedImage && (
            <TouchableOpacity
              onPress={generateHeadshot}
              disabled={isGenerating}
              className={`rounded-lg p-4 w-full items-center mb-4 ${
                isGenerating ? "bg-gray-300" : "bg-blue-500"
              }`}
            >
              <Text
                className={`font-bold text-lg ${
                  isGenerating ? "text-gray-500" : "text-white"
                }`}
              >
                {isGenerating ? "Generating..." : "Generate "}
              </Text>
            </TouchableOpacity>
          )}

          {!selectedImage && !generatedImage && (
            <View>
              <TouchableOpacity
                onPress={pickImage}
                className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 flex justify-center items-center w-full max-w-sm"
              >
                <Ionicons name="person" size={48} color="#9ca3af" />
                <Text className="text-gray-600 text-lg text-center mb-2 mt-4">
                  Select Your Photo
                </Text>
                <Text className="text-gray-500 text-sm text-center">
                  Choose a clear photo of yourself for professional headshot
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(selectedImage || generatedImage) && (
            <TouchableOpacity
              onPress={resetAll}
              className="bg-gray-200 rounded-lg p-3 w-full items-center mt-4 mb-2"
            >
              <Text className="text-gray-700 font-semibold">Reset All</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Loading Modal */}
      <LoadingModal
        visible={isGenerating || isSaving}
        title={
          isSaving
            ? "Saving to Gallery & Cloud"
            : "Creating Professional Headshot"
        }
        message={
          isSaving
            ? "Saving your professional headshot..."
            : "AI is transforming your photo into a professional headshot..."
        }
        animatedProgress={animatedProgress}
        progress={currentProgress}
      />
    </KeyboardAvoidingView>
  );
};

export default ProfessionalHeadshot;
