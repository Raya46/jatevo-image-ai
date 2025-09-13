import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ImageAsset } from "../helper/QuickEdit/types";

interface ProfessionalHeadshotProps {
  onGenerate: (
    prompt: string,
    images: ImageAsset[],
    onProgress?: (progress: number) => void
  ) => Promise<ImageAsset | null>;
}

const ProfessionalHeadshot: React.FC<ProfessionalHeadshotProps> = ({
  onGenerate,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageAsset | null>(null);

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

    if (!customPrompt.trim()) {
      Alert.alert(
        "Missing Prompt",
        "Please enter a description for the transformation"
      );
      return;
    }

    setIsGenerating(true);

    try {
      // Enhanced system prompt for realistic, HD generation with professional attire
      const systemPrompt = `Create a highly realistic, super HD professional photo. The person MUST be wearing formal professional attire such as a suit, tuxedo, dress shirt with tie, or other business-appropriate clothing. Maintain the person's original face exactly as it appears. Keep the original background from the photo unless specifically requested to change it. Focus on perfect lighting, ultra-realistic details, professional quality, and natural appearance. ${customPrompt.trim()}. Generate in 3:4 aspect ratio, photorealistic quality, 8K resolution, perfect skin texture, natural lighting, and professional appearance.`;

      const result = await onGenerate(systemPrompt, [selectedImage]);

      if (result) {
        setGeneratedImage(result);
      }
    } catch (error) {
      console.error("Generation error:", error);
      Alert.alert("Error", "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setCustomPrompt("");
    setGeneratedImage(null);
  };

  return (
    <View className="p-4">
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

      {/* Custom Prompt */}
      <View className="mb-6">
        <Text className="text-gray-700 text-lg font-semibold mb-3">
          Describe Your Desired Transformation
        </Text>
        <TextInput
          placeholder="e.g., Transform me into a professional headshot with a suit and tie, keep the original background, make it look realistic and high quality..."
          className="bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-4 text-base"
          value={customPrompt}
          onChangeText={setCustomPrompt}
          multiline
          numberOfLines={4}
          placeholderTextColor="#9ca3af"
          textAlignVertical="top"
        />
        <Text className="text-gray-500 text-sm mt-2">
          Describe how you want your photo to be transformed. The original
          background will be kept unless you specify otherwise.
        </Text>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        onPress={generateHeadshot}
        disabled={!selectedImage || !customPrompt.trim() || isGenerating}
        className={`rounded-lg p-4 w-full items-center mb-4 ${
          selectedImage && customPrompt.trim() && !isGenerating
            ? "bg-blue-500"
            : "bg-gray-300"
        }`}
      >
        <Text
          className={`font-bold text-lg ${
            selectedImage && customPrompt.trim() && !isGenerating
              ? "text-white"
              : "text-gray-500"
          }`}
        >
          {isGenerating ? "Generating..." : "Generate Image"}
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
          <Text className="text-gray-700 text-lg font-semibold mb-3">
            Your Professional Headshot
          </Text>
          <View className="bg-white border border-gray-300 rounded-xl p-2">
            <Image
              source={{ uri: generatedImage.uri }}
              className="w-full h-64 rounded-lg"
              resizeMode="contain"
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default ProfessionalHeadshot;
