import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { TABS } from "../../helper/QuickEdit/constants";
import { TabType } from "../../helper/QuickEdit/types";

export const Header: React.FC<{ onBackToHome: () => void }> = ({
  onBackToHome,
}) => (
  <View className="bg-white border-b border-gray-300 px-4 py-3">
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={onBackToHome}
        className="flex-row items-center mr-4"
      >
        <Ionicons name="arrow-back" size={24} color="#374151" />
        <Text className="text-gray-900 ml-2 font-semibold">Back</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const TabBar: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ activeTab, onTabChange }) => (
  <View className="bg-white border-b border-gray-300">
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
            color={activeTab === tab.id ? "#3b82f6" : "#6b7280"}
          />
          <Text
            className={`${
              activeTab === tab.id ? "text-blue-600" : "text-gray-600"
            } text-xs text-center`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export const BottomActionBar: React.FC<{
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onNew: () => void;
  onSave: () => void;
  onCancel: () => void;
  canUndo: boolean;
  canRedo: boolean;
}> = ({
  onUndo,
  onRedo,
  onReset,
  onNew,
  onSave,
  onCancel,
  canUndo,
  canRedo,
}) => {
  const disabledColor = "#d1d5db";
  const enabledColor = "#6b7280";

  return (
    <View className="flex-row justify-around items-center p-3 bg-white border-gray-300">
      <TouchableOpacity
        className="flex-col items-center"
        onPress={canUndo ? onUndo : undefined}
        disabled={!canUndo}
      >
        <Ionicons
          name="arrow-undo"
          size={24}
          color={canUndo ? enabledColor : disabledColor}
        />
        <Text
          className={`text-xs mt-1 ${canUndo ? "text-gray-600" : "text-gray-400"}`}
        >
          Undo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-col items-center"
        onPress={canRedo ? onRedo : undefined}
        disabled={!canRedo}
      >
        <Ionicons
          name="arrow-redo"
          size={24}
          color={canRedo ? enabledColor : disabledColor}
        />
        <Text
          className={`text-xs mt-1 ${canRedo ? "text-gray-600" : "text-gray-400"}`}
        >
          Redo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onReset}>
        <Ionicons name="refresh" size={24} color={enabledColor} />
        <Text className="text-gray-600 text-xs mt-1">Reset</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onNew}>
        <Ionicons name="cloud-upload" size={24} color={enabledColor} />
        <Text className="text-gray-600 text-xs mt-1">New</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onSave}>
        <Ionicons name="download" size={24} color="#374151" />
        <Text className="text-gray-900 text-xs mt-1">Save</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-col items-center" onPress={onCancel}>
        <Ionicons name="close" size={24} color={enabledColor} />
        <Text className="text-gray-600 text-xs mt-1">Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};
