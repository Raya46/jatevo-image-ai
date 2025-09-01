import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MAX_IMAGES } from "../../helper/QuickEdit/constants";
import { CombineTabProps, ImageAsset } from "../../helper/QuickEdit/types";
import { pickImageFromLibrary, requestImagePermission } from "../../utils/QuickEditUtils";

const CombineTab: React.FC<CombineTabProps> = ({ onGenerate, isLoading }) => {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [prompt, setPrompt] = useState("");

  const handleAddImage = async () => {
    if (images.length >= MAX_IMAGES) return;
    
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    const image = await pickImageFromLibrary();
    if (image) {
      setImages(prev => [...prev, image]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const canGenerate = images.length > 0 && !isLoading;

  return (
    <View className="p-4">
      <Text className="text-white text-lg font-bold">Multi Image Studio</Text>
      <Text className="text-zinc-400 mb-2">upload → describe → generate</Text>
      <Text className="text-zinc-300 mb-2">
        {images.length}/{MAX_IMAGES} images uploaded
      </Text>

      {/* Upload and Preview Section */}
      <View className="flex-row flex-wrap mb-2">
        {images.length < MAX_IMAGES && (
          <TouchableOpacity
            onPress={handleAddImage}
            className="bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg h-16 w-16 flex justify-center items-center mr-2 mb-2"
          >
            <Ionicons name="cloud-upload" size={20} color="white" />
          </TouchableOpacity>
        )}

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
        disabled={!canGenerate}
        className={`rounded-lg p-3 w-full items-center ${
          canGenerate ? "bg-purple-600" : "bg-zinc-700"
        }`}
      >
        <Text className="text-white font-bold">
          {isLoading ? "Generating..." : "Generate"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default CombineTab;