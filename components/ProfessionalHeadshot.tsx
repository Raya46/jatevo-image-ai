import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
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

  const generateHeadshot = async () => {
    if (!selectedImage) {
      Alert.alert("Missing Image", "Please select an image first");
      return;
    }

    setIsGenerating(true);
    setCurrentProgress(0);

    // Start progress animation
    Animated.timing(animatedProgress, {
      toValue: 90,
      duration: 2500,
      useNativeDriver: false,
    }).start();

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
        Animated.timing(animatedProgress, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error("Generation error:", error);
      Alert.alert("Error", "Failed to generate image");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setCurrentProgress(0);
        animatedProgress.setValue(0);
      }, 600);
    }
  };

  const saveImage = async () => {
    if (!generatedImage || !userId) {
      Alert.alert("Error", "Unable to save image - missing user information");
      return;
    }

    setIsSaving(true);

    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Need permission to save to gallery");
        setIsSaving(false);
        return;
      }

      // Save to gallery first
      await MediaLibrary.saveToLibraryAsync(generatedImage.uri);

      // Convert image to base64 for Supabase upload
      const base64 = await FileSystem.readAsStringAsync(generatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataURL = `data:image/jpeg;base64,${base64}`;

      // Save to Supabase database
      const result = await SupabaseImageServiceRN.uploadAndSaveImage(
        dataURL,
        userId,
        (progress: number) => {
          // Progress callback if needed
        }
      );

      if (result.success) {
        Alert.alert(
          "Success",
          "Image saved to gallery and cloud successfully!"
        );
      } else {
        Alert.alert(
          "Partial Success",
          "Image saved to gallery but failed to save to cloud"
        );
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setGeneratedImage(null);
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-gray-900 text-2xl font-bold mb-6 text-center">
          Professional Headshot
        </Text>

        {/* Image Selection */}
        <View className="mb-6">
          <Text className="text-gray-700 text-lg font-semibold mb-3">
            Select Your Photo
          </Text>
          {selectedImage ? (
            <View className="relative">
              <Image
                source={{ uri: selectedImage.uri }}
                className="w-full h-48 rounded-lg"
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-red-500 rounded-full w-8 h-8 flex justify-center items-center"
              >
                <Text className="text-white font-bold">×</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 flex justify-center items-center"
            >
              <Text className="text-gray-600 text-lg text-center mb-2">
                Tap to Select Photo
              </Text>
              <Text className="text-gray-500 text-sm text-center">
                Choose a clear photo of yourself
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={generateHeadshot}
          disabled={!selectedImage || isGenerating}
          className={`rounded-lg p-4 w-full items-center mb-4 ${
            selectedImage && !isGenerating ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <Text
            className={`font-bold text-lg ${
              selectedImage && !isGenerating ? "text-white" : "text-gray-500"
            }`}
          >
            {isGenerating ? "Generating..." : "Generate"}
          </Text>
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity
          onPress={resetAll}
          className="bg-gray-200 rounded-lg p-3 w-full items-center"
        >
          <Text className="text-gray-700 font-semibold">Reset All</Text>
        </TouchableOpacity>

        {/* Generated Image Display */}
        {generatedImage && (
          <View className="mt-6">
            <Text className="text-gray-700 text-lg font-semibold mb-3 text-center">
              Before & After Comparison
            </Text>

            {/* Side by Side Layout */}
            <View className="flex-row justify-between">
              {/* Original Image */}
              <View className="flex-1 mr-2">
                <Text className="text-gray-600 text-sm font-medium mb-2 text-center">
                  Original
                </Text>
                <View className="bg-white border border-gray-300 rounded-lg p-2">
                  <Image
                    source={{ uri: selectedImage?.uri }}
                    className="w-full h-32 rounded-lg"
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Generated Image with Save Button */}
              <View className="flex-1 ml-2">
                <View className="bg-white border border-gray-300 rounded-lg p-2 relative">
                  <Image
                    source={{ uri: generatedImage.uri }}
                    className="w-full h-32 rounded-lg"
                    resizeMode="contain"
                  />

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={saveImage}
                    disabled={isSaving}
                    className="absolute bottom-2 right-2 bg-white/80 p-2 rounded-full border border-gray-300"
                  >
                    <Ionicons
                      name={isSaving ? "hourglass" : "download"}
                      size={16}
                      color={isSaving ? "#3b82f6" : "#374151"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
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
    </View>
  );
};

export default ProfessionalHeadshot;
