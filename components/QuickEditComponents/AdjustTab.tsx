import React, { useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ADJUSTMENT_PRESETS } from "../../helper/QuickEdit/constants";
import { TabProps } from "../../helper/QuickEdit/types";

const AdjustTab: React.FC<TabProps> = ({
  onImageEdit,
  quickEditImage,
  isLoading,
}) => {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleExecuteAdjust = () => {
    if (!quickEditImage) return;

    const adjustment = customPrompt.trim() || selectedPreset;
    if (adjustment) {
      Keyboard.dismiss();
      onImageEdit("adjust", quickEditImage.uri, adjustment, false);
    }
  };

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    setCustomPrompt("");
  };

  const handleCustomInput = (text: string) => {
    setCustomPrompt(text);
    setSelectedPreset("");
  };

  const canExecute =
    quickEditImage && !isLoading && (selectedPreset || customPrompt.trim());

  return (
    <View className="px-4 py-1">
      <View className="flex-row flex-wrap justify-center mb-4">
        {ADJUSTMENT_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset}
            onPress={() => handlePresetSelect(preset)}
            className={`px-3 py-2 rounded-full m-1 ${
              selectedPreset === preset ? "bg-blue-500" : "bg-gray-200"
            }`}
          >
            <Text
              className={
                selectedPreset === preset ? "text-white" : "text-gray-900"
              }
            >
              {preset}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-row gap-4 items-center">
        <TextInput
          placeholder="Or type a custom adjustment..."
          className="bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-3 text-base flex-1"
          value={customPrompt}
          onChangeText={handleCustomInput}
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleExecuteAdjust}
        />
        <TouchableOpacity
          onPress={handleExecuteAdjust}
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

export default AdjustTab;
