import { useBatchDownload, useImageDownload } from "@/hooks/useImageDownload";
import { ImageRecord } from "@/services/supabaseService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

interface GalleryImage {
  id: number;
  uri: string;
  supabaseRecord?: ImageRecord;
}

interface ImageAsset {
  uri: string;
  base64?: string | null;
}

interface MainScreenProps {
  onQuickEditPress: () => void;
  galleryImages: GalleryImage[];
  onEditImage: (image: GalleryImage) => void;
  onGenerate: (prompt: string, images: ImageAsset[]) => Promise<void>;
  isLoading: boolean;
  isInitialLoading: boolean;
}

const MainScreen: React.FC<MainScreenProps> = ({
  onQuickEditPress,
  galleryImages,
  onEditImage,
  onGenerate,
  isLoading,
  isInitialLoading,
}) => {
  const insets = useSafeAreaInsets();

  const handleGenerate = async (
    prompt: string,
    referenceImages: ImageAsset[]
  ) => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please enter a prompt to generate image");
      return;
    }

    try {
      await onGenerate(prompt, referenceImages);
    } catch (err) {
      console.error("Generation error:", err);
      Alert.alert(
        "Error",
        "An unexpected error occurred while generating image"
      );
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "black" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        className="flex-1 bg-black p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-white text-3xl font-bold text-center mb-2">
          JATEVO
        </Text>
        <Text className="text-purple-400 text-3xl font-bold text-center mb-6">
          PHOTO EDITOR AI
        </Text>

        {/* Quick Edit Card */}
        <View className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-6 w-full">
          <Text className="text-white text-2xl font-bold mb-2">Quick Edit</Text>
          <Text className="text-zinc-400 text-base mb-4">
            Upload an image to directly access retouch tools
          </Text>

          <TouchableOpacity
            onPress={onQuickEditPress}
            className="bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-xl p-6 w-full flex justify-center items-center"
          >
            <Ionicons name="cloud-upload" size={32} color="#a1a1aa" />
            <Text className="text-zinc-400 text-base mt-2 text-center">
              Tap to select image from gallery
            </Text>
            <Text className="text-zinc-500 text-sm mt-1 text-center">
              Image will be uploaded in full size
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-col gap-4">
          <PromptEngine onGenerate={handleGenerate} isLoading={isLoading} />
          <OutputGalleryWithDownload
            galleryImages={galleryImages}
            onEditImage={onEditImage}
            isInitialLoading={isInitialLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PromptEngine: React.FC<{
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  isLoading: boolean;
}> = ({ onGenerate, isLoading }) => {
  const [engineMode, setEngineMode] = useState<
    "text-to-image" | "image-to-image"
  >("text-to-image");
  const [refImages, setRefImages] = useState<ImageAsset[]>([]);
  const [prompt, setPrompt] = useState("");

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
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset: ImageAsset = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 || null,
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

  const handleGenerate = () => {
    if (!prompt.trim()) {
      Alert.alert(
        "Missing Prompt",
        "Please enter a description for your image"
      );
      return;
    }

    const imagesToUse = engineMode === "image-to-image" ? refImages : [];
    onGenerate(prompt.trim(), imagesToUse);
  };

  return (
    <View className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
      <Text className="text-white text-xl font-bold mb-4">Prompt Engine</Text>

      {/* Mode Toggle */}
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

      {/* Reference Images Section */}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex justify-center items-center"
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {engineMode === "image-to-image" && refImages.length === 0 && (
            <Text className="text-zinc-500 text-sm mt-2 italic">
              Add reference images to guide the generation
            </Text>
          )}
        </View>
      )}

      {/* Prompt Input */}
      <View className="mb-4">
        <Text className="text-zinc-400 mb-2 font-medium">Prompt</Text>
        <TextInput
          placeholder={
            engineMode === "text-to-image"
              ? "Describe the image you want to generate..."
              : "Describe how to modify the reference images..."
          }
          className="bg-zinc-800 text-white rounded-lg p-4 h-32 w-full text-base"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholderTextColor="#a1a1aa"
          editable={!isLoading}
          textAlignVertical="top"
        />
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        onPress={handleGenerate}
        disabled={isLoading || !prompt.trim()}
        className={`rounded-full p-4 w-full items-center ${
          isLoading || !prompt.trim() ? "bg-zinc-700" : "bg-purple-600"
        }`}
      >
        <Text
          className={`font-bold text-lg ${
            isLoading || !prompt.trim() ? "text-zinc-400" : "text-white"
          }`}
        >
          {isLoading ? "Generating..." : "Generate Image"}
        </Text>
      </TouchableOpacity>

      <Text className="text-zinc-500 text-xs mt-2 text-center">
        {engineMode === "text-to-image"
          ? "Create images from text descriptions"
          : "Modify images using reference images and prompts"}
      </Text>
    </View>
  );
};

