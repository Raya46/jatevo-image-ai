import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import AdjustTab from "./QuickEditComponents/AdjustTab";
import { BottomActionBar, TabBar } from "./QuickEditComponents/components";
import CropTab from "./QuickEditComponents/CropTab";
import FiltersTab from "./QuickEditComponents/FiltersTab";
import RetouchTab from "./QuickEditComponents/RetouchTab";

import {
  CropRegion,
  ImageAsset,
  QuickEditScreenProps,
  TabType,
} from "../helper/QuickEdit/types";
import { useHistory } from "../hooks/useHistory";
import { SupabaseImageServiceRN } from "../services/supabaseService";
import LoadingModal from "./LoadingModal";
import { InteractiveCropView } from "./QuickEditComponents/InteractiveCropView";

const isSameImage = (a: ImageAsset | null, b: ImageAsset | null) =>
  a?.uri === b?.uri;

const convertFileUriToDataUrl = async (uri: string) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Asumsi format adalah jpeg karena hook AI kita menyimpannya sebagai jpeg
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert file URI to data URL", e);
    return null;
  }
};

interface ModifiedQuickEditScreenProps extends QuickEditScreenProps {
  onImageEdit: (
    action: string,
    imageUri: string,
    params?: any,
    shouldSaveToGallery?: boolean
  ) => Promise<ImageAsset | null>;
  userId?: string | null;
}

