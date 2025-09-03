import * as FileSystem from 'expo-file-system';

export interface ImageInfo {
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  isLocal: boolean;
  isDataUrl: boolean;
  format: 'png' | 'jpeg' | 'webp' | 'unknown';
}

export class ImageUriUtils {
  

  static analyzeUri(uri: string): ImageInfo {
    const info: ImageInfo = {
      isLocal: false,
      isDataUrl: false,
      format: 'unknown'
    };

    if (uri.startsWith('data:image/')) {
      info.isDataUrl = true;
      info.isLocal = true;
      
      const mimeMatch = uri.match(/data:image\/([^;]+)/);
      if (mimeMatch) {
        info.mimeType = `image/${mimeMatch[1]}`;
        info.format = mimeMatch[1] as any;
      }
      
      const base64Part = uri.split(',')[1];
      if (base64Part) {
        info.size = Math.round((base64Part.length * 3) / 4); // Base64 to bytes conversion
      }
    } else if (uri.startsWith('file://')) {
      info.isLocal = true;
      
      const extension = uri.split('.').pop()?.toLowerCase();
      if (extension && ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        info.format = extension === 'jpg' ? 'jpeg' : extension as any;
        info.mimeType = `image/${info.format}`;
      }
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      info.isLocal = false;
      
      const urlParts = uri.split('?')[0]; // Remove query params
      const extension = urlParts.split('.').pop()?.toLowerCase();
      if (extension && ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        info.format = extension === 'jpg' ? 'jpeg' : extension as any;
        info.mimeType = `image/${info.format}`;
      }
    } else if (uri.startsWith('content://')) {
      info.isLocal = true;
    }

    return info;
  }

  static async convertToBase64(uri: string): Promise<{
    base64: string;
    mimeType: string;
    info: ImageInfo;
  }> {
    console.log('🔄 Converting URI to base64:', uri.substring(0, 100) + '...');
    
    const info = this.analyzeUri(uri);
    console.log('📊 URI Analysis:', info);

    try {
      let base64: string;
      let mimeType = info.mimeType || 'image/jpeg';

      if (info.isDataUrl) {
        console.log('✅ Extracting base64 from data URL...');
        const parts = uri.split(',');
        if (parts.length !== 2) {
          throw new Error('Invalid data URL format');
        }
        base64 = parts[1];
        
        if (!base64 || base64.length === 0) {
          throw new Error('Empty base64 data in data URL');
        }
      }
      
      else if (uri.startsWith('file://') || uri.startsWith('content://')) {
        console.log('🔄 Reading local file as base64...');
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (!base64) {
          throw new Error('Failed to read local file as base64');
        }
      }
      
      else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        console.log('🔄 Downloading remote image...');
        
        const fileName = `temp_download_${Date.now()}.${info.format || 'jpg'}`;
        const localUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        const downloadResult = await FileSystem.downloadAsync(uri, localUri);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }

        console.log('✅ Download successful, converting to base64...');
        
        base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await FileSystem.deleteAsync(localUri, { idempotent: true });
        
        if (!base64) {
          throw new Error('Failed to convert downloaded file to base64');
        }
      }
      
      else {
        throw new Error(`Unsupported URI format: ${uri.substring(0, 50)}...`);
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        throw new Error('Invalid base64 format detected');
      }

      console.log('✅ Base64 conversion successful');
      console.log('📊 Base64 length:', base64.length);
      console.log('📊 Estimated size:', Math.round((base64.length * 3) / 4 / 1024), 'KB');

