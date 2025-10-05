import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Animated as RNAnimated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "../contexts/AppContext";
import { ImageAsset } from "../helper/QuickEdit/types";
import { SupabaseImageServiceRN } from "../services/supabaseService";
import LoadingModal from "./LoadingModal";

interface PromptEngineProps {
  onGenerate: (
    prompt: string,
    images: ImageAsset[],
    onProgress?: (progress: number) => void
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
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const animatedProgress = useRef(new RNAnimated.Value(0)).current;

  // Template prompts
  const promptTemplates = [
    {
      name: "KURIHINGAN",
      template:
        "Create a hyper-realistic stylish poster with a [input your ratio... X:y] aspect ratio, featuring a [input your object...] hovering mid-separation above a cutting board; surrounding this central action, a chaotic whirlwind of kitchen utensils, vegetables, fruits,spices-spirals violently as if caught in a miniature tornado, with hyper-detailed, juicy splatters and water droplets frozen in motion, all illuminated by soft, volumetric daylight pouring in from a large window off-camera, creating a sense of depth and dimension with soft shadows and highlighting the textures, set against a softly lit, out-of-focus kitchen background, using a vibrant and naturally lit color palette dominated by the [input your object...]'s fresh hues contrasted with water and metallic accents, rendered in a sharp, photographic style with subtle motion blur to emphasize the dynamic yet naturally lit movement of the scene.",
    },
    {
      name: "PORTRAIT PROFESSIONAL",
      template:
        "Professional headshot of a person, clean background, studio lighting, high resolution, business attire, confident expression, sharp focus, corporate style, neutral background, professional lighting, detailed facial features.",
    },
    {
      name: "FANTASY LANDSCAPE",
      template:
        "Epic fantasy landscape with [terrain], mystical creatures in the distance, dramatic lighting with [time_of_day] hues, ancient ruins, magical elements, hyper-detailed, cinematic composition, vibrant colors, ethereal atmosphere.",
    },
    {
      name: "CYBERPUNK CITY",
      template:
        "Cyberpunk cityscape at night, neon lights reflecting on wet streets, futuristic architecture, flying vehicles, dense urban environment, holographic advertisements, dramatic perspective, high contrast, cinematic lighting.",
    },
    {
      name: "MINIMALIST DESIGN",
      template:
        "Minimalist [object] design, clean lines, negative space, monochromatic color scheme with [accent_color] accent, simple composition, elegant proportions, contemporary aesthetic, studio lighting, pure background.",
    },
  ];

  const startProgressAnimation = () => {
    animatedProgress.setValue(0);
    RNAnimated.timing(animatedProgress, {
      toValue: 90,
      duration: 2500,
      useNativeDriver: false,
    }).start();
  };

  const completeProgressAnimation = () => {
    RNAnimated.timing(animatedProgress, {
      toValue: 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const resetProgressAnimation = () => {
    setCurrentProgress(0);
    animatedProgress.setValue(0);
  };

  const applyTemplate = (template: string) => {
    setPrompt(template);
    setShowTemplates(false);
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
    resetProgressAnimation();

    // Start the progress animation
    startProgressAnimation();

    const imagesToUse = engineMode === "image-to-image" ? refImages : [];
    try {
      const generatedImage = await onGenerate(
        prompt.trim(),
        imagesToUse,
        (progress: number) => {
          // Update progress bar with real progress from generation
          setCurrentProgress(progress);
          // Update the animated progress to match real progress
          animatedProgress.setValue(progress);
        }
      );

      // Complete the progress bar animation
      completeProgressAnimation();
      setCurrentProgress(100);
      setTimeout(() => {
        if (generatedImage) {
          setPreviewImage(generatedImage);
        }
      }, 300);
    } catch (error) {
      console.error("Generation error:", error);
      resetProgressAnimation();
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
    resetProgressAnimation();

    // Start the progress animation
    startProgressAnimation();

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
      await MediaLibrary.saveToLibraryAsync(previewImage.uri);

      // Step 3: Convert to base64 (70%)
      animatedProgress.setValue(70);
      setCurrentProgress(70);
      const base64 = await FileSystem.readAsStringAsync(previewImage.uri, {
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <SafeAreaView className="flex-1 bg-transparent">
        {/* Generated Image Display */}
        {previewImage ? (
          <>
            <View className="bg-white border border-gray-300 rounded-xl p-2 mx-4 mb-4">
              <Image
                source={{ uri: previewImage.uri }}
                className="w-full h-48 rounded-lg"
                resizeMode="contain"
              />
              <View className="flex-row justify-around w-full mt-3">
                <TouchableOpacity
                  onPress={handleReset}
                  className="bg-gray-200 px-4 py-2 rounded-full flex-1 mr-2 items-center border border-gray-300"
                >
                  <Text className="text-gray-800 text-center font-semibold">
                    Reset
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="bg-blue-500 px-4 py-2 rounded-full flex-1 ml-2 items-center"
                >
                  <Text className="text-white text-center font-semibold">
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View className="bg-gray-100 border border-gray-300 rounded-xl p-4 mb-4 mx-4">
            <View className="flex justify-center items-center py-8">
              <Ionicons name="image-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-600 text-lg font-medium mt-2">
                Your image will show here
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-1">
                Generate an image using the prompt below
              </Text>
            </View>
          </View>
        )}

        <View className="bg-white border border-gray-300 rounded-2xl p-4 mx-4">
          <Text className="text-gray-900 text-xl font-bold mb-4">
            Prompt Engine
          </Text>

          <View className="flex-row bg-gray-100 rounded-full mb-4 border border-gray-200">
            <TouchableOpacity
              onPress={() => {
                setEngineMode("text-to-image");
                setRefImages([]);
              }}
              className={`flex-1 p-3 rounded-full ${
                engineMode === "text-to-image" ? "bg-blue-500" : ""
              }`}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  engineMode === "text-to-image"
                    ? "text-white"
                    : "text-gray-700"
                }`}
              >
                Text to Image
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEngineMode("image-to-image")}
              className={`flex-1 p-3 rounded-full ${
                engineMode === "image-to-image" ? "bg-blue-500" : ""
              }`}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  engineMode === "image-to-image"
                    ? "text-white"
                    : "text-gray-700"
                }`}
              >
                Image to Image
              </Text>
            </TouchableOpacity>
          </View>

          {engineMode === "image-to-image" && (
            <View className="mb-4">
              <Text className="text-gray-600 mb-2 font-medium">
                Reference Images ({refImages.length}/9)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {refImages.length < 9 && (
                    <TouchableOpacity
                      onPress={handleUploadRefImage}
                      disabled={isGenerating}
                      className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-20 w-20 flex justify-center items-center mr-3"
                    >
                      <Ionicons name="add" size={24} color="#6b7280" />
                      <Text className="text-gray-500 text-xs mt-1">Add</Text>
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
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600 font-medium">Prompt</Text>
              <TouchableOpacity
                onPress={() => setShowTemplates(!showTemplates)}
                disabled={isGenerating}
                className="bg-blue-100 px-3 py-1 rounded-full"
              >
                <Text className="text-blue-600 text-sm font-medium">
                  {showTemplates ? "Hide Templates" : "Use Template"}
                </Text>
              </TouchableOpacity>
            </View>

            {showTemplates && (
              <View className="mb-3 max-h-32 overflow-y-auto">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2 pb-2">
                    {promptTemplates.map((template, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => applyTemplate(template.template)}
                        disabled={isGenerating}
                        className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 min-w-[120px]"
                      >
                        <Text className="text-blue-700 text-xs font-medium text-center">
                          {template.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <TextInput
              placeholder="Describe the image you want to generate..."
              className="bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-4 h-32 w-full text-base"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholderTextColor="#9ca3af"
              editable={!isGenerating}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`rounded-full p-4 w-full items-center ${
              isGenerating || !prompt.trim() ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            <Text
              className={`font-bold text-lg ${
                isGenerating || !prompt.trim() ? "text-gray-500" : "text-white"
              }`}
            >
              {isGenerating ? "Generating..." : "Generate Image"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <LoadingModal
        visible={isSaving}
        title="Saving to Gallery"
        message="Storing your generated image..."
        animatedProgress={animatedProgress}
        progress={currentProgress}
      />
      <LoadingModal
        visible={isGenerating}
        title="Creating Magic"
        message="AI is processing your request..."
        animatedProgress={animatedProgress}
        progress={currentProgress}
      />
    </GestureHandlerRootView>
  );
};

export default PromptEngine;
