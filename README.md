# JATEVO - AI Photo Editor 📸✨

A powerful, AI-powered photo editing application built with React Native and Expo, featuring Google Gemini integration for advanced image generation and editing capabilities.

![JATEVO Banner](./assets/images/jatevo.png)

## 🌟 Features

### 🎨 AI-Powered Image Generation

- **Text-to-Image**: Generate stunning images from text descriptions
- **Image-to-Image**: Transform existing images with AI prompts
- **Reference Images**: Use up to 9 reference images for guided generation
- **Real-time Processing**: Instant AI-powered image creation

### 🛠️ Advanced Editing Tools

- **Retouch**: AI-powered image enhancement and correction
- **Crop**: Intelligent cropping with multiple aspect ratios
- **Adjust**: Color correction, brightness, contrast, and lighting
- **Filters**: Artistic filters including Synthwave, Anime, Lomo, and Glitch
- **Multi-Image Studio**: Combine multiple images with AI assistance

### 📱 Smart Gallery Management

- **Cloud Storage**: Seamless integration with Supabase for cloud backup
- **Batch Download**: Download all images at once with progress tracking
- **Individual Downloads**: Download single images with progress indicators
- **Local Gallery**: Save images directly to device gallery
- **Image Organization**: Automatic categorization and metadata management

### 🎯 User Experience

- **Beautiful UI**: Modern dark theme with purple accents
- **Responsive Design**: Optimized for both mobile and tablet devices
- **Loading States**: Elegant loading animations and progress indicators
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Offline Support**: Basic functionality works without internet connection

## 🛠️ Tech Stack

### Frontend

- **React Native 0.79.6**: Cross-platform mobile development
- **Expo SDK 53**: Development platform and native modules
- **TypeScript**: Type-safe JavaScript for better development experience
- **NativeWind**: Tailwind CSS for React Native
- **Expo Router**: File-based routing system

### AI & APIs

- **Google Gemini 2.5 Flash**: Advanced AI image generation and editing
- **Supabase**: Cloud database and storage solution
- **Expo Image Picker**: Native image selection and camera integration
- **Expo Media Library**: Native gallery access and image saving

### Development Tools

- **ESLint**: Code linting and formatting
- **Babel**: JavaScript transpilation
- **Metro**: React Native bundler
- **Expo CLI**: Development and build tools

## 🏗️ Architecture

```
├── app/                    # Main application screens
│   ├── index.tsx          # Main screen with Prompt Engine
│   ├── QuickEditScreen.tsx # Advanced editing interface
│   └── _layout.tsx         # App layout and navigation
├── components/            # Reusable UI components
│   ├── MainScreen.tsx     # Main application interface
│   └── QuickEditScreen.tsx # Quick edit component
├── hooks/                 # Custom React hooks
│   ├── useGeminiAI.ts     # Gemini AI integration
│   ├── useImageDownload.ts # Download management
│   └── useImageEditing.ts # Image editing operations
├── services/              # External service integrations
│   ├── imageDownloadService.ts # Download functionality
│   └── supabaseService.ts # Cloud storage
└── utils/                 # Utility functions
    └── supabase.ts        # Supabase configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd jatevo-image-gen
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Configure your environment variables:

   ```env
   # Google Gemini API Key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Development Mode (optional)
   EXPO_PUBLIC_USE_MOCK_MODE=false
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

### Running on Devices

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Physical Device**: Scan QR code with Expo Go app

## 📖 How It Works

### 1. AI Image Generation Flow

```
User Input → Google Gemini API → Image Processing → Cloud Storage → Gallery Display
```

### 2. Image Editing Pipeline

```
Original Image → AI Processing → Edited Result → User Preview → Save/Download
```

### 3. Download System

```
Generated Image → Progress Tracking → Media Library → Gallery Notification
```

### 4. Cloud Integration

```
Local Images → Supabase Upload → Cloud Storage → Cross-device Sync
```

