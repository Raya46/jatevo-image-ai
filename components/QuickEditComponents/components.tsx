import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { TABS } from "../../helper/QuickEdit/constants";
import { ImageAsset, TabType } from "../../helper/QuickEdit/types";

export const Header: React.FC<{ onBackToHome: () => void }> = ({ 
  onBackToHome 
}) => (
  <View className="bg-zinc-900 border-b border-zinc-700 px-4 py-3">
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={onBackToHome}
        className="flex-row items-center mr-4"
      >
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text className="text-white ml-2 font-semibold">Back</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const TabBar: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ activeTab, onTabChange }) => (
  <View className="bg-zinc-900 border-b border-zinc-700">
    <View className="flex-row justify-around pt-3 pb-3">
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          className="flex-col items-center gap-1 px-3"
        >
          <Ionicons
            name={tab.icon as any}
            size={28}
            color={activeTab === tab.id ? "#c084fc" : "white"}
          />
          <Text
            className={`${
              activeTab === tab.id ? "text-purple-400" : "text-white"
            } text-xs text-center`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export const ImagePreview: React.FC<{
  quickEditImage: ImageAsset | null;
  onRePickImage: () => void;
  insets: any;
}> = ({ quickEditImage, onRePickImage, insets }) => (
  <View className="flex-1 flex justify-center items-center bg-zinc-900 relative">
    {quickEditImage ? (
      <>
        <Image
          source={{ uri: quickEditImage.uri }}
          className="w-full h-full"
          resizeMode="contain"
          style={{ flex: 1, width: "100%", height: "100%" }}
          onLoad={() => console.log("Image loaded successfully")}
          onError={(error) => {
            console.error("Image load error:", error);
            console.error("Failed URI:", quickEditImage.uri);
          }}
        />
        <TouchableOpacity
          onPress={onRePickImage}
          className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
          style={{ paddingTop: Math.max(insets.top * 0.25, 0) }}
        >
          <Ionicons name="camera" size={20} color="white" />
        </TouchableOpacity>
      </>
    ) : (
      <View className="flex justify-center items-center">
        <Ionicons name="image" size={48} color="#a1a1aa" />
        <Text className="text-zinc-400 text-base mt-4 text-center">
          No image selected
        </Text>
        <Text className="text-zinc-500 text-sm mt-2 text-center">
          Upload an image to start editing
        </Text>
      </View>
    )}
  </View>
);

export const BottomActionBar: React.FC<{
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onNew: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
}> = ({ onUndo, onRedo, onReset, onNew, onSave, canUndo, canRedo }) => {
  const disabledColor = "#3f3f46";
  const enabledColor = "#a1a1aa";

  return (
    <View className="flex-row justify-around items-center p-3 bg-zinc-900  border-zinc-700">
      <TouchableOpacity
        className="flex-col items-center"
        onPress={canUndo ? onUndo : undefined}
        disabled={!canUndo}
      >
        <Ionicons name="arrow-undo" size={24} color={canUndo ? enabledColor : disabledColor} />
        <Text className={`text-xs mt-1 ${canUndo ? "text-zinc-400" : "text-zinc-600"}`}>
          Undo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-col items-center"
        onPress={canRedo ? onRedo : undefined}
        disabled={!canRedo}
      >
        <Ionicons name="arrow-redo" size={24} color={canRedo ? enabledColor : disabledColor} />
        <Text className={`text-xs mt-1 ${canRedo ? "text-zinc-400" : "text-zinc-600"}`}>
          Redo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onReset}>
        <Ionicons name="refresh" size={24} color={enabledColor} />
        <Text className="text-zinc-400 text-xs mt-1">Reset</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onNew}>
        <Ionicons name="cloud-upload" size={24} color={enabledColor} />
        <Text className="text-zinc-400 text-xs mt-1">New</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onSave}>
        <Ionicons name="download" size={24} color="white" />
        <Text className="text-white text-xs mt-1">Save</Text>
      </TouchableOpacity>
    </View>
  );
};