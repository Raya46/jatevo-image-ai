import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { ImageAsset } from "../helper/QuickEdit/types";

export const requestImagePermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission needed",
      "Please grant permission to access your photos"
    );
    return false;
  }
  return true;
};

export const pickImageFromLibrary = async (): Promise<ImageAsset | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      return {
        uri: result.assets[0].uri,
        base64: null,
        height: result.assets[0].height,
        width: result.assets[0].width,
      };
    }
    return null;
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Error", "Failed to pick image");
    return null;
  }
};