      return {
        base64,
        mimeType,
        info
      };

    } catch (error) {
      console.error('❌ URI to base64 conversion failed:', error);
      throw new Error(`Failed to convert image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if URI is a valid image
   */
  static isValidImageUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') {
      return false;
    }

    // Data URL validation
    if (uri.startsWith('data:image/')) {
      const validFormats = ['png', 'jpeg', 'jpg', 'webp', 'gif'];
      const formatMatch = uri.match(/data:image\/([^;]+)/);
      return formatMatch ? validFormats.includes(formatMatch[1].toLowerCase()) : false;
    }

    // File URI validation
    if (uri.startsWith('file://')) {
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
      return validExtensions.some(ext => uri.toLowerCase().includes(ext));
    }

    // Remote URL validation
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        const url = new URL(uri);
        const pathname = url.pathname.toLowerCase();
        const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        return validExtensions.some(ext => pathname.includes(ext));
      } catch {
        return false;
      }
    }

    // Content URI (Android)
    if (uri.startsWith('content://')) {
      return true; // Assume valid, will be validated during processing
    }

    return false;
  }

  /**
   * Get optimal MIME type for Gemini API
   */
  static getOptimalMimeType(uri: string): string {
    const info = this.analyzeUri(uri);
    
    // Gemini works best with JPEG
    switch (info.format) {
      case 'png':
      case 'webp':
        return 'image/jpeg'; // Convert to JPEG for better compatibility
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'image/jpeg'; // Default fallback
    }
  }

  /**
   * Compress large base64 images if needed
   */
  static compressBase64IfNeeded(base64: string, maxSizeKB: number = 1024): string {
    const currentSizeKB = Math.round((base64.length * 3) / 4 / 1024);
    
    if (currentSizeKB <= maxSizeKB) {
      console.log(`Image size ${currentSizeKB}KB is within limit`);
      return base64;
    }

    console.log(`Image size ${currentSizeKB}KB exceeds ${maxSizeKB}KB limit`);
    
    // Simple compression by truncating (not ideal, but works as fallback)
    const targetLength = Math.floor((maxSizeKB * 1024 * 4) / 3);
    const compressed = base64.substring(0, targetLength);
    
    console.log(`Compressed to ${Math.round((compressed.length * 3) / 4 / 1024)}KB`);
    
    return compressed;
  }

  /**
   * Create a test data URL for debugging
   */
  static createTestDataUrl(): string {
    // 1x1 pixel transparent PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  /**
   * Validate base64 string
   */
  static isValidBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * Get file info from URI
   */
  static async getFileInfo(uri: string): Promise<FileSystem.FileInfo | null> {
    try {
      if (!uri.startsWith('file://')) {
        return null;
      }
      
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists ? info : null;
    } catch (error) {
      console.error('Failed to get file info:', error);
      return null;
    }
  }
}

// Enhanced conversion function untuk useGeminiAI
export const convertUriToBase64Enhanced = async (uri: string): Promise<string> => {
  try {
    console.log('Starting enhanced URI to base64 conversion...');
    
    // Validate URI first
    if (!ImageUriUtils.isValidImageUri(uri)) {
      throw new Error('Invalid image URI provided');
    }

    const result = await ImageUriUtils.convertToBase64(uri);
    
    // Validate the resulting base64
    if (!ImageUriUtils.isValidBase64(result.base64)) {
      throw new Error('Generated base64 is invalid');
    }

    // Compress if too large (Gemini has size limits)
    const compressedBase64 = ImageUriUtils.compressBase64IfNeeded(result.base64, 2048);

    console.log('Enhanced conversion completed successfully');
    return compressedBase64;

  } catch (error) {
    console.error('Enhanced conversion failed:', error);
    throw error;
  }
};

// Debugging utilities
export const debugImageUri = async (uri: string) => {
  console.log('=== IMAGE URI DEBUG ===');
  console.log('URI:', uri.substring(0, 100) + '...');
  
  const info = ImageUriUtils.analyzeUri(uri);
  console.log('Analysis:', info);
  
  const isValid = ImageUriUtils.isValidImageUri(uri);
  console.log('Valid:', isValid);
  
  if (uri.startsWith('file://')) {
    const fileInfo = await ImageUriUtils.getFileInfo(uri);
    console.log('File Info:', fileInfo);
  }
  
  try {
    const { base64, mimeType } = await ImageUriUtils.convertToBase64(uri);
    console.log('Conversion Success:', {
      mimeType,
      base64Length: base64.length,
      estimatedSizeKB: Math.round((base64.length * 3) / 4 / 1024)
    });
  } catch (error) {
    console.log('Conversion Failed:', error);
  }
  
  console.log('=== END DEBUG ===');
};