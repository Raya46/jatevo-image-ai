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
