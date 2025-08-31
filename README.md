# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## 🤖 JATEVO AI Features

This app integrates with **Google Gemini 2.5 Flash Image Preview** for AI-powered image generation and editing.

### 🚨 Handling API Quota Limits (429 Errors)

Google Gemini API has rate limits for the free tier:

- **50 requests per day** per project per model
- **10 requests per minute** per project per model
- **32,768 input tokens per minute** per project per model

#### Solutions for Quota Exceeded:

**1. Enable Mock Mode (Development)**

```env
# .env file
EXPO_PUBLIC_USE_MOCK_MODE=true
```

**Mock Mode Features:**

- ✅ Generate random images without API calls
- ✅ Simulate loading delays (2 seconds)
- ✅ Test UI/UX without hitting quota limits
- ✅ Perfect for development & testing

**2. Upgrade to Paid Plan**

- Visit [Google AI Studio Billing](https://ai.google.dev/gemini-api/docs/billing)
- Choose a paid plan based on your needs
- Get higher quota limits

**3. Wait for Reset**

- Free tier quota resets daily at 00:00 UTC
- Wait 24 hours for automatic quota reset

#### Error Handling Features:

- ✅ **Automatic Retry Logic**: Retry with exponential backoff (up to 3 attempts)
- ✅ **Smart Error Detection**: Detects 429 RESOURCE_EXHAUSTED errors
- ✅ **User-Friendly Messages**: Clear error messages with helpful links
- ✅ **Graceful Degradation**: Mock mode as fallback option

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
