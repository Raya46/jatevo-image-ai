// services/imageDownloadService.ts
import { GalleryImage } from '@/hooks/useImageDownload';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Linking, Platform } from 'react-native';

export interface DownloadResult {
  success: boolean;
  message: string;
  filePath?: string;
  asset?: MediaLibrary.Asset;
}

export class ImageDownloadService {
  
  /**
   * Request permissions for saving to gallery
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Android needs WRITE_EXTERNAL_STORAGE permission
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
        // iOS automatically requests permission when saving
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

  /**
   * Generate filename for downloaded image
   */
  static generateFileName(imageId: number): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `JATEVO_${imageId}_${timestamp}.png`;
  }

  /**
   * Download data URL image to gallery
   */
  static async downloadDataUrlImage(
    dataUrl: string, 
    imageId: number
  ): Promise<DownloadResult> {
    try {
      console.log('🔄 Starting data URL image download...');
      
      // Check permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Permission denied'
        };
      }

      const fileName = this.generateFileName(imageId);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('📁 Saving to:', fileUri);

      // Extract base64 data from data URL
      const base64Data = dataUrl.split(',')[1];
      
      if (!base64Data) {
        throw new Error('Invalid data URL format');
      }

      // Write base64 to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ File saved to temp location');

      // Save to media library
      const asset = await MediaLibrary.saveToLibraryAsync(fileUri);
      
      console.log('✅ Image saved to gallery:', asset);

      // Clean up temporary file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      
      console.log('🧹 Temporary file cleaned up');

      return {
        success: true,
        message: 'Image saved to gallery successfully!',
        filePath: fileUri,
        asset: asset,
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
      console.log('🔄 Starting remote image download...');
      console.log('🔗 URL:', imageUrl);
      
      // Check permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Permission denied'
        };
      }

      const fileName = this.generateFileName(imageId);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('📁 Downloading to:', fileUri);

      // Download file
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

      console.log('✅ File downloaded successfully');

      // Save to media library
      const asset = await MediaLibrary.saveToLibraryAsync(fileUri);
      
      console.log('✅ Image saved to gallery:', asset);

      // Clean up temporary file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      
      console.log('🧹 Temporary file cleaned up');

      return {
        success: true,
        message: 'Image downloaded to gallery successfully!',
        filePath: fileUri,
        asset: asset,
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
      console.log('📥 Starting image download for ID:', image.id);
      console.log('🔗 URI type:', image.uri.startsWith('data:') ? 'Data URL' : 'Remote URL');

      let result: DownloadResult;

      if (image.uri.startsWith('data:')) {
        // Handle data URL
        result = await this.downloadDataUrlImage(image.uri, image.id);
      } else {
        // Handle remote URL
        result = await this.downloadRemoteImage(image.uri, image.id);
      }

      if (result.success) {
        console.log('🎉 Download completed successfully!');
      } else {
        console.error('❌ Download failed:', result.message);
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
      console.log('📥 Starting download with progress tracking...');
      
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Permission denied'
        };
      }

      if (image.uri.startsWith('data:')) {
        // Data URL downloads are usually fast, simulate progress
        if (onProgress) {
          onProgress(50);
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress(100);
        }
        return await this.downloadDataUrlImage(image.uri, image.id);
      } else {
        // Remote URL download with progress
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

        // Save to gallery
        const asset = await MediaLibrary.saveToLibraryAsync(fileUri);
        
        // Clean up
        await FileSystem.deleteAsync(fileUri, { idempotent: true });

        return {
          success: true,
          message: 'Image downloaded successfully!',
          asset: asset,
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

      // Get recent assets (last 10)
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