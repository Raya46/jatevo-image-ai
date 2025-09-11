import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { FILTER_PRESETS } from "../../helper/QuickEdit/constants";
import { TabProps } from "../../helper/QuickEdit/types";

const FiltersTab: React.FC<TabProps> = ({
  onImageEdit,
  quickEditImage,
  isLoading,
}) => {
  const [selectedFilter, setSelectedFilter] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleExecuteFilter = () => {
    if (!quickEditImage) return;

    const filter = customPrompt.trim() || selectedFilter;
    if (filter) {
      onImageEdit("filter", quickEditImage.uri, filter, false);
    }
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    setCustomPrompt("");
  };

  const handleCustomInput = (text: string) => {
    setCustomPrompt(text);
    setSelectedFilter("");
  };

  const canExecute =
    quickEditImage && !isLoading && (selectedFilter || customPrompt.trim());

  return (
    <View className="p-4">
      <View className="flex-row justify-center gap-2 mb-2">
        {FILTER_PRESETS.map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => handleFilterSelect(filter)}
            className={`px-4 py-2 rounded-full ${
              selectedFilter === filter ? "bg-purple-600" : "bg-zinc-700"
            }`}
          >
            <Text className="text-white">{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        placeholder="Or create a custom filter..."
        className="bg-zinc-800 text-white rounded-lg p-3 w-full text-base mb-2"
        value={customPrompt}
        onChangeText={handleCustomInput}
        placeholderTextColor="#a1a1aa"
      />

      <TouchableOpacity
        onPress={handleExecuteFilter}
        disabled={!canExecute}
        className={`rounded-lg p-3 w-full items-center ${
          canExecute ? "bg-purple-600" : "bg-zinc-700"
        }`}
      >
        <Text className="text-white font-bold">
          {isLoading ? "Applying Filter..." : "Execute Filter"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default FiltersTab;
