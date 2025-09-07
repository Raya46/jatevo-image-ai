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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppContext } from "../contexts/AppContext";
import { ImageAsset } from "../helper/QuickEdit/types";
import { SupabaseImageServiceRN } from "../services/supabaseService";
import LoadingModal from "./LoadingModal";

interface PromptEngineProps {
  onGenerate: (
    prompt: string,
    images: ImageAsset[]
  ) => Promise<ImageAsset | null>;
  onReset?: () => void;
}

const PromptEngine: React.FC<PromptEngineProps> = ({ onGenerate, onReset }) => {
  const { userId, loadGalleryImages } = useAppContext();
  const [engineMode, setEngineMode] = useState<
    "text-to-image" | "image-to-image"
  >("text-to-image");
  const [refImages, setRefImages] = useState<ImageAsset[]>([]);
  const [prompt, setPrompt] = useState("");
  const [previewImage, setPreviewImage] = useState<ImageAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  // Progress animation logic
  const startProgressAnimation = () => {
    animatedProgress.setValue(0);
    Animated.timing(animatedProgress, {
      toValue: 90,
      duration: 2000,
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
    animatedProgress.setValue(0);
  };

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

      if (!result.canceled && result.assets[0]) {
        const asset: ImageAsset = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 || null,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
        setRefImages((prev) => [...prev, asset]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleUploadRefImage = () => {
    if (refImages.length >= 9) {
      Alert.alert("Limit Reached", "Maximum 9 reference images allowed");
      return;
    }
    pickImage();
  };

  const removeImage = (index: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert(
        "Missing Prompt",
        "Please enter a description for your image"
      );
      return;
    }

    setIsGenerating(true);
    startProgressAnimation();
    const imagesToUse = engineMode === "image-to-image" ? refImages : [];
    try {
      const generatedImage = await onGenerate(prompt.trim(), imagesToUse);
      completeProgressAnimation();
      setTimeout(() => {
        if (generatedImage) {
          setPreviewImage(generatedImage);
        }
      }, 300);
    } catch (error) {
      resetProgressAnimation();
      console.error("Generation error:", error);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        resetProgressAnimation();
      }, 600);
    }
  };

  const handleReset = () => {
    setPreviewImage(null);
    if (onReset) {
      onReset();
    }
  };

  const handleSave = async () => {
    if (!previewImage || !userId) return;

    setIsSaving(true);
    startProgressAnimation();
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        resetProgressAnimation();
        Alert.alert("Permission needed", "Need permission to save to gallery");
        setIsSaving(false);
        return;
      }

      // Progress: 30% - Gallery save
      Animated.timing(animatedProgress, {
        toValue: 40,
        duration: 500,
        useNativeDriver: false,
      }).start();

      await MediaLibrary.saveToLibraryAsync(previewImage.uri);

      // Progress: 60% - Base64 conversion
      Animated.timing(animatedProgress, {
        toValue: 70,
        duration: 300,
        useNativeDriver: false,
      }).start();

      const base64 = await FileSystem.readAsStringAsync(previewImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataURL = `data:image/jpeg;base64,${base64}`;

      // Progress: 90% - Cloud upload
      Animated.timing(animatedProgress, {
        toValue: 90,
        duration: 500,
        useNativeDriver: false,
      }).start();

      const result = await SupabaseImageServiceRN.uploadAndSaveImage(
        dataURL,
        userId
      );
      if (result.success) {
        completeProgressAnimation();
        setTimeout(async () => {
          await loadGalleryImages();
          Alert.alert("Saved", "Image saved to gallery and Supabase");
          setPreviewImage(null);
        }, 300);
      } else {
        resetProgressAnimation();
        Alert.alert("Error", result.error || "Failed to save");
      }
    } catch (error) {
      resetProgressAnimation();
      Alert.alert("Error", "Failed to save image");
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        resetProgressAnimation();
      }, 600);
    }
  };

  return (
    <View className="flex-1">
      {/* Generated Image Display */}
      <View className="mb-4">
        {previewImage ? (
          <>
            <Text className="text-zinc-400 text-sm mb-2 font-medium">
              Generated Image
            </Text>
            <View className="bg-zinc-800 border border-zinc-700 rounded-xl p-2">
              <Image
                source={{ uri: previewImage.uri }}
                className="w-full h-48 rounded-lg"
                resizeMode="contain"
              />
              <View className="flex-row justify-around w-full mt-3">
                <TouchableOpacity
                  onPress={handleReset}
                  className="bg-zinc-700 px-4 py-2 rounded-full flex-1 mr-2 items-center border border-zinc-600"
                >
                  <Text className="text-zinc-300 text-center font-semibold">
                    Reset
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="bg-purple-600 px-4 py-2 rounded-full flex-1 ml-2 items-center"
                >
                  <Text className="text-white text-center font-semibold">
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 mb-4">
            <View className="flex justify-center items-center py-8">
              <Ionicons name="image-outline" size={48} color="#71717a" />
              <Text className="text-zinc-400 text-lg font-medium mt-2">
                Your image will show here
              </Text>
              <Text className="text-zinc-500 text-sm text-center mt-1">
                Generate an image using the prompt below
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
        <Text className="text-white text-xl font-bold mb-4">Prompt Engine</Text>

        <View className="flex-row bg-zinc-800 rounded-full mb-4">
          <TouchableOpacity
            onPress={() => {
              setEngineMode("text-to-image");
              setRefImages([]);
            }}
            className={`flex-1 p-3 rounded-full ${
              engineMode === "text-to-image" ? "bg-purple-600" : ""
            }`}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Text to Image
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEngineMode("image-to-image")}
            className={`flex-1 p-3 rounded-full ${
              engineMode === "image-to-image" ? "bg-purple-600" : ""
            }`}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Image to Image
            </Text>
          </TouchableOpacity>
        </View>

        {engineMode === "image-to-image" && (
          <View className="mb-4">
            <Text className="text-zinc-400 mb-2 font-medium">
              Reference Images ({refImages.length}/9)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {refImages.length < 9 && (
                  <TouchableOpacity
                    onPress={handleUploadRefImage}
                    disabled={isGenerating}
                    className="bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg h-20 w-20 flex justify-center items-center mr-3"
                  >
                    <Ionicons name="add" size={24} color="#a1a1aa" />
                    <Text className="text-zinc-500 text-xs mt-1">Add</Text>
                  </TouchableOpacity>
                )}
                {refImages.map((image, index) => (
                  <View key={index} className="relative mr-3">
                    <Image
                      source={{ uri: image.uri }}
                      className="w-20 h-20 rounded-lg"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      disabled={isGenerating}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex justify-center items-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-zinc-400 mb-2 font-medium">Prompt</Text>
          <TextInput
            placeholder="Describe the image you want to generate..."
            className="bg-zinc-800 text-white rounded-lg p-4 h-32 w-full text-base"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            placeholderTextColor="#a1a1aa"
            editable={!isGenerating}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`rounded-full p-4 w-full items-center ${
            isGenerating || !prompt.trim() ? "bg-zinc-700" : "bg-purple-600"
          }`}
        >
          <Text
            className={`font-bold text-lg ${
              isGenerating || !prompt.trim() ? "text-zinc-400" : "text-white"
            }`}
          >
            {isGenerating ? "Generating..." : "Generate Image"}
          </Text>
        </TouchableOpacity>
      </View>

      <LoadingModal
        visible={isSaving}
        title="Saving to Gallery"
        message="Storing your generated image..."
        animatedProgress={animatedProgress}
      />
      <LoadingModal
        visible={isGenerating}
        title="Creating Magic"
        message="AI is processing your request..."
        animatedProgress={animatedProgress}
      />
    </View>
  );
};

export default PromptEngine;
