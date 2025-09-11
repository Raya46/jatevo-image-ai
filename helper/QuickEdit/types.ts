export interface ImageAsset {
  uri: string;
  base64?: string | null;
  width:number;
  height:number
}

export interface QuickEditScreenProps {
  quickEditImage: ImageAsset | null;
  onBackToHome: () => void;
  onGenerate: (prompt: string, images: ImageAsset[], onProgress?: (progress: number) => void) => void;
  onImageEdit: (action: string, imageUri: string, params?: any, shouldSaveToGallery?: boolean, onProgress?: (progress: number) => void) => void;
  onRePickImage: () => void;
  isLoading: boolean;
  userId?: string | null;
}

export interface CropRegion {
  x: number;      
  y: number;      
  width: number;  
  height: number; 
}

export type TabType = "retouch" | "crop" | "adjust" | "filters";

export interface TabProps {
  onImageEdit: (action: string, imageUri: string, params?: any, shouldSaveToGallery?: boolean, onProgress?: (progress: number) => void) => void;
  quickEditImage: ImageAsset | null;
  isLoading: boolean;
}

export interface RetouchTabProps extends TabProps {
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
}