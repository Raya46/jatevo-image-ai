import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { CROP_MODES } from "../../helper/QuickEdit/constants";
import { TabProps } from "../../helper/QuickEdit/types";

const CropTab: React.FC<TabProps> = ({ 
  onImageEdit, 
  quickEditImage, 
  isLoading 
}) => {
  const [cropMode, setCropMode] = useState<"free" | "1:1" | "16:9">("free");

  const handleExecuteCrop = () => {
    if (quickEditImage) {
      onImageEdit("crop", quickEditImage.uri, cropMode);
    }
  };

  const canExecute = quickEditImage && !isLoading;

  return (
    <View className="p-4">
      <View className="flex-row justify-center gap-2 mb-4">
        {CROP_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            onPress={() => setCropMode(mode.id)}
            className={`px-4 py-2 rounded-full ${
              cropMode === mode.id ? "bg-purple-600" : "bg-zinc-700"
            }`}
          >
            <Text className="text-white font-semibold">{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity
        onPress={handleExecuteCrop}
        disabled={!canExecute}
        className={`rounded-lg p-3 w-full items-center ${
          canExecute ? "bg-purple-600" : "bg-zinc-700"
        }`}
      >
        <Text className="text-white font-bold">
          {isLoading ? "Cropping..." : "Execute Crop"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default CropTab;