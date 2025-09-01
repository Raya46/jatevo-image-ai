import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RetouchTabProps } from "../../helper/QuickEdit/types";

const RetouchTab: React.FC<RetouchTabProps> = ({
  onImageEdit,
  quickEditImage,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState("");
  const [kbHeight, setKbHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      setKbHeight(h);
    });
    const subHide = Keyboard.addListener(hideEvt, () => setKbHeight(0));

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const canExecute = useMemo(
    () => !!quickEditImage && !!prompt.trim() && !isLoading,
    [quickEditImage, prompt, isLoading]
  );

  const handleExecuteEdit = useCallback(() => {
    if (!canExecute || !quickEditImage) return;

    // Cleanly close the keyboard first.
    inputRef.current?.blur();
    Keyboard.dismiss();

    onImageEdit("adjust", quickEditImage.uri, prompt.trim());
  }, [canExecute, quickEditImage, onImageEdit, prompt]);

  // Use bottom inset to avoid double-padding on devices with a home indicator
  const bottomSpacer = Math.max(0, kbHeight - insets.bottom);

  return (
    <View style={{ paddingBottom: insets.bottom, marginBottom: bottomSpacer }} className="p-4">
      <View className="flex-row gap-4 items-center">
        <TextInput
          ref={inputRef}
          placeholder="e.g., remove the person in the back"
          className="bg-zinc-800 text-white rounded-lg p-3 text-base flex-1"
          value={prompt}
          onChangeText={setPrompt}
          placeholderTextColor="#a1a1aa"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleExecuteEdit}
        />
        <TouchableOpacity
          onPress={handleExecuteEdit}
          disabled={!canExecute}
          className={`rounded-lg px-4 p-3.5 justify-center ${
            canExecute ? "bg-purple-600" : "bg-zinc-700"
          }`}
        >
          <Text className="text-white font-bold">
            {isLoading ? "..." : "Execute"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RetouchTab;
