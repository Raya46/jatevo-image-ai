import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Animated as RNAnimated,
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
    shouldSaveToGallery?: boolean,
    onProgress?: (progress: number) => void
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
  const [isEditing, setIsEditing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const animatedProgress = useRef(new RNAnimated.Value(0)).current;

  const startProgressAnimation = () => {
    animatedProgress.setValue(0);
    RNAnimated.timing(animatedProgress, {
      toValue: 90,
      duration: 2500,
      useNativeDriver: false,
    }).start();
  };

  const completeProgressAnimation = () => {
    RNAnimated.timing(animatedProgress, {
      toValue: 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const resetProgressAnimation = () => {
    setCurrentProgress(0);
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
    (
      action: string,
      imageUri: string,
      params?: any,
      shouldSaveToGallery?: boolean,
      onProgress?: (progress: number) => void
    ) => {
      if (!onImageEdit) return;

      setIsEditing(true);
      resetProgressAnimation();

      // Start the progress animation
      startProgressAnimation();
      onImageEdit(
        action,
        imageUri,
        params,
        shouldSaveToGallery || false,
        (progress: number) => {
          // Update progress bar with real progress
          setCurrentProgress(progress);
          animatedProgress.setValue(progress);
          if (onProgress) onProgress(progress);
        }
      )
        .then((editedImageResult) => {
          if (editedImageResult && editedImageResult.uri) {
            push(editedImageResult);
          }
          // Complete the progress bar animation
          completeProgressAnimation();
          setCurrentProgress(100);
        })
        .catch((error) => {
          console.error("Edit operation failed:", error);
          resetProgressAnimation();
        })
        .finally(() => {
          setIsEditing(false);
          setTimeout(() => {
            resetProgressAnimation();
          }, 600);
        });
    },
    [onImageEdit, push, animatedProgress]
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
      resetProgressAnimation();

      // Start the progress animation
      startProgressAnimation();

      let localUri = uri;
      if (/^https?:\/\//i.test(uri)) {
        // Step 1: Download remote image (20%)
        animatedProgress.setValue(20);
        setCurrentProgress(20);
        const filename = `quickedit-${Date.now()}.jpg`;
        const dest = FileSystem.cacheDirectory + filename;
        const dl = await FileSystem.downloadAsync(uri, dest);
        localUri = dl.uri;
      }

      // Step 2: Request permissions (30%)
      animatedProgress.setValue(30);
      setCurrentProgress(30);
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

      // Step 3: Save to gallery (60%)
      animatedProgress.setValue(60);
      setCurrentProgress(60);
      await MediaLibrary.saveToLibraryAsync(localUri);

      // Step 4: Save to gallery and Supabase through the main app's handleImageEdit
      if (onImageEdit && userId) {
        try {
          // Step 5: Upload to cloud (80% - 100%)
          animatedProgress.setValue(80);
          setCurrentProgress(80);
          await onImageEdit(
            "save",
            localUri,
            null,
            true,
            (progress: number) => {
              // Map progress to remaining range (80%-100%)
              const mappedProgress = 80 + progress * 0.2;
              setCurrentProgress(mappedProgress);
              animatedProgress.setValue(mappedProgress);
            }
          );
          completeProgressAnimation();
          setCurrentProgress(100);
          setTimeout(() => {
            Alert.alert("Saved", "Image saved to your gallery and cloud.");
          }, 300);
        } catch (error) {
          console.error("Failed to save through handleImageEdit:", error);
          // Fallback: save directly to Supabase
          animatedProgress.setValue(80);
          setCurrentProgress(80);
          const dataUrl = await convertFileUriToDataUrl(localUri);
          if (dataUrl) {
            animatedProgress.setValue(90);
            setCurrentProgress(90);
            const saveResult = await SupabaseImageServiceRN.uploadAndSaveImage(
              dataUrl,
              userId,
              (progress: number) => {
                // Map Supabase progress (5%-100%) to remaining progress (90%-100%)
                const mappedProgress = 90 + progress * 0.1;
                setCurrentProgress(mappedProgress);
                animatedProgress.setValue(mappedProgress);
              }
            );
            if (saveResult.success) {
              completeProgressAnimation();
              setCurrentProgress(100);
              setTimeout(() => {
                Alert.alert("Saved", "Image saved to your gallery and cloud.");
              }, 300);
            } else {
              completeProgressAnimation();
              setCurrentProgress(100);
              setTimeout(() => {
                Alert.alert(
                  "Saved",
                  "Image saved to gallery, but failed to save to cloud."
                );
              }, 300);
            }
          } else {
            completeProgressAnimation();
            setCurrentProgress(100);
            setTimeout(() => {
              Alert.alert(
                "Saved",
                "Image saved to gallery, but failed to prepare for cloud."
              );
            }, 300);
          }
        }
      } else {
        completeProgressAnimation();
        setCurrentProgress(100);
        setTimeout(() => {
          Alert.alert("Saved", "Image saved to your gallery.");
        }, 300);
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
          visible={isSaving || isEditing}
          title={isSaving ? "Saving to Gallery" : "Processing Image"}
          message={
            isSaving
              ? "Storing your edited image..."
              : "AI is processing your request..."
          }
          animatedProgress={animatedProgress}
          progress={currentProgress}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default QuickEditScreen;
