import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface ImageAsset {
  uri: string;
  base64?: string | null;
}

interface QuickEditScreenProps {
  quickEditImage: ImageAsset | null;
  onBackToHome: () => void;
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  onRePickImage: () => void;
  isLoading: boolean;
}

const QuickEditScreen: React.FC<QuickEditScreenProps> = ({
  quickEditImage,
  onBackToHome,
  onGenerate,
  onImageEdit,
  onRePickImage,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<
    "combine" | "retouch" | "crop" | "adjust" | "filters" | "image-to-image"
  >("retouch");

  const insets = useSafeAreaInsets();

  // Debug logging
  console.log("QuickEditScreen rendered");
  console.log("QuickEditScreen - quickEditImage:", quickEditImage);
  console.log("QuickEditScreen - quickEditImage URI:", quickEditImage?.uri);

  const tabs = [
    { id: "combine" as const, label: "Combine", icon: "layers" },
    { id: "retouch" as const, label: "Retouch", icon: "brush" },
    { id: "crop" as const, label: "Crop", icon: "crop" },
    { id: "adjust" as const, label: "Adjust", icon: "options" },
    { id: "filters" as const, label: "Filters", icon: "color-filter" },
  ];

  const TabContent = () => {
    switch (activeTab) {
      case "combine":
        return <CombineTab onGenerate={onGenerate} isLoading={isLoading} />;
      case "retouch":
        return (
          <RetouchTab
            onGenerate={onGenerate}
            onImageEdit={onImageEdit}
            quickEditImage={quickEditImage}
            isLoading={isLoading}
          />
        );
      case "crop":
        return (
          <CropTab
            onImageEdit={onImageEdit}
            quickEditImage={quickEditImage}
            isLoading={isLoading}
          />
        );
      case "adjust":
        return (
          <AdjustTab
            onImageEdit={onImageEdit}
            quickEditImage={quickEditImage}
            isLoading={isLoading}
          />
        );
      case "filters":
        return (
          <FiltersTab
            onImageEdit={onImageEdit}
            quickEditImage={quickEditImage}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "black" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar style="light" />

      {/* Header with Back Button */}
      <View className="bg-zinc-900 border-b border-zinc-700 px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={onBackToHome}
            className="flex-row items-center mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white ml-2 font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Tabs Row */}
      <View className="bg-zinc-900 border-b border-zinc-700">
        <View className="flex-row justify-around pt-3 pb-3">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className="flex-col items-center gap-1 px-3"
            >
              <Ionicons
                name={tab.icon as any}
                size={28}
                color={activeTab === tab.id ? "#c084fc" : "white"}
              />
              <Text
                className={`${
                  activeTab === tab.id ? "text-purple-400" : "text-white"
                } text-xs text-center`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Enlarged Image Preview - Full Size */}
      <View className="flex-1 flex justify-center items-center bg-zinc-900 relative">
        {quickEditImage ? (
          <>
            {console.log("Rendering image with URI:", quickEditImage.uri)}
            <Image
              source={{ uri: quickEditImage.uri }}
              className="w-full h-full"
              resizeMode="contain"
              style={{ flex: 1, width: "100%", height: "100%" }}
              onLoad={() => console.log("Image loaded successfully")}
              onError={(error) => {
                console.error("Image load error:", error);
                console.error("Failed URI:", quickEditImage.uri);
              }}
            />
            {/* Re-select image button */}
            <TouchableOpacity
              onPress={onRePickImage}
              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
              style={{ paddingTop: Math.max(insets.top * 0.25, 0) }}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <View className="flex justify-center items-center">
            <Ionicons name="image" size={48} color="#a1a1aa" />
            <Text className="text-zinc-400 text-base mt-4 text-center">
              No image selected
            </Text>
            <Text className="text-zinc-500 text-sm mt-2 text-center">
              Upload an image to start editing
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      <View
        className="bg-zinc-900/80 border-t border-zinc-700"
        // pastikan aman dari home indicator
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {/* Tab Content */}
        <TabContent />

        {/* Bottom Row - Undo/Redo/New/Save */}
        <View className="flex-row justify-around items-center p-3">
          <TouchableOpacity className="flex-col items-center">
            <Ionicons name="arrow-undo" size={24} color="#a1a1aa" />
            <Text className="text-zinc-400 text-xs mt-1">Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-col items-center">
            <Ionicons name="arrow-redo" size={24} color="#a1a1aa" />
            <Text className="text-zinc-400 text-xs mt-1">Redo</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-col items-center">
            <Ionicons name="refresh" size={24} color="#a1a1aa" />
            <Text className="text-zinc-400 text-xs mt-1">Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onBackToHome}
            className="flex-col items-center"
          >
            <Ionicons name="cloud-upload" size={24} color="#a1a1aa" />
            <Text className="text-zinc-400 text-xs mt-1">New</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-col items-center">
            <Ionicons name="download" size={24} color="white" />
            <Text className="text-white text-xs mt-1">Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const CombineTab: React.FC<{
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  isLoading: boolean;
}> = ({ onGenerate, isLoading }) => {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [prompt, setPrompt] = useState("");

  const pickImage = async () => {
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
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = {
          uri: result.assets[0].uri,
          base64: null,
        };
        setImages((prev) => [...prev, asset]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleUpload = () => {
    if (images.length >= 5) return;
    pickImage();
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View className="p-4">
      <Text className="text-white text-lg font-bold">Multi Image Studio</Text>
      <Text className="text-zinc-400 mb-2">upload → describe → generate</Text>
      <Text className="text-zinc-300 mb-2">
        {images.length}/5 images uploaded
      </Text>

      {/* Upload Card and Previews */}
      <View className="flex-row flex-wrap mb-2">
        {/* Upload Card */}
        {images.length < 5 && (
          <TouchableOpacity
            onPress={handleUpload}
            className="bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg h-16 w-16 flex justify-center items-center mr-2 mb-2"
          >
            <Ionicons name="cloud-upload" size={20} color="white" />
          </TouchableOpacity>
        )}

        {/* Image Previews */}
        {images.map((image, index) => (
          <View key={index} className="relative mr-2 mb-2">
            <Image
              source={{ uri: image.uri }}
              className="w-16 h-16 rounded-lg"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => removeImage(index)}
              className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex justify-center items-center"
            >
              <Ionicons name="close" size={12} color="white" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TextInput
        placeholder="Describe the combination..."
        className="bg-zinc-800 text-white rounded-lg p-3 w-full text-base mb-2"
        value={prompt}
        onChangeText={setPrompt}
        placeholderTextColor="#a1a1aa"
      />
      <TouchableOpacity
        onPress={() => onGenerate(prompt, images)}
        disabled={isLoading || images.length === 0}
        className="bg-purple-600 rounded-lg p-3 w-full items-center"
      >
        <Text className="text-white font-bold">
          {isLoading ? "Generating..." : "Generate"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const RetouchTab: React.FC<{
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  quickEditImage: ImageAsset | null;
  isLoading: boolean;
}> = ({ onGenerate, onImageEdit, quickEditImage, isLoading }) => {
  const [prompt, setPrompt] = useState("");

  const handleExecuteEdit = () => {
    if (quickEditImage && prompt.trim()) {
      onImageEdit("adjust", quickEditImage.uri, prompt);
    }
  };

  return (
    <View className="p-4 flex-row gap-2">
      <TextInput
        placeholder="e.g., remove the person in the back"
        className="bg-zinc-800 text-white rounded-lg p-3 text-base flex-1"
        value={prompt}
        onChangeText={setPrompt}
        placeholderTextColor="#a1a1aa"
      />
      <TouchableOpacity
        onPress={handleExecuteEdit}
        disabled={isLoading || !quickEditImage}
        className="bg-purple-600 rounded-lg p-3 h-full"
      >
        <Text className="text-white font-bold">
          {isLoading ? "..." : "Execute Edit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const CropTab: React.FC<{
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  quickEditImage: ImageAsset | null;
  isLoading: boolean;
}> = ({ onImageEdit, quickEditImage, isLoading }) => {
  const [cropMode, setCropMode] = useState<"free" | "1:1" | "16:9">("free");

  const handleExecuteCrop = () => {
    if (quickEditImage) {
      onImageEdit("crop", quickEditImage.uri, cropMode);
    }
  };

  return (
    <View className="p-4">
      <View className="flex-row justify-center gap-2 mb-4">
        <TouchableOpacity
          onPress={() => setCropMode("free")}
          className={`px-4 py-2 rounded-full ${
            cropMode === "free" ? "bg-purple-600" : "bg-zinc-700"
          }`}
        >
          <Text className="text-white font-semibold">Free</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCropMode("1:1")}
          className={`px-4 py-2 rounded-full ${
            cropMode === "1:1" ? "bg-purple-600" : "bg-zinc-700"
          }`}
        >
          <Text className="text-white font-semibold">1:1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCropMode("16:9")}
          className={`px-4 py-2 rounded-full ${
            cropMode === "16:9" ? "bg-purple-600" : "bg-zinc-700"
          }`}
        >
          <Text className="text-white font-semibold">16:9</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={handleExecuteCrop}
        disabled={isLoading || !quickEditImage}
        className="bg-purple-600 rounded-lg p-3 w-full items-center"
      >
        <Text className="text-white font-bold">
          {isLoading ? "Cropping..." : "Execute Crop"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const AdjustTab: React.FC<{
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  quickEditImage: ImageAsset | null;
  isLoading: boolean;
}> = ({ onImageEdit, quickEditImage, isLoading }) => {
  const [selectedAdjust, setSelectedAdjust] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleExecuteAdjust = () => {
    if (quickEditImage) {
      const adjustment = customPrompt.trim() || selectedAdjust;
      if (adjustment) {
        onImageEdit("adjust", quickEditImage.uri, adjustment);
      }
    }
  };

  return (
    <View className="p-4">
      <View className="flex-row flex-wrap justify-center mb-2">
        {[
          "Blur Background",
          "Enhance Details",
          "Warmer Lighting",
          "Studio Light",
        ].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => {
              setSelectedAdjust(item);
              setCustomPrompt("");
            }}
            className={`px-3 py-2 rounded-full m-1 ${
              selectedAdjust === item ? "bg-purple-600" : "bg-zinc-700"
            }`}
          >
            <Text className="text-white">{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        placeholder="Or type a custom adjustment..."
        className="bg-zinc-800 text-white rounded-lg p-3 w-full text-base mb-2"
        value={customPrompt}
        onChangeText={(text) => {
          setCustomPrompt(text);
          setSelectedAdjust("");
        }}
        placeholderTextColor="#a1a1aa"
      />
      <TouchableOpacity
        onPress={handleExecuteAdjust}
        disabled={
          isLoading ||
          !quickEditImage ||
          (!selectedAdjust && !customPrompt.trim())
        }
        className="bg-purple-600 rounded-lg p-3 w-full items-center"
      >
        <Text className="text-white font-bold">
          {isLoading ? "Adjusting..." : "Execute Adjust"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const FiltersTab: React.FC<{
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  quickEditImage: ImageAsset | null;
  isLoading: boolean;
}> = ({ onImageEdit, quickEditImage, isLoading }) => {
  const [selectedFilter, setSelectedFilter] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleExecuteFilter = () => {
    if (quickEditImage) {
      const filter = customPrompt.trim() || selectedFilter;
      if (filter) {
        onImageEdit("filter", quickEditImage.uri, filter);
      }
    }
  };

  return (
    <View className="p-4">
      <View className="flex-row justify-center gap-2 mb-2">
        {["Synthwave", "Anime", "Lomo", "Glitch"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => {
              setSelectedFilter(item);
              setCustomPrompt("");
            }}
            className={`px-4 py-2 rounded-full ${
              selectedFilter === item ? "bg-purple-600" : "bg-zinc-700"
            }`}
          >
            <Text className="text-white">{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        placeholder="Or create a custom filter..."
        className="bg-zinc-800 text-white rounded-lg p-3 w-full text-base mb-2"
        value={customPrompt}
        onChangeText={(text) => {
          setCustomPrompt(text);
          setSelectedFilter("");
        }}
        placeholderTextColor="#a1a1aa"
      />
      <TouchableOpacity
        onPress={handleExecuteFilter}
        disabled={
          isLoading ||
          !quickEditImage ||
          (!selectedFilter && !customPrompt.trim())
        }
        className="bg-purple-600 rounded-lg p-3 w-full items-center"
      >
        <Text className="text-white font-bold">
          {isLoading ? "Applying Filter..." : "Execute Filter"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default QuickEditScreen;