## 🎨 Usage Guide

### Basic Image Generation

1. Open the app and navigate to the main screen
2. Select "Text to Image" or "Image to Image" mode
3. Enter your prompt or select reference images
4. Tap "Generate" and wait for AI processing
5. Download or edit the generated image

### Advanced Editing

1. Tap on any generated image in the gallery
2. Choose "Edit" from the options menu
3. Select from available editing tools:
   - **Retouch**: AI-powered corrections
   - **Crop**: Aspect ratio adjustments
   - **Adjust**: Color and lighting tweaks
   - **Filters**: Artistic effects
   - **Combine**: Multi-image operations

### Batch Operations

1. Generate multiple images
2. Use "Download All Images" button
3. Monitor progress with real-time indicators
4. Access downloaded images in device gallery

## ⚙️ Configuration

### Google Gemini API Setup

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create a new project or select existing one
3. Enable Gemini API and generate API key
4. Add the key to your `.env` file

### Supabase Setup

1. Create a new project at [Supabase](https://supabase.com/)
2. Get your project URL and anon key
3. Configure storage buckets for image uploads
4. Update environment variables

### Development Mode

Enable mock mode for development without API calls:

```env
EXPO_PUBLIC_USE_MOCK_MODE=true
```

## 🔧 API Integration Details

### Google Gemini Integration

- **Model**: `gemini-1.5-flash` (latest stable version)
- **Capabilities**: Text-to-image, image-to-image, image editing
- **Rate Limits**: 50 requests/day (free tier)
- **Error Handling**: Automatic retry with exponential backoff

### Supabase Integration

- **Storage**: Image upload and retrieval
- **Database**: Metadata and user preferences
- **Real-time**: Live updates and synchronization
- **Security**: Row Level Security (RLS) enabled

## 🐛 Troubleshooting

### Common Issues

#### API Quota Exceeded (429 Error)

**Symptoms**: "Resource exhausted" or "Quota exceeded" messages
**Solutions**:

1. Enable mock mode: `EXPO_PUBLIC_USE_MOCK_MODE=true`
2. Wait for daily quota reset (00:00 UTC)
3. Upgrade to paid Gemini API plan

#### Image Download Failed

**Symptoms**: Download progress stops or fails
**Solutions**:

1. Check device storage space
2. Grant media library permissions
3. Ensure stable internet connection
4. Try individual downloads instead of batch

#### Supabase Connection Issues

**Symptoms**: Images not loading or uploading
**Solutions**:

1. Verify environment variables
2. Check Supabase project status
3. Ensure proper network connectivity
4. Review Supabase dashboard for errors

### Debug Mode

Enable debug logging by setting:

```env
EXPO_PUBLIC_DEBUG_MODE=true
```

## 📊 Performance Optimization

### Image Processing

- **Lazy Loading**: Images load progressively
- **Compression**: Automatic image optimization
- **Caching**: Smart caching for faster reloads
- **Background Processing**: Non-blocking operations

### Memory Management

- **Component Cleanup**: Proper unmounting and cleanup
- **Image Disposal**: Automatic memory cleanup
- **Batch Processing**: Controlled concurrent operations
- **Error Boundaries**: Graceful error handling

## 🔒 Security Features

### API Security

- **Environment Variables**: Sensitive data stored securely
- **API Key Protection**: Keys never exposed in client code
- **Request Validation**: Server-side validation for all requests

### Data Privacy

- **Local Storage**: User preferences stored locally
- **Cloud Security**: Supabase RLS and encryption
- **Permission Management**: Granular permission controls

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI**: For powerful image generation capabilities
- **Supabase**: For reliable cloud infrastructure
- **Expo Team**: For the amazing development platform
- **React Native Community**: For excellent tooling and libraries

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Join our community discussions

---

**Made with ❤️ using React Native, Expo, and Google Gemini AI**
