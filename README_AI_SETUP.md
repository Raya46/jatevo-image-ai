# JATEVO Photo Editor AI - Setup Guide

## 🚀 Gemini AI Integration

Aplikasi JATEVO sekarang terintegrasi dengan **Google Gemini 2.5 Flash Image Preview** untuk fitur AI-powered image generation dan editing.

## 📋 Prerequisites

1. **Node.js** (v18 atau lebih baru)
2. **Expo CLI** (`npm install -g @expo/cli`)
3. **Google Gemini API Key**

## 🔑 Setup Gemini API Key

### 1. Dapatkan API Key

1. Kunjungi [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Login dengan akun Google Anda
3. Buat API key baru
4. Copy API key tersebut

### 2. Konfigurasi Environment

1. Buka file `.env` di root project
2. Ganti `your_gemini_api_key_here` dengan API key Anda:

```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyD...your_actual_api_key_here
```

## 🛠️ Installation & Setup

```bash
# Install dependencies
npm install

# Install official Google Gemini library
npm install @google/genai

# Start development server
npx expo start
```

## 🎨 Fitur AI yang Tersedia

### 1. **Image Generation (Prompt Engine)**

- **Text to Image**: Generate gambar dari deskripsi teks
- **Image to Image**: Transform gambar existing dengan prompt
- **Multi Image Combination**: Gabungkan multiple images

### 2. **Image Editing (Quick Edit Tabs)**

#### **Retouch Tab**

- Custom editing dengan prompt natural language
- Contoh: "remove the person in the background", "make it brighter"

#### **Crop Tab**

- Smart cropping dengan aspect ratios
- Free crop, 1:1, 16:9 ratios

#### **Adjust Tab**

- Preset adjustments: Blur Background, Enhance Details, Warmer Lighting, Studio Light
- Custom adjustment prompts

#### **Filters Tab**

- Artistic filters: Synthwave, Anime, Lomo, Glitch
- Custom filter creation

## 🔧 Technical Implementation

### Custom Hooks Structure

```
hooks/
├── useGeminiAI.ts      # Core Gemini API integration
└── useImageEditing.ts  # Specialized image editing functions
```

### API Integration Details

**✅ Official Google Gemini Library:**

- Menggunakan `@google/genai` library resmi
- Otentikasi dan request formatting yang proper
- Mendukung streaming responses
- Error handling yang lebih baik

**❌ Previous Axios Implementation:**

- Menggunakan Axios untuk manual HTTP requests
- Rentan terhadap 400 errors karena format request yang salah
- Tidak menggunakan authentication yang tepat
- Sulit menangani streaming responses

**🔄 Migration Benefits:**

- ✅ Mengatasi 400 Bad Request errors
- ✅ Proper authentication handling
- ✅ Better error messages
- ✅ Official library support
- ✅ Future-proof dengan library updates

### Key Features

#### **useGeminiAI Hook**

```typescript
const { generateImage, editImage, isLoading, error } = useGeminiAI();
```

#### **useImageEditing Hook**

```typescript
const {
  removeBackground,
  enhanceImage,
  adjustColors,
  combineImages,
  cropImage,
  applyFilter,
  isProcessing,
} = useImageEditing();
```

### API Integration

- **Base URL**: `https://generativelanguage.googleapis.com/v1beta`
- **Model**: `gemini-2.5-flash-image-preview`
- **Response Modalities**: `['IMAGE', 'TEXT']`
- **Authentication**: Bearer token via API key

## 📱 Mobile Optimization

- **Image Picking**: Native gallery access via `expo-image-picker`
- **Responsive Layout**: Optimized untuk mobile screens
- **Touch Interactions**: Native touch feedback
- **Performance**: Efficient image processing dan caching

## 🚨 Important Notes

### API Limits & Costs

- Gemini API memiliki rate limits dan costs
- Monitor usage di Google Cloud Console
- Consider implementing caching untuk repeated requests

### Error Handling

- Network connectivity issues
- Invalid API responses
- Image processing failures
- User-friendly error messages

### Security

- API key stored securely in environment variables
- No sensitive data logged
- Secure image handling

## 🐛 Troubleshooting

### Common Issues

1. **"API Key Invalid"**

   - Pastikan API key benar di `.env`
   - Restart Expo development server

2. **"Network Error"**

   - Periksa koneksi internet
   - Verify API endpoints

3. **"Image Processing Failed"**
   - Pastikan gambar format didukung (JPEG, PNG)
   - Check image size limits

### Debug Mode

```bash
# Enable debug logging
console.log('Gemini Response:', response.data);
```

## 📚 Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

## 🎯 Next Steps

1. **Testing**: Test semua fitur AI dengan berbagai prompts
2. **Optimization**: Implement caching untuk performance
3. **UI/UX**: Improve loading states dan error handling
4. **Features**: Add more AI-powered editing tools

---

**Happy Creating with JATEVO AI! 🎨🤖**
