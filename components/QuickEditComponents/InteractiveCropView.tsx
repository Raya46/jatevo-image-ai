import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { CropRegion } from "../../helper/QuickEdit/types";

interface InteractiveCropViewProps {
  imageLayout: { width: number; height: number };
  cropMode: "free" | "1:1" | "16:9";
  onCropRegionChange: (region: CropRegion) => void;
}

const HANDLE_SIZE = 24;
const BORDER_WIDTH = 2;

export const InteractiveCropView: React.FC<InteractiveCropViewProps> = ({
  imageLayout,
  cropMode,
  onCropRegionChange,
}) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const width = useSharedValue(imageLayout.width / 2);
  const height = useSharedValue(imageLayout.height / 2);

  useEffect(() => {
    offsetX.value = withTiming(imageLayout.width / 4);
    offsetY.value = withTiming(imageLayout.height / 4);
    width.value = withTiming(imageLayout.width / 2);
    height.value = withTiming(imageLayout.height / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLayout]);

  const updateParentState = () => {
    "worklet";
    runOnJS(onCropRegionChange)({
      x: offsetX.value,
      y: offsetY.value,
      width: width.value,
      height: height.value,
    });
  };

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      const newX = offsetX.value + event.changeX;
      const newY = offsetY.value + event.changeY;

      offsetX.value = Math.max(
        0,
        Math.min(newX, imageLayout.width - width.value)
      );
      offsetY.value = Math.max(
        0,
        Math.min(newY, imageLayout.height - height.value)
      );
    })
    .onEnd(updateParentState);

  const resizeGesture = Gesture.Pan()
    .onChange((event) => {
      const newWidth = width.value + event.changeX;
      let newHeight = height.value + event.changeY;

      if (cropMode === "1:1") {
        newHeight = newWidth;
      } else if (cropMode === "16:9") {
        newHeight = newWidth * (9 / 16);
      }

      width.value = Math.min(newWidth, imageLayout.width - offsetX.value);
      height.value = Math.min(newHeight, imageLayout.height - offsetY.value);
    })
    .onEnd(updateParentState);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
    width: width.value,
    height: height.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cropBox, animatedStyle]}>
          <View style={styles.overlay} />
          <View style={styles.gridRow} />
          <View style={styles.gridCol} />
          <GestureDetector gesture={resizeGesture}>
            <View style={styles.resizeHandle} />
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  cropBox: {
    position: "absolute",
    borderWidth: BORDER_WIDTH,
    borderColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  resizeHandle: {
    position: "absolute",
    bottom: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 2,
    borderColor: "#333",
  },
  gridRow: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    top: "33.33%",
  },
  gridCol: {
    position: "absolute",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    left: "33.33%",
  },
});
