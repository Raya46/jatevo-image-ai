import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { CROP_MODES } from "../../helper/QuickEdit/constants";
import { CropRegion, ImageAsset, TabProps } from "../../helper/QuickEdit/types";

interface CropTabProps extends TabProps {
  cropRegion: CropRegion | null;
  cropMode: "free" | "1:1" | "16:9";
  setCropMode: (mode: "free" | "1:1" | "16:9") => void;
  imageLayout: { width: number; height: number } | null;
  originalImage: ImageAsset | null;
}

const CropTab: React.FC<CropTabProps> = ({
  onImageEdit,
  quickEditImage,
  isLoading,
  cropRegion,
  cropMode,
  setCropMode,
  imageLayout,
  originalImage,
}) => {
  const handleExecuteCrop = () => {
    if (quickEditImage && cropRegion && imageLayout && originalImage) {
      const scaleX =
        (originalImage.width ?? imageLayout.width) / imageLayout.width;
      const scaleY =
        (originalImage.height ?? imageLayout.height) / imageLayout.height;

      const cropParams = {
        mode: cropMode,
        region: {
          x: cropRegion.x * scaleX,
          y: cropRegion.y * scaleY,
          width: cropRegion.width * scaleX,
          height: cropRegion.height * scaleY,
        },
        imageSize: {
          width: originalImage.width ?? imageLayout.width,
          height: originalImage.height ?? imageLayout.height,
        },
      };
      onImageEdit("crop", quickEditImage.uri, cropParams, false);
    }
  };

  const canExecute = quickEditImage && !isLoading && cropRegion;

  return (
    <View className="px-4 py-6">
      <View className="flex-row gap-4 items-center">
        <View className="flex-row gap-2 flex-1">
          {CROP_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              onPress={() => setCropMode(mode.id)}
              className={`px-3 py-2 rounded-full flex-1 ${
                cropMode === mode.id ? "bg-blue-500" : "bg-gray-200"
              }`}
            >
              <Text className="text-gray-900 font-semibold text-center">
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={handleExecuteCrop}
          disabled={!canExecute}
          className={`rounded-lg px-4 p-3.5 justify-center ${
            canExecute ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <Text
            className={`font-bold ${
              canExecute ? "text-white" : "text-gray-500"
            }`}
          >
            {isLoading ? "..." : "Execute"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CropTab;
