
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Linking, Platform } from 'react-native';

export interface GalleryImage {
  id: number;
  uri: string;
  supabaseRecord?: any;
}

export interface DownloadResult {
  success: boolean;
  message: string;
  filePath?: string;
  asset?: MediaLibrary.Asset;
}

export class ImageDownloadService {

  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need permission to save images to your gallery. Please enable it in settings.',
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
          return false;
        }
      } else if (Platform.OS === 'ios') {
        
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need permission to save images to your photo library.',
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }


  static generateFileName(imageId: number): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `JATEVO_${imageId}_${timestamp}.png`;
  }

  static async downloadDataUrlImage(
    dataUrl: string,
    imageId: number
  ): Promise<DownloadResult> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Permission denied'
        };
      }

      const fileName = this.generateFileName(imageId);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const base64Data = dataUrl.split(',')[1];

      if (!base64Data) {
        throw new Error('Invalid data URL format');
      }

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await MediaLibrary.saveToLibraryAsync(fileUri);

      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      return {
        success: true,
        message: 'Image saved to gallery successfully!',
        filePath: fileUri,
      };

    } catch (error) {
      console.error('❌ Download failed:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Download remote URL image to gallery
   */
  static async downloadRemoteImage(
    imageUrl: string, 
    imageId: number
  ): Promise<DownloadResult> {
    try {
      
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Permission denied'
        };
      }

      const fileName = this.generateFileName(imageId);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      

      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);

      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      return {
        success: true,
        message: 'Image downloaded to gallery successfully!',
        filePath: fileUri,
      };

    } catch (error) {
      console.error('❌ Remote download failed:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Main download function that handles both data URLs and remote URLs
   */
  static async downloadImage(image: GalleryImage): Promise<DownloadResult> {
    try {
      let result: DownloadResult;

      if (image.uri.startsWith('data:')) {
        result = await this.downloadDataUrlImage(image.uri, image.id);
      } else {
        result = await this.downloadRemoteImage(image.uri, image.id);
      }

      return result;

    } catch (error) {
      console.error('❌ Download error:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown download error',
      };
    }
  }

  /**
   * Download with progress tracking (for large files)
   */
  static async downloadImageWithProgress(
    image: GalleryImage,
    onProgress?: (progress: number) => void
  ): Promise<DownloadResult> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Permission denied'
        };
      }

      if (image.uri.startsWith('data:')) {
        if (onProgress) {
          onProgress(50);
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress(100);
        }
        return await this.downloadDataUrlImage(image.uri, image.id);
      } else {
        const fileName = this.generateFileName(image.id);
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          image.uri,
          fileUri,
          {},
          onProgress ? (downloadProgress) => {
            const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
            onProgress(Math.round(progress));
          } : undefined
        );

        const result = await downloadResumable.downloadAsync();

        if (!result || result.status !== 200) {
          throw new Error(`Download failed with status: ${result?.status}`);
        }

        await MediaLibrary.saveToLibraryAsync(fileUri);

        await FileSystem.deleteAsync(fileUri, { idempotent: true });

        return {
          success: true,
          message: 'Image downloaded successfully!',
        };
      }

    } catch (error) {
      console.error('❌ Progress download failed:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Check if we have necessary permissions
   */
  static async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get download statistics
   */
  static async getDownloadStats(): Promise<{
    totalAssets: number;
    recentDownloads: MediaLibrary.Asset[];
  }> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        return {
          totalAssets: 0,
          recentDownloads: [],
        };
      }

      
      const recentAssets = await MediaLibrary.getAssetsAsync({
        first: 10,
        mediaType: 'photo',
        sortBy: 'creationTime',
      });

      return {
        totalAssets: recentAssets.totalCount,
        recentDownloads: recentAssets.assets,
      };

    } catch (error) {
      console.error('❌ Failed to get download stats:', error);
      return {
        totalAssets: 0,
        recentDownloads: [],
      };
    }
  }
}