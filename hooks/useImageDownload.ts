import { ImageDownloadService } from '@/services/imageDownloadService';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

export interface DownloadState {
  id: number;
  isDownloading: boolean;
  progress: number;
  error?: string;
}

export interface GalleryImage {
  id: number;
  uri: string;
  supabaseRecord?: any;
}

export interface UseImageDownloadReturn {
  downloads: Map<number, DownloadState>;
  totalActiveDownloads: number;
  
  
  downloadImage: (image: GalleryImage, showAlert?: boolean) => Promise<boolean>;
  cancelDownload: (imageId: number) => void;
  clearDownload: (imageId: number) => void;
  clearAllDownloads: () => void;
  
  
  isDownloading: (imageId: number) => boolean;
  getProgress: (imageId: number) => number;
  getDownloadState: (imageId: number) => DownloadState | undefined;
}

export const useImageDownload = (): UseImageDownloadReturn => {
  const [downloads, setDownloads] = useState<Map<number, DownloadState>>(new Map());
  const cancelTokens = useRef<Map<number, boolean>>(new Map());

  
  const updateDownloadState = useCallback((id: number, updates: Partial<DownloadState>) => {
    setDownloads(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id) || { id, isDownloading: false, progress: 0 };
      newMap.set(id, { ...current, ...updates });
      return newMap;
    });
  }, []);

  
  const clearDownload = useCallback((imageId: number) => {
    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(imageId);
      return newMap;
    });
    cancelTokens.current.delete(imageId);
  }, []);

  
  const cancelDownload = useCallback((imageId: number) => {
    cancelTokens.current.set(imageId, true);
    updateDownloadState(imageId, { isDownloading: false, progress: 0 });

    setTimeout(() => clearDownload(imageId), 1000);
  }, [updateDownloadState, clearDownload]);

  
  const downloadImage = useCallback(async (
    image: GalleryImage, 
    showAlert: boolean = true
  ): Promise<boolean> => {
    const imageId = image.id;
    
    
    const currentState = downloads.get(imageId);
    if (currentState?.isDownloading) {
      return false;
    }

    try {
      
      
      updateDownloadState(imageId, {
        id: imageId,
        isDownloading: true,
        progress: 0,
        error: undefined,
      });

      
      cancelTokens.current.set(imageId, false);

      
      const result = await ImageDownloadService.downloadImageWithProgress(
        image,
        (progress) => {
          if (cancelTokens.current.get(imageId)) {
            return;
          }

          updateDownloadState(imageId, { progress });
        }
      );

      
      if (cancelTokens.current.get(imageId)) {
        clearDownload(imageId);
        return false;
      }

      if (result.success) {
        
        updateDownloadState(imageId, {
          isDownloading: false,
          progress: 100,
        });

        if (showAlert) {
          Alert.alert(
            "Download Successful! 📸",
            result.message,
            [
              {
                text: "View in Gallery",
                onPress: () => {
                  // Open gallery functionality can be added here
                }
              },
              {
                text: "OK",
                onPress: () => {
                  setTimeout(() => clearDownload(imageId), 2000);
                }
              }
            ]
          );
        } else {
          
          setTimeout(() => clearDownload(imageId), 3000);
        }

        return true;

      } else {
        
        updateDownloadState(imageId, {
          isDownloading: false,
          progress: 0,
          error: result.message,
        });

        if (showAlert) {
          Alert.alert(
            "Download Failed",
            result.message,
            [
              {
                text: "Retry",
                onPress: () => downloadImage(image, showAlert)
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => clearDownload(imageId)
              }
            ]
          );
        }

        return false;
      }

    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
      
      updateDownloadState(imageId, {
        isDownloading: false,
        progress: 0,
        error: errorMessage,
      });

      if (showAlert) {
        Alert.alert(
          "Download Error",
          "An unexpected error occurred while downloading the image.",
          [
            {
              text: "Retry",
              onPress: () => downloadImage(image, showAlert)
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => clearDownload(imageId)
            }
          ]
        );
      }

      return false;
    }
  }, [downloads, updateDownloadState, clearDownload]);

  
  const clearAllDownloads = useCallback(() => {
    setDownloads(new Map());
    cancelTokens.current.clear();
  }, []);

  
  const isDownloading = useCallback((imageId: number): boolean => {
    return downloads.get(imageId)?.isDownloading || false;
  }, [downloads]);

  const getProgress = useCallback((imageId: number): number => {
    return downloads.get(imageId)?.progress || 0;
  }, [downloads]);

  const getDownloadState = useCallback((imageId: number): DownloadState | undefined => {
    return downloads.get(imageId);
  }, [downloads]);

  
  const totalActiveDownloads = Array.from(downloads.values()).filter(
    state => state.isDownloading
  ).length;

  return {
    
    downloads,
    totalActiveDownloads,
    
    
    downloadImage,
    cancelDownload,
    clearDownload,
    clearAllDownloads,
    
    
    isDownloading,
    getProgress,
    getDownloadState,
  };
};


