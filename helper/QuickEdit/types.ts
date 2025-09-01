export interface ImageAsset {
  uri: string;
  base64?: string | null;
  width:number;
  height:number
}

export interface QuickEditScreenProps {
  quickEditImage: ImageAsset | null;
  onBackToHome: () => void;
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  onRePickImage: () => void;
  isLoading: boolean;
}

export type TabType = "combine" | "retouch" | "crop" | "adjust" | "filters";

export interface TabProps {
  onImageEdit: (action: string, imageUri: string, params?: any) => void;
  quickEditImage: ImageAsset | null;
  isLoading: boolean;
}

export interface CombineTabProps {
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
  isLoading: boolean;
}

export interface RetouchTabProps extends TabProps {
  onGenerate: (prompt: string, images: ImageAsset[]) => void;
}