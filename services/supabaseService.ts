import { supabase } from "@/utils/supabase";

export interface ImageRecord {
  id?: number;
  url: string;
  created_at?: string;
}

export class SupabaseImageServiceRN {
  private static readonly BUCKET_NAME = 'images-gen';
  private static readonly TABLE_NAME = 'images';

  /**
   * Generate unique filename
   */
  private static generateFileName(): string {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `generated_${timestamp}_${randomString}.png`;
  }

  /**
   * Convert data URL to base64 string and mime type
   */
  private static parseDataURL(dataURL: string): { base64: string; mimeType: string } {
    try {
      const [header, base64] = dataURL.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      
      return { base64, mimeType };
    } catch (error) {
      console.error('❌ Error parsing data URL:', error);
      throw new Error('Invalid data URL format');
    }
  }

  /**
   * Upload image to Supabase storage
   */
  static async uploadImage(dataURL: string): Promise<string | null> {
    try {
      const { base64, mimeType } = this.parseDataURL(dataURL);
      const fileName = this.generateFileName();

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // Upload using Supabase client
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, uint8Array, {
          cacheControl: '3600',
          upsert: false,
          contentType: mimeType,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return urlData.publicUrl;

    } catch (error) {
      console.error('Failed to upload image:', error);
      return null;
    }
  }

  /**
   * Save image URL to database table
   */
  static async saveImageRecord(url: string): Promise<ImageRecord | null> {
    try {
      console.log('💾 Saving image record to database...');
      console.log('🔗 URL length:', url.length);
      console.log('🔗 URL type:', url.startsWith('data:') ? 'Data URL' : 'Public URL');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert([{ url }])
        .select()
        .single();

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      console.log('✅ Image record saved:', data);
      return data;

    } catch (error) {
      console.error('❌ Failed to save image record:', error);
      return null;
    }
  }

  /**
   * Complete workflow: Upload image and save record
   */
  static async uploadAndSaveImage(dataURL: string): Promise<{
    success: boolean;
    url?: string;
    record?: ImageRecord;
    error?: string;
    method?: string;
  }> {
    try {
      console.log('🚀 Starting complete image save workflow...');

      // Step 1: Upload image
      const uploadedUrl = await this.uploadImage(dataURL);
      if (!uploadedUrl) {
        return {
          success: false,
          error: 'Failed to upload image (all methods failed)'
        };
      }

      const method = uploadedUrl.startsWith('data:') ? 'fallback-dataurl' : 'storage-upload';
      console.log('📊 Upload method used:', method);

      // Step 2: Save URL to database
      const record = await this.saveImageRecord(uploadedUrl);
      if (!record) {
        return {
          success: false,
          error: 'Failed to save image record to database',
          url: uploadedUrl,
          method
        };
      }

      console.log('🎉 Complete workflow successful!');
      
      return {
        success: true,
        url: uploadedUrl,
        record,
        method
      };

    } catch (error) {
      console.error('❌ Complete workflow failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all saved images from database
   */
  static async getAllImages(): Promise<ImageRecord[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch images:', error);
        return [];
      }

      console.log(`📚 Fetched ${data?.length || 0} images from database`);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to get images:', error);
      return [];
    }
  }

  /**
   * Delete image from both storage and database
   */
  static async deleteImage(imageRecord: ImageRecord): Promise<boolean> {
    try {
      console.log('🗑️ Deleting image:', imageRecord.id);
      
      // Only try to delete from storage if it's a storage URL
      if (imageRecord.url && !imageRecord.url.startsWith('data:')) {
        try {
          // Extract filename from URL
          const urlParts = imageRecord.url.split('/');
          const fileName = urlParts[urlParts.length - 1];

          const { error: storageError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([fileName]);

          if (storageError) {
            console.warn('⚠️ Failed to delete from storage (continuing):', storageError);
          } else {
            console.log('✅ Deleted from storage');
          }
        } catch (storageError) {
          console.warn('⚠️ Storage deletion error (continuing):', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', imageRecord.id);

      if (dbError) {
        console.error('❌ Failed to delete from database:', dbError);
        return false;
      }

      console.log('✅ Image deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Test connection to Supabase
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('count(*)')
        .single();
      
      if (error) {
        console.error('❌ Connection test failed:', error);
        return false;
      }
      
      console.log('✅ Supabase connection successful');
      return true;
      
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return false;
    }
  }
}