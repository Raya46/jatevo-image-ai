// screens/QuickEditScreen.tsx
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Alert,
  Platform,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import AdjustTab from "./QuickEditComponents/AdjustTab";
import CombineTab from "./QuickEditComponents/CombineTab";
import {
  BottomActionBar,
  Header,
  ImagePreview,
  TabBar,
} from "./QuickEditComponents/components";
import CropTab from "./QuickEditComponents/CropTab";
import FiltersTab from "./QuickEditComponents/FiltersTab";
import RetouchTab from "./QuickEditComponents/RetouchTab";

import { ImageAsset, QuickEditScreenProps, TabType } from "../helper/QuickEdit/types";
import { useHistory } from "../hooks/useHistory";

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
  const [activeTab, setActiveTab] = React.useState<TabType>("retouch");
  const insets = useSafeAreaInsets();

  const { present, canUndo, canRedo, push, undo, redo, setInitial } =
    useHistory<ImageAsset | null>(quickEditImage);

  const prevPropImage = React.useRef<ImageAsset | null>(quickEditImage);
  React.useEffect(() => {
    if (!isSameImage(prevPropImage.current, quickEditImage)) {
      setInitial(quickEditImage ?? null);
      prevPropImage.current = quickEditImage ?? null;
    }
  }, [quickEditImage, setInitial]);

  const wrappedOnImageEdit = React.useCallback(
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
        return <CropTab {...commonProps} />;
      case "adjust":
        return <AdjustTab {...commonProps} />;
      case "filters":
        return <FiltersTab {...commonProps} />;
      default:
        return null;
    }
  };

  const handleReset = React.useCallback(() => {
    setInitial(quickEditImage ?? null);
  }, [quickEditImage, setInitial]);

  const handleNew = React.useCallback(() => {
    setInitial(null);
    onBackToHome();
  }, [onBackToHome, setInitial]);

  const handleSave = React.useCallback(async () => {
    try {
      const uri = present?.uri;
      if (!uri) {
        Alert.alert("Nothing to save", "No image in the editor.");
        return;
      }

      if (Platform.OS === "web") {
        Alert.alert("Not supported on Web", "Saving to gallery is mobile-only here.");
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
        Alert.alert("Permission required", "Allow Photos permission to save images.");
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "black" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar style="light" />

      <Header onBackToHome={onBackToHome} />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <ImagePreview
        quickEditImage={present}
        onRePickImage={onRePickImage}
        insets={insets}
      />

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
  );
};

export default QuickEditScreen;