const QuickEditScreen: React.FC<ModifiedQuickEditScreenProps> = ({
  quickEditImage,
  onBackToHome,
  onGenerate,
  onImageEdit,
  onRePickImage,
  isLoading,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("retouch");
  const insets = useSafeAreaInsets();

  const { present, canUndo, canRedo, push, undo, redo, setInitial } =
    useHistory<ImageAsset | null>(quickEditImage);
  const [imageLayout, setImageLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [cropMode, setCropMode] = useState<"free" | "1:1" | "16:9">("free");
  const [isSaving, setIsSaving] = useState(false);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  // Progress animation logic
  const startProgressAnimation = () => {
    animatedProgress.setValue(0);
    Animated.timing(animatedProgress, {
      toValue: 90,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  };

  const completeProgressAnimation = () => {
    Animated.timing(animatedProgress, {
      toValue: 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const resetProgressAnimation = () => {
    animatedProgress.setValue(0);
  };

  const prevPropImage = useRef<ImageAsset | null>(quickEditImage);
  useEffect(() => {
    if (!isSameImage(prevPropImage.current, quickEditImage)) {
      setInitial(quickEditImage ?? null);
      prevPropImage.current = quickEditImage ?? null;
      setCropRegion(null);
      setImageLayout(null);
    }
  }, [quickEditImage, setInitial]);

  const wrappedOnImageEdit = useCallback(
    async (action: string, imageUri: string, params?: any) => {
      if (!onImageEdit) return;

      // For intermediate edits in QuickEdit, don't save to gallery
      const editedImageResult = await onImageEdit(
        action,
        imageUri,
        params,
        false
      );

      if (editedImageResult && editedImageResult.uri) {
        push(editedImageResult);
      }
    },
    [onImageEdit, push]
  );

  const onImageLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setImageLayout({ width, height });
  };

  const renderTabContent = () => {
    const commonProps = {
      onImageEdit: wrappedOnImageEdit,
      quickEditImage: present,
      isLoading,
    };

    switch (activeTab) {
      case "retouch":
        return <RetouchTab onGenerate={onGenerate} {...commonProps} />;
      case "crop":
        return (
          <CropTab
            {...commonProps}
            cropRegion={cropRegion}
            cropMode={cropMode}
            setCropMode={setCropMode}
            imageLayout={imageLayout}
            originalImage={present}
          />
        );
      case "adjust":
        return <AdjustTab {...commonProps} />;
      case "filters":
        return <FiltersTab {...commonProps} />;
      default:
        return null;
    }
  };

  const handleReset = useCallback(() => {
    redo();
    undo();
  }, [redo, undo]);

  const handleNew = useCallback(() => {
    setInitial(null);
    onBackToHome();
  }, [onBackToHome, setInitial]);

  const handleSave = useCallback(async () => {
    try {
      const uri = present?.uri;
      if (!uri) {
        Alert.alert("Nothing to save", "No image in the editor.");
        return;
      }

      if (Platform.OS === "web") {
        Alert.alert(
          "Not supported on Web",
          "Saving to gallery is mobile-only here."
        );
        return;
      }

      setIsSaving(true);
      startProgressAnimation();

      let localUri = uri;
      if (/^https?:\/\//i.test(uri)) {
        const filename = `quickedit-${Date.now()}.jpg`;
        const dest = FileSystem.cacheDirectory + filename;
        const dl = await FileSystem.downloadAsync(uri, dest);
        localUri = dl.uri;
      }

      // Save to gallery
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        resetProgressAnimation();
        Alert.alert(
          "Permission required",
          "Allow Photos permission to save images."
        );
        setIsSaving(false);
        return;
      }

      // Progress: 30% - Gallery save
      Animated.timing(animatedProgress, {
        toValue: 40,
        duration: 500,
        useNativeDriver: false,
      }).start();

      await MediaLibrary.saveToLibraryAsync(localUri);

      // Progress: 50% - Prepare for cloud upload
      Animated.timing(animatedProgress, {
        toValue: 60,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Save to gallery and Supabase through the main app's handleImageEdit
      if (onImageEdit && userId) {
        try {
          // Call onImageEdit with shouldSaveToGallery: true to add to gallery
          await onImageEdit("save", localUri, null, true);
          Alert.alert("Saved", "Image saved to your gallery and cloud.");
        } catch (error) {
          console.error("Failed to save through handleImageEdit:", error);
          // Fallback: save directly to Supabase
          const dataUrl = await convertFileUriToDataUrl(localUri);
          if (dataUrl) {
            const saveResult = await SupabaseImageServiceRN.uploadAndSaveImage(
              dataUrl,
              userId
            );
            if (saveResult.success) {
              completeProgressAnimation();
              setTimeout(() => {
                Alert.alert("Saved", "Image saved to your gallery and cloud.");
              }, 300);
            } else {
              completeProgressAnimation();
              setTimeout(() => {
                Alert.alert(
                  "Saved",
                  "Image saved to gallery, but failed to save to cloud."
                );
              }, 300);
            }
          } else {
            Alert.alert(
              "Saved",
              "Image saved to gallery, but failed to prepare for cloud."
            );
          }
        }
      } else {
        Alert.alert("Saved", "Image saved to your gallery.");
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        resetProgressAnimation();
      }, 600);
    }
  }, [present?.uri, userId]);

  const handleCancel = useCallback(() => {
    onBackToHome();
  }, [onBackToHome]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "black" }}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar style="light" />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <View className="flex-1 items-center justify-center p-4">
          {present?.uri ? (
            <View className="w-full h-full">
              <Image
                key={present.uri}
                source={{ uri: present.uri }}
                className="w-full h-full"
                resizeMode="contain"
                onLayout={onImageLayout}
              />
              {activeTab === "crop" && imageLayout && (
                <InteractiveCropView
                  imageLayout={imageLayout}
                  cropMode={cropMode}
                  onCropRegionChange={setCropRegion}
                />
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={onRePickImage} className="items-center">
              <Text className="text-white text-lg">Tap to select an image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          className="bg-zinc-900/80 border-t border-zinc-700"
          style={{ paddingBottom: Math.max(insets.bottom) }}
        >
          {renderTabContent()}
        </View>

        <BottomActionBar
          onUndo={undo}
          onRedo={redo}
          onReset={handleReset}
          onNew={handleNew}
          onSave={handleSave}
          onCancel={handleCancel}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <LoadingModal
          visible={isSaving}
          title="Saving to Gallery"
          message="Storing your edited image..."
          animatedProgress={animatedProgress}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default QuickEditScreen;
