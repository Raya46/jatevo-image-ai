import { useBatchDownload, useImageDownload } from "@/hooks/useImageDownload";
import { ImageRecord } from "@/services/supabaseService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface GalleryImage {
  id: number;
  uri: string;
  supabaseRecord?: ImageRecord;
}

interface OutputGalleryWithDownloadProps {
  galleryImages: GalleryImage[];
  onEditImage: (image: GalleryImage) => void;
  isInitialLoading: boolean;
}

const OutputGalleryWithDownload: React.FC<OutputGalleryWithDownloadProps> = ({
  galleryImages,
  onEditImage,
  isInitialLoading,
}) => {
  const { downloadImage, isDownloading, getProgress, totalActiveDownloads } =
    useImageDownload();

  const { downloadMultiple, isBatchDownloading, batchState } =
    useBatchDownload();

  const handleQuickDownload = async (image: GalleryImage) => {
    await downloadImage(image, true);
  };

  return (
    <View className="flex-1 p-4">
      {/* Header dengan download status */}
      <View className="flex-row items-center justify-between mb-4">
        {totalActiveDownloads > 0 && (
          <View className="flex-row items-center bg-blue-500/20 px-3 py-1 rounded-full">
            <Ionicons name="download" size={14} color="#60a5fa" />
            <Text className="text-blue-400 text-sm ml-1 font-medium">
              {totalActiveDownloads} downloading
            </Text>
          </View>
        )}
        {isBatchDownloading && (
          <View className="flex-row items-center bg-purple-500/20 px-3 py-1 rounded-full">
            <Ionicons name="download" size={14} color="#a855f7" />
            <Text className="text-purple-400 text-sm ml-1 font-medium">
              Batch: {batchState.completed}/{batchState.total}
            </Text>
          </View>
        )}
      </View>

      {/* Initial Loading Overlay */}
      {isInitialLoading && (
        <View className="absolute inset-0 bg-zinc-900/95 flex justify-center items-center rounded-2xl z-10">
          <View className="flex items-center">
            <View className="relative mb-4">
              <View className="w-16 h-16 bg-purple-600 rounded-full flex justify-center items-center">
                <Ionicons name="images" size={24} color="white" />
              </View>
              <View className="absolute inset-0 w-16 h-16 bg-purple-400 rounded-full animate-pulse opacity-30" />
            </View>
            <Text className="text-white text-lg font-bold mb-2">
              Loading Gallery
            </Text>
            <Text className="text-zinc-400 text-sm text-center max-w-xs">
              Fetching your images from the cloud...
            </Text>
            <View className="w-32 bg-zinc-700 rounded-full h-1 mt-4">
              <View
                className="bg-purple-500 h-1 rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </View>
          </View>
        </View>
      )}

      {galleryImages.length === 0 ? (
        <View className="flex-1 justify-center items-center py-8">
          <Ionicons name="images-outline" size={48} color="#52525b" />
          <Text className="text-zinc-500 text-center mt-4">
            No images generated yet
          </Text>
          <Text className="text-zinc-600 text-sm text-center mt-2">
            Use the Prompt Engine above to create your first image
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {galleryImages.map((img) => {
              const downloading = isDownloading(img.id);
              const progress = getProgress(img.id);

              return (
                <View
                  key={img.id}
                  className="w-[48%] aspect-square rounded-lg overflow-hidden relative mb-3 bg-zinc-800"
                >
                  {/* Loading placeholder */}
                  <View className="absolute inset-0 flex justify-center items-center">
                    <Text className="text-zinc-500 text-xs">Loading...</Text>
                  </View>

                  {/* Main Image */}
                  <Image
                    source={{ uri: img.uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Download Progress Overlay */}
                  {downloading && (
                    <View className="absolute inset-0 bg-black/50 flex justify-center items-center">
                      <View className="bg-white/20 backdrop-blur p-3 rounded-full">
                        <Text className="text-white font-bold text-lg">
                          {progress}%
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Progress Bar */}
                  {downloading && (
                    <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <View
                        className="h-full bg-blue-500"
                        style={{ width: `${progress}%` }}
                      />
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="absolute inset-0 bg-transparent">
                    {/* Main tap area */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="flex-1"
                      disabled={downloading}
                      onPress={() => {
                        Alert.alert("Image Options", `Image #${img.id}`, [
                          {
                            text: "Edit",
                            onPress: () => onEditImage(img),
                          },
                          {
                            text: "Download to Gallery",
                            onPress: () => handleQuickDownload(img),
                          },
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
                        ]);
                      }}
                    />

                    {/* Quick actions overlay */}
                    <View className="absolute bottom-2 right-2 flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => onEditImage(img)}
                        disabled={downloading}
                        className="bg-black/70 p-2 rounded-full"
                      >
                        <MaterialIcons
                          name="edit"
                          size={16}
                          color={downloading ? "#666" : "white"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleQuickDownload(img)}
                        disabled={downloading}
                        className="bg-black/70 p-2 rounded-full"
                      >
                        <Ionicons
                          name={downloading ? "hourglass" : "download"}
                          size={16}
                          color={downloading ? "#60a5fa" : "white"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="absolute top-2 right-2">
                    {downloading ? (
                      <View className="bg-blue-500 p-1 rounded-full">
                        <Ionicons name="download" size={12} color="white" />
                      </View>
                    ) : img.supabaseRecord ? (
                      <View className="bg-green-500 p-1 rounded-full">
                        <Ionicons name="cloud-done" size={12} color="white" />
                      </View>
                    ) : (
                      <View className="bg-zinc-600 p-1 rounded-full">
                        <Ionicons
                          name="phone-portrait"
                          size={12}
                          color="white"
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Batch Download Option */}
          {galleryImages.length > 1 && (
            <TouchableOpacity
              onPress={() => downloadMultiple(galleryImages, true)}
              className="bg-purple-600 p-4 rounded-xl mt-4 flex-row items-center justify-center"
              disabled={totalActiveDownloads > 0 || isBatchDownloading}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text className="text-white font-bold ml-2">
                {isBatchDownloading
                  ? `Downloading... (${batchState.completed}/${batchState.total})`
                  : `Download All Images (${galleryImages.length})`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Batch Download Progress Overlay */}
          {isBatchDownloading && (
            <View className="absolute inset-0 bg-black/60 flex justify-center items-center rounded-2xl">
              <View className="bg-zinc-800 p-6 rounded-2xl flex items-center max-w-xs">
                <Ionicons name="download" size={32} color="#a855f7" />
                <Text className="text-white text-lg font-bold mt-2">
                  Downloading Images...
                </Text>
                <Text className="text-zinc-400 text-sm mt-1 text-center">
                  {batchState.completed} of {batchState.total} completed
                </Text>
                <View className="w-full bg-zinc-700 rounded-full h-2 mt-4">
                  <View
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${
                        batchState.total > 0
                          ? (batchState.completed / batchState.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="text-zinc-500 text-xs mt-2">
                  Other features remain accessible
                </Text>
              </View>
            </View>
          )}

          {/* Debug info */}
          {__DEV__ && galleryImages.length > 0 && (
            <View className="mt-4 p-3 bg-zinc-800 rounded-lg">
              <Text className="text-zinc-400 text-xs font-bold">
                Download Status: {totalActiveDownloads} active
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default OutputGalleryWithDownload;
