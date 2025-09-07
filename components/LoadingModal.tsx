import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Text, View } from "react-native";

interface LoadingModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  animatedProgress?: Animated.Value;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  visible,
  title = "Creating Magic",
  message = "AI is processing your request...",
  animatedProgress,
}) => {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/80 flex justify-center items-center z-50">
      <View className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 mx-6 max-w-sm w-full">
        <View className="flex justify-center items-center mb-6">
          <View className="relative">
            <View className="w-20 h-20 bg-purple-600 rounded-full flex justify-center items-center">
              <Ionicons name="sparkles" size={32} color="white" />
            </View>
            <View className="absolute inset-0 w-20 h-20 bg-purple-400 rounded-full animate-pulse opacity-30" />
          </View>
        </View>
        <Text className="text-white text-2xl font-bold text-center mb-2">
          {title}
        </Text>
        <Text className="text-zinc-400 text-base text-center mb-6">
          {message}
        </Text>
        <View
          style={{
            width: "100%",
            height: 8,
            backgroundColor: "#3f3f46",
            borderRadius: 9999,
            marginBottom: 16,
          }}
        >
          <Animated.View
            style={[
              { height: 8, borderRadius: 9999, backgroundColor: "#a855f7" },
              animatedProgress
                ? {
                    width: animatedProgress.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  }
                : {
                    width: "50%", // Static progress for now
                  },
            ]}
          />
        </View>
        <Text className="text-zinc-500 text-sm text-center italic">
          &ldquo;Art takes time, but magic is worth waiting for ✨&rdquo;
        </Text>
      </View>
    </View>
  );
};

export default LoadingModal;