const OutputGalleryWithDownload: React.FC<{
  galleryImages: GalleryImage[];
  onEditImage: (image: GalleryImage) => void;
  isInitialLoading: boolean;
}> = ({ galleryImages, onEditImage, isInitialLoading }) => {
  const { downloadImage, isDownloading, getProgress, totalActiveDownloads } =
    useImageDownload();

  const { downloadMultiple, isBatchDownloading, batchState } =
    useBatchDownload();

  const handleQuickDownload = async (image: GalleryImage) => {
    const success = await downloadImage(image, true);
    console.log(success ? "✅ Download completed" : "❌ Download failed");
  };

  return (
    <View className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
      {/* Header dengan download status */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-xl font-bold">
          Output Gallery ({galleryImages.length})
        </Text>
        {totalActiveDownloads > 0 && (
          <View className="flex-row items-center bg-blue-500/20 px-3 py-1 rounded-full">
            <Ionicons name="download" size={14} color="#60a5fa" />
            <Text className="text-blue-400 text-sm ml-1 font-medium">
              {totalActiveDownloads} downloading
            </Text>
          </View>
        )}
        {isBatchDownloading && (
          <View className="flex-row items-center bg-purple-500/20 px-3 py-1 rounded-full">
            <Ionicons name="download" size={14} color="#a855f7" />
            <Text className="text-purple-400 text-sm ml-1 font-medium">
              Batch: {batchState.completed}/{batchState.total}
            </Text>
          </View>
        )}
      </View>

      {/* Initial Loading Overlay */}
      {isInitialLoading && (
        <View className="absolute inset-0 bg-zinc-900/95 flex justify-center items-center rounded-2xl z-10">
          <View className="flex items-center">
            <View className="relative mb-4">
              <View className="w-16 h-16 bg-purple-600 rounded-full flex justify-center items-center">
                <Ionicons name="images" size={24} color="white" />
              </View>
              <View className="absolute inset-0 w-16 h-16 bg-purple-400 rounded-full animate-pulse opacity-30" />
            </View>
            <Text className="text-white text-lg font-bold mb-2">
              Loading Gallery
            </Text>
            <Text className="text-zinc-400 text-sm text-center max-w-xs">
              Fetching your images from the cloud...
            </Text>
            <View className="w-32 bg-zinc-700 rounded-full h-1 mt-4">
              <View
                className="bg-purple-500 h-1 rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </View>
          </View>
        </View>
      )}

      {galleryImages.length === 0 ? (
        <View className="flex-1 justify-center items-center py-8">
          <Ionicons name="images-outline" size={48} color="#52525b" />
          <Text className="text-zinc-500 text-center mt-4">
            No images generated yet
          </Text>
          <Text className="text-zinc-600 text-sm text-center mt-2">
            Use the Prompt Engine above to create your first image
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {galleryImages.map((img) => {
              const downloading = isDownloading(img.id);
              const progress = getProgress(img.id);

              return (
                <View
                  key={img.id}
                  className="w-[48%] aspect-square rounded-lg overflow-hidden relative mb-3 bg-zinc-800"
                >
                  {/* Loading placeholder */}
                  <View className="absolute inset-0 flex justify-center items-center">
                    <Text className="text-zinc-500 text-xs">Loading...</Text>
                  </View>

                  {/* Main Image */}
                  <Image
                    source={{ uri: img.uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Download Progress Overlay */}
                  {downloading && (
                    <View className="absolute inset-0 bg-black/50 flex justify-center items-center">
                      <View className="bg-white/20 backdrop-blur p-3 rounded-full">
                        <Text className="text-white font-bold text-lg">
                          {progress}%
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Progress Bar */}
                  {downloading && (
                    <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <View
                        className="h-full bg-blue-500"
                        style={{ width: `${progress}%` }}
                      />
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="absolute inset-0 bg-transparent">
                    {/* Main tap area */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="flex-1"
                      disabled={downloading}
                      onPress={() => {
                        Alert.alert("Image Options", `Image #${img.id}`, [
                          {
                            text: "Edit",
                            onPress: () => onEditImage(img),
                          },
                          {
                            text: "Download to Gallery",
                            onPress: () => handleQuickDownload(img),
                          },
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
                        ]);
                      }}
                    />

                    {/* Quick actions overlay */}
                    <View className="absolute bottom-2 right-2 flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => onEditImage(img)}
                        disabled={downloading}
                        className="bg-black/70 p-2 rounded-full"
                      >
                        <MaterialIcons
                          name="edit"
                          size={16}
                          color={downloading ? "#666" : "white"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleQuickDownload(img)}
                        disabled={downloading}
                        className="bg-black/70 p-2 rounded-full"
                      >
                        <Ionicons
                          name={downloading ? "hourglass" : "download"}
                          size={16}
                          color={downloading ? "#60a5fa" : "white"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="absolute top-2 right-2">
                    {downloading ? (
                      <View className="bg-blue-500 p-1 rounded-full">
                        <Ionicons name="download" size={12} color="white" />
                      </View>
                    ) : img.supabaseRecord ? (
                      <View className="bg-green-500 p-1 rounded-full">
                        <Ionicons name="cloud-done" size={12} color="white" />
                      </View>
                    ) : (
                      <View className="bg-zinc-600 p-1 rounded-full">
                        <Ionicons
                          name="phone-portrait"
                          size={12}
                          color="white"
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Batch Download Option */}
          {galleryImages.length > 1 && (
            <TouchableOpacity
              onPress={() => downloadMultiple(galleryImages, true)}
              className="bg-purple-600 p-4 rounded-xl mt-4 flex-row items-center justify-center"
              disabled={totalActiveDownloads > 0 || isBatchDownloading}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text className="text-white font-bold ml-2">
                {isBatchDownloading
                  ? `Downloading... (${batchState.completed}/${batchState.total})`
                  : `Download All Images (${galleryImages.length})`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Batch Download Progress Overlay */}
          {isBatchDownloading && (
            <View className="absolute inset-0 bg-black/60 flex justify-center items-center rounded-2xl">
              <View className="bg-zinc-800 p-6 rounded-2xl flex items-center max-w-xs">
                <Ionicons name="download" size={32} color="#a855f7" />
                <Text className="text-white text-lg font-bold mt-2">
                  Downloading Images...
                </Text>
                <Text className="text-zinc-400 text-sm mt-1 text-center">
                  {batchState.completed} of {batchState.total} completed
                </Text>
                <View className="w-full bg-zinc-700 rounded-full h-2 mt-4">
                  <View
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${
                        batchState.total > 0
                          ? (batchState.completed / batchState.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="text-zinc-500 text-xs mt-2">
                  Other features remain accessible
                </Text>
              </View>
            </View>
          )}

          {/* Debug info */}
          {__DEV__ && galleryImages.length > 0 && (
            <View className="mt-4 p-3 bg-zinc-800 rounded-lg">
              <Text className="text-zinc-400 text-xs font-bold">
                Download Status: {totalActiveDownloads} active
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default MainScreen;
