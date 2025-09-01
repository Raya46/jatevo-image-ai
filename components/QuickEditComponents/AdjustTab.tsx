import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { ADJUSTMENT_PRESETS } from "../../helper/QuickEdit/constants";
import { TabProps } from "../../helper/QuickEdit/types";

const AdjustTab: React.FC<TabProps> = ({ 
  onImageEdit, 
  quickEditImage, 
  isLoading 
}) => {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleExecuteAdjust = () => {
    if (!quickEditImage) return;
    
    const adjustment = customPrompt.trim() || selectedPreset;
    if (adjustment) {
      onImageEdit("adjust", quickEditImage.uri, adjustment);
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

  const canExecute = quickEditImage && !isLoading && 
    (selectedPreset || customPrompt.trim());

  return (
    <View className="p-4">
      <View className="flex-row flex-wrap justify-center mb-2">
        {ADJUSTMENT_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset}
            onPress={() => handlePresetSelect(preset)}
            className={`px-3 py-2 rounded-full m-1 ${
              selectedPreset === preset ? "bg-purple-600" : "bg-zinc-700"
            }`}
          >
            <Text className="text-white">{preset}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TextInput
        placeholder="Or type a custom adjustment..."
        className="bg-zinc-800 text-white rounded-lg p-3 w-full text-base mb-2"
        value={customPrompt}
        onChangeText={handleCustomInput}
        placeholderTextColor="#a1a1aa"
      />
      
      <TouchableOpacity
        onPress={handleExecuteAdjust}
        disabled={!canExecute}
        className={`rounded-lg p-3 w-full items-center ${
          canExecute ? "bg-purple-600" : "bg-zinc-700"
        }`}
      >
        <Text className="text-white font-bold">
          {isLoading ? "Adjusting..." : "Execute Adjust"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AdjustTab;