import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
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
import CombineTab from "./QuickEditComponents/CombineTab";
import {
  BottomActionBar,
  Header,
  TabBar,
} from "./QuickEditComponents/components";
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
import { InteractiveCropView } from "./QuickEditComponents/InteractiveCropView";

const isSameImage = (a: ImageAsset | null, b: ImageAsset | null) =>
  a?.uri === b?.uri;

const QuickEditScreen: React.FC<QuickEditScreenProps> = ({
  quickEditImage,
  onBackToHome,
  onGenerate,
  onImageEdit,
  onRePickImage,
  isLoading,
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
    (action: string, imageUri: string, params?: any) => {
      const next: ImageAsset = {
        uri: imageUri,
        base64: present?.base64 ?? null,
        height: present?.height ?? 0,
        width: present?.width ?? 0,
      };
      push(next);
      onImageEdit?.(action, imageUri, params);
    },
    [onImageEdit, push, present?.base64]
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
      case "combine":
        return <CombineTab onGenerate={onGenerate} isLoading={isLoading} />;
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
    setInitial(quickEditImage ?? null);
  }, [quickEditImage, setInitial]);

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

      let localUri = uri;
      if (/^https?:\/\//i.test(uri)) {
        const filename = `quickedit-${Date.now()}.jpg`;
        const dest = FileSystem.cacheDirectory + filename;
        const dl = await FileSystem.downloadAsync(uri, dest);
        localUri = dl.uri;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Allow Photos permission to save images."
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert("Saved", "Image saved to your gallery.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }, [present?.uri]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "black" }}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar style="light" />

        <Header onBackToHome={onBackToHome} />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <View className="flex-1 items-center justify-center p-4">
          {present?.uri ? (
            <View className="w-full h-full">
              <Image
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
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default QuickEditScreen;
