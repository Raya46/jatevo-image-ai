import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface GalleryImage {
  id: number;
  uri: string;
}

interface ImageAsset {
  uri: string;
  base64?: string | null;
}

interface MainScreenProps {
  onQuickEditPress: () => void;
  galleryImages: GalleryImage[];
  onEditImage: (image: GalleryImage) => void;
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  isLoading: boolean;
}

const MainScreen: React.FC<MainScreenProps> = ({
  onQuickEditPress,
  galleryImages,
  onEditImage,
  onGenerate,
  isLoading,
}) => {
  return (
    <ScrollView className="flex-1 bg-black p-4">
      <Text className="text-white text-3xl font-bold text-center mb-2">
        JATEVO
      </Text>
      <Text className="text-purple-400 text-3xl font-bold text-center mb-6">
        PHOTO EDITOR AI
      </Text>

      {/* --- Quick Edit Card --- */}
      <View className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-6 w-full">
        <Text className="text-white text-2xl font-bold mb-2">Quick Edit</Text>
        <Text className="text-zinc-400 text-base mb-4">
          Upload an image to directly access retouch tools
        </Text>

        {/* Upload Card */}
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
        <PromptEngine onGenerate={onGenerate} isLoading={isLoading} />
        <OutputGallery
          galleryImages={galleryImages}
          onEditImage={onEditImage}
        />
      </View>
    </ScrollView>
  );
};

// Komponen untuk Prompt Engine
const PromptEngine: React.FC<{
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  isLoading: boolean;
}> = ({ onGenerate, isLoading }) => {
  const [engineMode, setEngineMode] = useState<
    "text-to-image" | "image-to-image"
  >("text-to-image");
  const [refImages, setRefImages] = useState<ImageAsset[]>([]);
  const [prompt, setPrompt] = useState("");

  const handleUploadRefImage = () => {
    if (refImages.length >= 9) return;
    // This will be handled by the parent component
    console.log("Upload ref image clicked");
  };

  return (
    <View className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
      <Text className="text-white text-xl font-bold mb-4">Prompt Engine</Text>
      <View className="flex-row bg-zinc-800 rounded-full mb-4">
        <TouchableOpacity
          onPress={() => setEngineMode("text-to-image")}
          className={`flex-1 p-2 rounded-full ${
            engineMode === "text-to-image" ? "bg-purple-600" : ""
          }`}
        >
          <Text className="text-white text-center font-semibold">
            Text to Image
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setEngineMode("image-to-image")}
          className={`flex-1 p-2 rounded-full ${
            engineMode === "image-to-image" ? "bg-purple-600" : ""
          }`}
        >
          <Text className="text-white text-center font-semibold">
            Image to Image
          </Text>
        </TouchableOpacity>
      </View>

      {engineMode === "image-to-image" && (
        <View className="mb-4">
          <Text className="text-zinc-400 mb-2">
            Reference Images ({refImages.length}/9)
          </Text>
          <TouchableOpacity
            onPress={handleUploadRefImage}
            className="bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg h-20 w-full flex justify-center items-center"
          >
            <Ionicons name="cloud-upload" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        placeholder="Describe your vision..."
        className="bg-zinc-800 text-white rounded-lg p-3 h-32 w-full text-base"
        value={prompt}
        onChangeText={setPrompt}
        multiline
        placeholderTextColor="#a1a1aa"
      />
      <TouchableOpacity
        onPress={() => onGenerate(prompt, refImages)}
        disabled={isLoading}
        className="bg-purple-600 rounded-full p-4 mt-4 w-full items-center"
      >
        <Text className="text-white font-bold text-lg">
          {isLoading ? "Generating..." : "Generate"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Komponen untuk Galeri Hasil
const OutputGallery: React.FC<{
  galleryImages: GalleryImage[];
  onEditImage: (image: GalleryImage) => void;
}> = ({ galleryImages, onEditImage }) => {
  return (
    <View className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 h-96">
      <Text className="text-white text-xl font-bold mb-4">Output Gallery</Text>
      <ScrollView className="h-[calc(100%-40px)]">
        <View className="flex-row flex-wrap">
          {galleryImages.map((img) => (
            <View
              key={img.id}
              className="w-[48%] aspect-square rounded-lg overflow-hidden relative m-1"
            >
              <Image
                source={{ uri: img.uri }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/30 flex justify-center items-center">
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => onEditImage(img)}
                    className="bg-black/50 p-2 rounded-full"
                  >
                    <MaterialIcons name="edit" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-black/50 p-2 rounded-full">
                    <Ionicons name="download" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default MainScreen;
