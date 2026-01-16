# FunctionGemma Tool Calling Demo

A proof-of-concept Expo React Native app demonstrating on-device LLM tool calling using Google's FunctionGemma model with MediaPipe inference.

## Overview

This app showcases how to run a local LLM (FunctionGemma 270M) on mobile devices that can understand user intent and execute function calls to control the UI. No server required - everything runs on-device for privacy and offline use.

## Features

- **On-Device Inference**: Runs FunctionGemma 270M entirely on the device using MediaPipe
- **Lazy Model Loading**: Asks user permission before downloading the ~288MB model
- **3 Distinctive Tool Calls**:
  - `change_theme` - Toggle between light/dark mode
  - `show_notification` - Display toast notifications
  - `navigate_to_screen` - Navigate between app screens
- **Real UI Effects**: Tool calls actually modify the app's state and UI
- **Chat Interface**: Natural language input with suggested prompts

## Screenshots

The app includes:
- Model download confirmation dialog with progress tracking
- Chat interface with message history
- Screen navigation indicator
- Animated notification toasts
- Theme toggle (light/dark mode)

## Prerequisites

- Node.js 18+
- Expo CLI
- Physical device or emulator (Android SDK 24+ / iOS 14+)
- ~300MB free storage for the model

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd functiongemma

# Install dependencies
npm install

# Start the development server
npx expo start
```

## Running the App

```bash
# Android
npm run android

# iOS
npm run ios
```

> **Note**: This app requires a development build since it uses native modules. It will not work with Expo Go.

### Creating a Development Build

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

## Usage

1. **Load the Model**: Tap "Load Model" button in the header
2. **Confirm Download**: The app will ask permission to download the FunctionGemma model (~288MB)
3. **Wait for Loading**: After download, the model loads into memory
4. **Start Chatting**: Use natural language to trigger tool calls

### Example Prompts

| Prompt | Tool Called | Effect |
|--------|-------------|--------|
| "Switch to dark mode" | `change_theme` | Toggles dark theme |
| "Show me a notification" | `show_notification` | Displays a toast |
| "Go to settings" | `navigate_to_screen` | Navigates to settings |
| "Toggle the theme" | `change_theme` | Switches theme |
| "Alert me about the weather" | `show_notification` | Shows weather alert |
| "Navigate to profile" | `navigate_to_screen` | Goes to profile screen |

## Project Structure

```
functiongemma/
├── App.tsx                          # Main app component
├── src/
│   ├── context/
│   │   └── LLMContext.tsx           # LLM state management
│   ├── hooks/
│   │   └── useToolCalls.ts          # Tool parsing & execution
│   ├── types/
│   │   └── tools.ts                 # Tool definitions
│   └── components/
│       ├── ModelDownloadDialog.tsx  # Download UI
│       ├── ChatInterface.tsx        # Chat UI
│       ├── ScreenIndicator.tsx      # Navigation display
│       └── NotificationToast.tsx    # Toast notifications
├── docs/
│   └── FINE_TUNING.md               # Fine-tuning guide
├── app.json                         # Expo configuration
└── package.json                     # Dependencies
```

## How It Works

### Tool Call Format

FunctionGemma outputs tool calls in this format:
```
<start_function_call>call:function_name{param:<escape>value<escape>}<end_function_call>
```

### Tool Definitions

```typescript
// Example: change_theme tool
{
  name: "change_theme",
  description: "Changes the app theme to light or dark mode",
  parameters: {
    type: "object",
    properties: {
      theme: {
        type: "string",
        enum: ["light", "dark", "toggle"]
      }
    },
    required: ["theme"]
  }
}
```

### Response Processing

1. User sends a message
2. LLM generates a response (potentially with tool calls)
3. `useToolCalls` hook parses the response
4. If a tool call is found, it's executed
5. UI updates based on the tool call

## Model Information

- **Model**: FunctionGemma 270M (Mobile Actions fine-tune)
- **Size**: ~288MB (quantized INT8)
- **Source**: [HuggingFace](https://huggingface.co/JackJ1/functiongemma-270m-it-mobile-actions-litertlm)
- **Format**: LiteRT (.litertlm) for MediaPipe inference

## Dependencies

- `expo` ~54.0.31
- `expo-llm-mediapipe` ^0.6.0
- `react` 19.1.0
- `react-native` 0.81.5

## Fine-Tuning

Want to customize the model for your own tools? See the [Fine-Tuning Guide](docs/FINE_TUNING.md).

## Limitations

- Requires physical device or emulator (no Expo Go support)
- Model download requires internet connection
- First inference may be slow due to model initialization
- Limited to the 3 predefined tools (without fine-tuning)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Google FunctionGemma](https://ai.google.dev/gemma/docs/functiongemma) - The base model
- [expo-llm-mediapipe](https://github.com/tirthajyoti-ghosh/expo-llm-mediapipe) - Expo wrapper for MediaPipe LLM
- [MediaPipe](https://developers.google.com/mediapipe) - On-device ML framework
