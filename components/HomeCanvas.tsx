import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Animated as RNAnimated,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useAppContext } from "../contexts/AppContext";
import { ImageAsset } from "../helper/QuickEdit/types";
import { generateCompositeImage } from "../hooks/useCanvas";
import { SupabaseImageServiceRN } from "../services/supabaseService";
import LoadingModal from "./LoadingModal";

const GHOST_IMAGE_SIZE = 70;

// Komponen ImageCard yang direstrukturisasi dengan logika gestur terpusat
const ImageCard = React.forwardRef<
  View,
  {
    title: string;
    image: ImageAsset | null;
    onSelect: () => void;
    onLayout?: () => void;
    panGesture?: ReturnType<typeof Gesture.Pan>;
  }
>(({ title, image, onSelect, onLayout, panGesture }, ref) => {
  // Gestur untuk menangani ketukan (tap)
  const tapGesture = Gesture.Tap().onEnd(() => {
    // Jalankan onSelect hanya jika tidak ada gambar (mode upload)
    if (!image) {
      runOnJS(onSelect)();
    }
  });

  // Tentukan gestur mana yang aktif: pan jika ada gambar dan diberikan, jika tidak, tap.
  const activeGesture = image && panGesture ? panGesture : tapGesture;

  const cardContent = (
    <View className="w-full aspect-[3/4] bg-white rounded-xl overflow-hidden border border-gray-300">
      {image ? (
        <Image
          source={{ uri: image.uri }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        // TouchableOpacity tidak lagi diperlukan di sini
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Tap to Upload</Text>
        </View>
      )}
    </View>
  );

  return (
    <View ref={ref} className="w-[45%] items-center" onLayout={onLayout}>
      <Text className="text-lg text-gray-800 mb-2.5">{title}</Text>
      <GestureDetector gesture={activeGesture}>{cardContent}</GestureDetector>
    </View>
  );
});

ImageCard.displayName = "ImageCard";

const HomeCanvas: React.FC = () => {
  const { userId, loadGalleryImages } = useAppContext();
  const [objectImage, setObjectImage] = useState<ImageAsset | null>(null);
  const [sceneImage, setSceneImage] = useState<ImageAsset | null>(null);
  const [originalObjectImage, setOriginalObjectImage] =
    useState<ImageAsset | null>(null);
  const [originalSceneImage, setOriginalSceneImage] =
    useState<ImageAsset | null>(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  const animatedProgress = new RNAnimated.Value(0);

  const isDragging = useSharedValue(false);
  const positionX = useSharedValue(-GHOST_IMAGE_SIZE);
  const positionY = useSharedValue(-GHOST_IMAGE_SIZE);

  const sceneLayout = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const sceneRef = useRef<View>(null);

  const resetProgressAnimation = () => {
    setCurrentProgress(0);
    animatedProgress.setValue(0);
  };

  const pickImage = async (
    setImage: React.Dispatch<React.SetStateAction<ImageAsset | null>>,
    setOriginal?: React.Dispatch<React.SetStateAction<ImageAsset | null>>
  ) => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You must grant permission to access the photo gallery."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const image = {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      };
      setImage(image);
      if (setOriginal) setOriginal(image);
    }
  };

  const handleDrop = async (x: number, y: number) => {
    if (!objectImage || !sceneImage || !sceneLayout.current) return;

    const layout = sceneLayout.current;
    if (
      x < layout.x ||
      x > layout.x + layout.width ||
      y < layout.y ||
      y > layout.y + layout.height
    ) {
      return;
    }

    const relativeX = x - layout.x;
    const relativeY = y - layout.y;
    const xPercent = (relativeX / layout.width) * 100;
    const yPercent = (relativeY / layout.height) * 100;

    setIsLoading(true);
    resetProgressAnimation();

    try {
      const { finalImageUrl } = await generateCompositeImage(
        objectImage,
        sceneImage,
        { xPercent, yPercent },
        (progress: number) => {
          // Update progress bar with real progress
          setCurrentProgress(progress);
          animatedProgress.setValue(progress);
        }
      );

      // Complete the progress bar
      animatedProgress.setValue(100);
      setTimeout(() => {
        setSceneImage((prev) =>
          prev ? { ...prev, uri: finalImageUrl } : null
        );
        setObjectImage(null);
        setHasEdited(true);
      }, 300);
    } catch (error) {
      resetProgressAnimation();
      Alert.alert(
        "Failed to Generate Image",
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        resetProgressAnimation();
      }, 600);
    }
  };

  const handleReset = () => {
    setObjectImage(originalObjectImage);
    setSceneImage(originalSceneImage);
    setHasEdited(false);
  };

  const handleSave = async () => {
    if (!sceneImage || !userId) {
      Alert.alert("Error", "No image to save or invalid user session.");
      return;
    }

    setIsSaving(true);
    resetProgressAnimation();

    try {
      // Step 1: Request permissions (10%)
      animatedProgress.setValue(10);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        resetProgressAnimation();
        Alert.alert(
          "Permission Required",
          "Allow access to gallery to save images."
        );
        return;
      }

      // Step 2: Save to gallery (30%)
      animatedProgress.setValue(30);
      await MediaLibrary.saveToLibraryAsync(sceneImage.uri);

      // Step 3: Convert to base64 (50%)
      animatedProgress.setValue(50);
      const base64 = await FileSystem.readAsStringAsync(sceneImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataURL = `data:image/jpeg;base64,${base64}`;

      // Step 4: Upload to Supabase (80% - 100%)
      animatedProgress.setValue(80);
      const result = await SupabaseImageServiceRN.uploadAndSaveImage(
        dataURL,
        userId,
        (progress: number) => {
          // Map Supabase progress (5%-100%) to remaining progress (80%-100%)
          const mappedProgress = 80 + progress * 0.2;
          setCurrentProgress(mappedProgress);
          animatedProgress.setValue(mappedProgress);
        }
      );
      if (result.success) {
        animatedProgress.setValue(100);
        setTimeout(async () => {
          await loadGalleryImages();
          Alert.alert(
            "Saved",
            "Image successfully saved to gallery and cloud."
          );
        }, 300);
      } else {
        throw new Error(result.error || "Failed to save to Supabase");
      }
    } catch (error) {
      resetProgressAnimation();
      Alert.alert(
        "Failed to Save",
        error instanceof Error ? error.message : "An error occurred."
      );
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        resetProgressAnimation();
      }, 600);
    }
  };

  // --- PERBAIKAN: Sederhanakan kalkulasi posisi ---
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      if (!objectImage) return;
      isDragging.value = true;
      positionX.value = event.absoluteX - GHOST_IMAGE_SIZE / 2;
      positionY.value = event.absoluteY - GHOST_IMAGE_SIZE / 2 - 140;
    })
    .onChange((event) => {
      positionX.value = event.absoluteX - GHOST_IMAGE_SIZE / 2;
      positionY.value = event.absoluteY - GHOST_IMAGE_SIZE / 2 - 140;
    })
    .onEnd((event) => {
      if (sceneLayout.current) {
        runOnJS(handleDrop)(event.absoluteX, event.absoluteY);
      }
    })
    .onFinalize(() => {
      isDragging.value = false;
    });

  const animatedGhostStyle = useAnimatedStyle(() => ({
    left: positionX.value,
    top: positionY.value,
    opacity: isDragging.value ? 0.8 : 0,
    transform: [{ scale: isDragging.value ? 1.1 : 1 }],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <SafeAreaView className="flex-1 bg-transparent items-center pt-5">
        <View className="mx-4 mt-5">
          <Text className="text-gray-700 text-center">
            Drag the object image to scene image and see magic happen
          </Text>
        </View>
        <View className="flex-row justify-around w-full px-5 mt-10">
          <ImageCard
            title="Object"
            image={objectImage}
            onSelect={() => pickImage(setObjectImage, setOriginalObjectImage)}
            panGesture={objectImage ? panGesture : undefined}
          />

          <ImageCard
            ref={sceneRef}
            title="Scene"
            image={sceneImage}
            onSelect={() => pickImage(setSceneImage, setOriginalSceneImage)}
            onLayout={() => {
              sceneRef.current?.measure(
                (
                  x: number,
                  y: number,
                  width: number,
                  height: number,
                  pageX: number,
                  pageY: number
                ) => {
                  sceneLayout.current = { x: pageX, y: pageY, width, height };
                }
              );
            }}
          />
        </View>

        {hasEdited && (
          <View className="absolute bottom-5 w-full px-5 flex-row justify-around">
            <TouchableOpacity
              onPress={handleReset}
              className="bg-gray-200 px-5 py-3 rounded-full flex-1 mr-2 items-center border border-gray-300"
            >
              <Text className="text-gray-800 text-center font-semibold">
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="bg-blue-500 px-5 py-3 rounded-full flex-1 ml-2 items-center"
            >
              <Text className="text-white text-center font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <LoadingModal
        visible={isLoading || isSaving}
        title={isSaving ? "Saving to Gallery" : "Creating Magic"}
        message={
          isSaving
            ? "Storing your composited image..."
            : "AI is processing your request..."
        }
        animatedProgress={animatedProgress}
        progress={currentProgress}
      />

      {objectImage && (
        <Animated.View
          pointerEvents="none"
          style={[
            animatedGhostStyle,
            { width: GHOST_IMAGE_SIZE, height: GHOST_IMAGE_SIZE },
          ]}
          className="absolute rounded-xl border-2 border-gray-800 z-50"
        >
          <Image
            source={{ uri: objectImage.uri }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
};

export default HomeCanvas;