export const useBatchDownload = () => {
  const singleDownload = useImageDownload();
  const [batchState, setBatchState] = useState<{
    isActive: boolean;
    completed: number;
    total: number;
    errors: string[];
  }>({
    isActive: false,
    completed: 0,
    total: 0,
    errors: [],
  });

  const downloadMultiple = useCallback(async (
    images: GalleryImage[],
    showProgress: boolean = true
  ): Promise<{
    success: boolean;
    completed: number;
    errors: string[];
  }> => {

    setBatchState({
      isActive: true,
      completed: 0,
      total: images.length,
      errors: [],
    });

    const results = {
      success: true,
      completed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        const success = await singleDownload.downloadImage(image, false);

        if (success) {
          results.completed++;
        } else {
          results.errors.push(`Failed to download image ${image.id}`);
          results.success = false;
        }

        setBatchState(prev => ({
          ...prev,
          completed: results.completed,
          errors: results.errors,
        }));

        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        const errorMsg = `Error downloading image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        results.success = false;
      }
    }

    setBatchState(prev => ({
      ...prev,
      isActive: false,
    }));

    
    if (showProgress) {
      const message = results.success 
        ? `Successfully downloaded ${results.completed} images!`
        : `Downloaded ${results.completed}/${images.length} images. ${results.errors.length} failed.`;

      Alert.alert(
        results.success ? "Batch Download Complete! 🎉" : "Batch Download Finished",
        message,
        [
          ...(results.errors.length > 0 ? [{
            text: "View Errors",
            onPress: () => {
              Alert.alert(
                "Download Errors",
                results.errors.join('\n\n'),
                [{ text: "OK" }]
              );
            }
          }] : []),
          { text: "OK" }
        ]
      );
    }

    return results;

  }, [singleDownload]);

  return {
    ...singleDownload,
    batchState,
    downloadMultiple,
    isBatchDownloading: batchState.isActive,
  };
};


export const useSimpleDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async (image: GalleryImage): Promise<boolean> => {
    if (isDownloading) return false;

    setIsDownloading(true);

    try {
      const result = await ImageDownloadService.downloadImage(image);

      if (result.success) {
        Alert.alert("Success! 📸", result.message);
        return true;
      } else {
        Alert.alert("Download Failed", result.message);
        return false;
      }
    } catch (error) {
      Alert.alert("Error", "Download failed unexpectedly");
      return false;
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  return {
    download,
    isDownloading,
  };
};


export const useDownloadStats = () => {
  const [stats, setStats] = useState<{
    totalDownloads: number;
    todayDownloads: number;
    successRate: number;
    lastDownload: Date | null;
  }>({
    totalDownloads: 0,
    todayDownloads: 0,
    successRate: 0,
    lastDownload: null,
  });

  const updateStats = useCallback((success: boolean) => {
    setStats(prev => {
      const today = new Date();
      const isToday = prev.lastDownload 
        ? prev.lastDownload.toDateString() === today.toDateString()
        : false;

      return {
        totalDownloads: prev.totalDownloads + 1,
        todayDownloads: isToday ? prev.todayDownloads + 1 : 1,
        successRate: success 
          ? ((prev.successRate * prev.totalDownloads) + 1) / (prev.totalDownloads + 1)
          : (prev.successRate * prev.totalDownloads) / (prev.totalDownloads + 1),
        lastDownload: today,
      };
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      totalDownloads: 0,
      todayDownloads: 0,
      successRate: 0,
      lastDownload: null,
    });
  }, []);

  return {
    stats,
    updateStats,
    resetStats,
  };
};