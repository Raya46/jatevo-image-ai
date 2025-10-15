import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const animatedProgress = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const promptInputRef = useRef<TextInput>(null);

  // Listen for keyboard show/hide events with actual height
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard shows
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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

  // Image-to-image specific templates
  const imageToImageTemplates = [
    {
      name: "STYLE TRANSFER",
      template:
        "Create a new image that incorporates the artistic style and visual elements from the reference image(s), but with this subject: [describe your subject]. Maintain the color palette, brush techniques, and overall aesthetic from the reference while applying it to your subject.",
    },
    {
      name: "COMPOSITION RECREATE",
      template:
        "Recreate the composition and layout from the reference image(s) but with this subject: [describe your subject]. Keep similar positioning, angles, and visual flow, but replace the main elements with your specified subject.",
    },
    {
      name: "COLOR & MOOD",
      template:
        "Create an image with the same color scheme and mood as the reference image(s), but featuring: [describe your subject]. Focus on preserving the emotional tone and atmospheric qualities while changing the main subject.",
    },
    {
      name: "ELEMENTS COMBINE",
      template:
        "Combine key visual elements from the reference image(s) with these new elements: [describe additional elements]. Create a harmonious blend that incorporates both the reference characteristics and your specified additions.",
    },
    {
      name: "ENHANCE & MODIFY",
      template:
        "Take the reference image(s) as a base and enhance/modify them by: [describe modifications]. Keep the core elements intact but apply the specified changes to create an improved or altered version.",
    },
    {
      name: "BASIC COMBINE",
      template:
        "Combine ALL the provided reference images into a single composite image. Merge the images together seamlessly, arranging them in a natural and aesthetically pleasing way. Create one unified image that incorporates all elements from the reference images without overlapping or creating disjointed scenes. The final result should look like a single cohesive image that naturally combines all the provided images.",
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
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        if (
          result.assets[0].base64 &&
          result.assets[0].base64.length > 20000000
        ) {
          Alert.alert(
            "Image Too Large",
            "The selected image is too large. Please choose a smaller image (under 2MB)."
          );
          return;
        }

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

    if (refImages.length >= 3) {
      Alert.alert(
        "Too Many Images",
        "For best results, we recommend using 1-3 reference images. More images may confuse the AI. Would you like to continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: pickImage },
        ]
      );
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

    if (engineMode === "image-to-image" && refImages.length === 0) {
      Alert.alert(
        "No Reference Images",
        "Please add at least one reference image for image-to-image generation. Switch to Text to Image mode if you want to generate without reference images."
      );
      return;
    }

    setIsGenerating(true);
    resetProgressAnimation();
    startProgressAnimation();

    const imagesToUse = engineMode === "image-to-image" ? refImages : [];
    try {
      const generatedImage = await onGenerate(
        prompt.trim(),
        imagesToUse,
        (progress: number) => {
          setCurrentProgress(progress);
          animatedProgress.setValue(progress);
        }
      );

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

      let errorMessage = "Failed to generate image";
      if (engineMode === "image-to-image") {
        errorMessage =
          "Failed to generate image from references. Try with different reference images or a more detailed prompt.";
      }

      Alert.alert("Generation Error", errorMessage);
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
    startProgressAnimation();

    try {
      animatedProgress.setValue(10);
      setCurrentProgress(10);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        resetProgressAnimation();
        Alert.alert("Permission needed", "Need permission to save to gallery");
        setIsSaving(false);
        return;
      }

      animatedProgress.setValue(40);
      setCurrentProgress(40);
      await MediaLibrary.saveToLibraryAsync(previewImage.uri);

      animatedProgress.setValue(70);
      setCurrentProgress(70);
      const base64 = await FileSystem.readAsStringAsync(previewImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataURL = `data:image/jpeg;base64,${base64}`;

      animatedProgress.setValue(90);
      setCurrentProgress(90);
      const result = await SupabaseImageServiceRN.uploadAndSaveImage(
        dataURL,
        userId,
        (progress: number) => {
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              {previewImage ? (
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
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-600 font-medium">
                        Reference Images ({refImages.length}/9)
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "Image to Image Guide",
                            "Add reference images to guide the AI. The AI will analyze your images and create a new one based on them and your prompt. For best results:\n• Use clear, high-quality images\n• Add 1-3 reference images\n• Be specific in your prompt about what to incorporate",
                            [{ text: "Got it!" }]
                          );
                        }}
                        className="bg-blue-100 px-2 py-1 rounded-full"
                      >
                        <Ionicons
                          name="help-circle"
                          size={14}
                          color="#2563eb"
                        />
                      </TouchableOpacity>
                    </View>

                    {refImages.length === 0 && (
                      <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="information-circle"
                            size={16}
                            color="#2563eb"
                          />
                          <Text className="text-blue-700 text-xs ml-2 flex-1">
                            Add at least one reference image to start. The AI
                            will use it as inspiration.
                          </Text>
                        </View>
                      </View>
                    )}

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View className="flex-row">
                        {refImages.length < 9 && (
                          <TouchableOpacity
                            onPress={handleUploadRefImage}
                            disabled={isGenerating}
                            className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-20 w-20 flex justify-center items-center mr-3"
                          >
                            <Ionicons name="add" size={24} color="#6b7280" />
                            <Text className="text-gray-500 text-xs mt-1">
                              Add
                            </Text>
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
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        <View className="flex-row gap-2 pb-2">
                          {(engineMode === "image-to-image"
                            ? imageToImageTemplates
                            : promptTemplates
                          ).map((template, index) => (
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
                    ref={promptInputRef}
                    placeholder={
                      engineMode === "image-to-image"
                        ? "Describe what you want to create based on your reference images..."
                        : "Describe the image you want to generate..."
                    }
                    className="bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-4 min-h-[120px] max-h-[200px] w-full text-base"
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline
                    placeholderTextColor="#9ca3af"
                    editable={!isGenerating}
                    textAlignVertical="top"
                    blurOnSubmit={false}
                    returnKeyType="default"
                    scrollEnabled={true}
                    style={{ maxHeight: 200 }}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 300);
                    }}
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: Platform.OS === "ios" ? 20 : 20,
          }}
        >
          <View className="bg-white/95 border-t border-gray-300 p-4">
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`rounded-full p-4 w-full items-center ${
                isGenerating || !prompt.trim() ? "bg-gray-300" : "bg-blue-500"
              }`}
            >
              <Text
                className={`font-bold text-lg ${
                  isGenerating || !prompt.trim()
                    ? "text-gray-500"
                    : "text-white"
                }`}
              >
                {isGenerating ? "Generating..." : "Generate Image"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
