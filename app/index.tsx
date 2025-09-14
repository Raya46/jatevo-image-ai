import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HomeCanvas from "../components/HomeCanvas";
import LoadingModal from "../components/LoadingModal";
import Onboarding from "../components/Onboarding";
import OutputGalleryWithDownload from "../components/OutputGalleryWithDownload";
import ProfessionalHeadshot from "../components/ProfessionalHeadshot";
import PromptEngine from "../components/PromptEngine";
import QuickEditScreen from "../components/QuickEditScreen";
import { useAppContext } from "../contexts/AppContext";
import { ImageAsset } from "../helper/QuickEdit/types";

type TabType = "gallery" | "edit" | "prompt" | "headshot" | "canvas";

const MainScreen = () => {
  const {
    galleryImages,
    isLoadingImages,
    loadGalleryImages,
    generateWithPrompt,
    handleImageEdit,
    userId,
    isGenerating,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<TabType>("gallery");
  const [refreshing, setRefreshing] = useState(false);
  const [quickEditImage, setQuickEditImage] = useState<ImageAsset | null>(null);
  const [latestGeneratedImage, setLatestGeneratedImage] =
    useState<ImageAsset | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    checkOnboardingStatus();
    Animated.timing(animatedProgress, {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(
        "onboarding_completed"
      );
      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGalleryImages();
    setRefreshing(false);
  };

  const handleEditImage = (image: any) => {
    setQuickEditImage({
      uri: image.uri,
      width: image.width || 1024,
      height: image.height || 1024,
      base64: null,
    });
    setActiveTab("edit");
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = {
          uri: result.assets[0].uri,
          base64: null,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
        return asset;
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
    return null;
  };

  const handleQuickEditPick = async () => {
    const image = await pickImage();
    if (image) {
      setQuickEditImage(image);
      setActiveTab("edit");
    }
  };

  const handleGenerateFromPrompt = async (
    prompt: string,
    images: ImageAsset[]
  ) => {
    try {
      const generatedImage = await generateWithPrompt(prompt, images);
      if (generatedImage) {
        setLatestGeneratedImage(generatedImage);
      }
      return generatedImage;
    } catch (error) {
      console.error("Generation error:", error);
      throw error;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "gallery":
        return (
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View className="p-4">
              <OutputGalleryWithDownload
                galleryImages={galleryImages}
                onEditImage={handleEditImage}
                isInitialLoading={isLoadingImages}
              />
            </View>
          </ScrollView>
        );

      case "edit":
        if (!quickEditImage) {
          return (
            <View className="flex-1 items-center p-4">
              <TouchableOpacity
                onPress={handleQuickEditPick}
                className="bg-gray-100 mt-5 border-2 border-dashed border-gray-300 rounded-xl p-8 w-full max-w-sm flex justify-center items-center"
              >
                <Text className="text-gray-600 text-lg text-center mb-2">
                  Select Image from Gallery
                </Text>
                <Text className="text-gray-500 text-sm text-center">
                  Choose an image to start editing
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <QuickEditScreen
            quickEditImage={quickEditImage}
            onBackToHome={() => setQuickEditImage(null)}
            onGenerate={generateWithPrompt}
            onImageEdit={handleImageEdit}
            onRePickImage={handleQuickEditPick}
            isLoading={false}
            userId={userId}
          />
        );

      case "prompt":
        return (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="p-4">
              <PromptEngine
                onGenerate={handleGenerateFromPrompt}
                onReset={() => setLatestGeneratedImage(null)}
              />
            </View>
          </ScrollView>
        );

      case "headshot":
        return (
          <ProfessionalHeadshot
            onGenerate={handleGenerateFromPrompt}
            userId={userId}
          />
        );

      case "canvas":
        return <HomeCanvas />;

      default:
        return null;
    }
  };

  // Show onboarding if it's the first time
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="p-4 border-b border-gray-300">
        <Text className="text-gray-900 text-3xl font-bold text-center mb-2">
          JATEVO IMAGE GEN
        </Text>

        {/* Horizontal Tabs */}
        <View className="flex-row bg-white border border-gray-200 rounded-full p-1 mt-4">
          {[
            { id: "gallery" as TabType, label: "Gallery", icon: "images" },
            { id: "headshot" as TabType, label: "Shot", icon: "person" },
            { id: "edit" as TabType, label: "Edit", icon: "create" },
            { id: "prompt" as TabType, label: "Prompt", icon: "sparkles" },
            { id: "canvas" as TabType, label: "Canvas", icon: "color-palette" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 flex-row items-center justify-center p-3 rounded-full ${
                activeTab === tab.id ? "bg-blue-500" : ""
              }`}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.id ? "white" : "#6b7280"}
              />
              <Text
                className={`ml-2 font-semibold text-sm ${
                  activeTab === tab.id ? "text-white" : "text-gray-600"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <View className="flex-1">{renderTabContent()}</View>

      {/* Loading Modal */}
      <LoadingModal
        visible={isGenerating}
        animatedProgress={animatedProgress}
      />
    </SafeAreaView>
  );
};

export default MainScreen;
