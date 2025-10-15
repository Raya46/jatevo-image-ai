import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RetouchTabProps } from "../../helper/QuickEdit/types";

const RetouchTab: React.FC<RetouchTabProps> = ({
  onImageEdit,
  quickEditImage,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<TextInput>(null);

  const canExecute = useMemo(
    () => !!quickEditImage && !!prompt.trim() && !isLoading,
    [quickEditImage, prompt, isLoading]
  );

  const handleExecuteEdit = useCallback(() => {
    if (!canExecute || !quickEditImage) return;

    // Cleanly close the keyboard first.
    inputRef.current?.blur();
    Keyboard.dismiss();

    onImageEdit("adjust", quickEditImage.uri, prompt.trim(), false);
  }, [canExecute, quickEditImage, onImageEdit, prompt]);

  return (
    <View className="px-4 py-1">
      <View className="flex-row gap-4 items-center">
        <TextInput
          ref={inputRef}
          placeholder="e.g., remove the person in the back"
          className="bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-3 text-base flex-1 max-h-20"
          value={prompt}
          onChangeText={setPrompt}
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleExecuteEdit}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity
          onPress={handleExecuteEdit}
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

export default RetouchTab;
