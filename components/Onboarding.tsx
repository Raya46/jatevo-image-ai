import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentScene, setCurrentScene] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const scenes = [
    {
      id: 1,
      title: "JATEVO Image Gen",
      subtitle: "Your AI-Powered Image Generation Studio",
      description:
        "Transform your photos into professional masterpieces with cutting-edge AI technology.",
      image: require("../assets/images/jatevo.png"), // Use actual JATEVO logo
      color: "#6366f1",
    },
    {
      id: 2,
      title: "Professional Headshots",
      subtitle: "Your Main Feature",
      description:
        "Create stunning professional headshots with custom prompts. Choose your attire, background, and style - all powered by advanced AI.",
      image: "👤",
      color: "#8b5cf6",
    },
    {
      id: 3,
      title: "Additional Features",
      subtitle: "Explore More Possibilities",
      description:
        "Browse your Gallery, Quick Edit images, use AI Prompts, or create with Canvas. Everything you need for perfect images.",
      image: "🎨",
      color: "#06b6d4",
    },
  ];

  const nextScene = () => {
    if (currentScene < scenes.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentScene(currentScene + 1);
        slideAnim.setValue(width);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      completeOnboarding();
    }
  };

  const previousScene = () => {
    if (currentScene > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentScene(currentScene - 1);
        slideAnim.setValue(-width);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("onboarding_completed", "true");
      onComplete();
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      onComplete();
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const currentSceneData = scenes[currentScene];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Skip Button */}
      <View className="flex-row justify-end p-4">
        <TouchableOpacity onPress={skipOnboarding}>
          <Text className="text-gray-500 font-medium">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6">
        <Animated.View
          className="flex-1 items-center justify-center"
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {/* Scene Content */}
          <View className="items-center mb-8">
            {currentScene === 0 ? (
              <View className="items-center mb-8">
                <Image
                  source={currentSceneData.image}
                  className="w-32 h-32 mb-6"
                  resizeMode="contain"
                />
              </View>
            ) : (
              // Scene 2 & 3: Feature Icons
              <View
                className="w-32 h-32 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: currentSceneData.color }}
              >
                <Text className="text-6xl">{currentSceneData.image}</Text>
              </View>
            )}

            <Text className="text-3xl font-bold text-center mb-2 text-gray-900">
              {currentSceneData.title}
            </Text>
            <Text
              className="text-xl font-semibold text-center mb-4"
              style={{ color: currentSceneData.color }}
            >
              {currentSceneData.subtitle}
            </Text>
            <Text className="text-base text-center text-gray-600 leading-6 px-4">
              {currentSceneData.description}
            </Text>
          </View>

          {/* Progress Indicators */}
          <View className="flex-row mb-8">
            {scenes.map((_, index) => (
              <View
                key={index}
                className={`w-3 h-3 rounded-full mx-1 ${
                  index === currentScene ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View className="w-full">
            <TouchableOpacity
              onPress={nextScene}
              className="w-full py-4 rounded-lg items-center mb-4"
              style={{ backgroundColor: currentSceneData.color }}
            >
              <Text className="text-white font-bold text-lg">
                {currentScene === scenes.length - 1 ? "Get Started" : "Next"}
              </Text>
            </TouchableOpacity>

            {currentScene > 0 && (
              <TouchableOpacity
                onPress={previousScene}
                className="w-full py-3 rounded-lg items-center border-2 border-gray-300"
              >
                <Text className="text-gray-700 font-medium text-base">
                  Previous
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default Onboarding;
