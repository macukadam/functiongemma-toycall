# Alternative Runtimes for FunctionGemma

This guide documents alternative approaches for running FunctionGemma on mobile devices.

## Table of Contents

1. [Current Implementation: llama.rn + GGUF](#current-implementation-llamarn--gguf)
2. [Alternative: ONNX Runtime](#alternative-onnx-runtime)
3. [Previous Approach: expo-llm-mediapipe](#previous-approach-expo-llm-mediapipe)
4. [Format Compatibility Matrix](#format-compatibility-matrix)

---

## Current Implementation: llama.rn + GGUF

This project uses [llama.rn](https://github.com/mybigday/llama.rn), a React Native binding for llama.cpp that supports GGUF format models.

### Why llama.rn?

- **GGUF Support**: Industry-standard format with wide model availability
- **Active Development**: Regular updates and community support
- **GPU Acceleration**: Supports OpenCL and Hexagon DSP on Android
- **Quantization Options**: Multiple quantization levels for size/quality tradeoff
- **FunctionGemma Available**: Official GGUF versions on Hugging Face

### Model Options

#### FunctionGemma 270M (Recommended for Mobile)

| Quantization | Size | Quality | URL |
|-------------|------|---------|-----|
| Q4_K_M | 253 MB | **Default** - Good balance | [Download](https://huggingface.co/bartowski/google_functiongemma-270m-it-GGUF/resolve/main/google_functiongemma-270m-it-Q4_K_M.gguf) |
| Q4_0 | 242 MB | Smaller | [Download](https://huggingface.co/bartowski/google_functiongemma-270m-it-GGUF/resolve/main/google_functiongemma-270m-it-Q4_0.gguf) |
| Q8_0 | 292 MB | Better quality | [Download](https://huggingface.co/bartowski/google_functiongemma-270m-it-GGUF/resolve/main/google_functiongemma-270m-it-Q8_0.gguf) |

#### FunctionGemma 2B (Higher Quality, Larger)

| Quantization | Size | URL |
|-------------|------|-----|
| Q4_K_M | ~1.5 GB | [bartowski/google_functiongemma-2b-it-GGUF](https://huggingface.co/bartowski/google_functiongemma-2b-it-GGUF) |

### Configuration

The current implementation uses these settings:

```typescript
// Model initialization
await initLlama({
  model: modelPath,
  n_ctx: 2048,        // Context window size
  n_batch: 512,       // Batch size for prompt processing
  n_threads: 4,       // Number of threads for inference
  use_mlock: true,    // Lock model in memory
  use_mmap: true,     // Memory-map the model file
});

// Inference settings
await context.completion({
  prompt: fullPrompt,
  n_predict: 256,       // Max tokens to generate
  temperature: 0.3,     // Lower temperature for focused outputs
  top_k: 40,
  top_p: 0.9,
  stop: ['User:', '\n\n', '<|endoftext|>'],
});
```

---

## Alternative: ONNX Runtime

[ONNX Runtime for React Native](https://github.com/microsoft/onnxruntime-react-native) is an official Microsoft package that supports running ONNX models. FunctionGemma has ONNX versions available.

### Pros

- Official Microsoft support
- GPU acceleration via NNAPI (Android) and CoreML (iOS)
- Wide model compatibility

### Cons

- **Complex Implementation**: Requires manual implementation of:
  - Tokenization (sentencepiece)
  - Autoregressive generation loop
  - KV-cache management
- **Larger Model Size**: ONNX models are typically larger than quantized GGUF

### Model Availability

- **Model**: [onnx-community/functiongemma-270m-it-ONNX](https://huggingface.co/onnx-community/functiongemma-270m-it-ONNX)
- **Size**: ~540MB (fp32)

### Implementation Complexity

Unlike llama.rn which provides a complete inference pipeline, ONNX Runtime requires you to implement:

```typescript
// Pseudocode - actual implementation is more complex
import { InferenceSession } from 'onnxruntime-react-native';

// 1. Load the model
const session = await InferenceSession.create(modelPath);

// 2. Tokenize input (need sentencepiece implementation)
const inputIds = tokenizer.encode(prompt);

// 3. Run inference loop
let outputIds = [];
for (let i = 0; i < maxTokens; i++) {
  // Prepare inputs with KV-cache
  const feeds = {
    input_ids: inputIds,
    attention_mask: attentionMask,
    // ... past_key_values for KV-cache
  };
  
  // Run model
  const output = await session.run(feeds);
  
  // Sample next token
  const nextToken = sampleToken(output.logits);
  outputIds.push(nextToken);
  
  // Update KV-cache
  // ...
}

// 4. Decode output
const response = tokenizer.decode(outputIds);
```

**Recommendation**: Use llama.rn unless you have specific requirements for ONNX Runtime.

---

## Previous Approach: expo-llm-mediapipe

The original implementation used `expo-llm-mediapipe` with `.litertlm` format models. This approach was abandoned due to format incompatibility.

### The Problem

```
RET_CHECK failure (third_party/odml/litert/runtime/executor.cc:166)
```

**Root Cause**: The `.litertlm` format is designed for Google's LiteRT-LM runtime, but `expo-llm-mediapipe` uses MediaPipe Tasks GenAI which expects a different model format.

### Why It Didn't Work

| Library | Expected Format | FunctionGemma Available? |
|---------|----------------|-------------------------|
| expo-llm-mediapipe | MediaPipe TFLite (.tflite) | **No** (only .litertlm exists) |
| LiteRT-LM | .litertlm | Yes, but no React Native bindings |
| llama.rn | GGUF (.gguf) | **Yes** |

---

## Format Compatibility Matrix

| Format | Size | Library Support | FunctionGemma Available? |
|--------|------|-----------------|-------------------------|
| GGUF (.gguf) | ~253MB (Q4_K_M) | llama.rn | **Yes** (recommended) |
| ONNX (.onnx) | ~540MB (fp32) | onnxruntime-react-native | **Yes** (complex implementation) |
| LiteRT (.litertlm) | ~288MB | No RN bindings | Yes (unusable in RN) |
| TFLite (.tflite) | N/A | react-native-fast-tflite | **No** FunctionGemma version |

---

## Migration Guide

### From expo-llm-mediapipe to llama.rn

If you're migrating from `expo-llm-mediapipe`:

1. **Update Dependencies**
   ```bash
   npm uninstall expo-llm-mediapipe
   npm install llama.rn expo-file-system
   ```

2. **Update app.json**
   ```json
   {
     "expo": {
       "plugins": [
         ["llama.rn", { "enableOpenCLAndHexagon": true }]
       ]
     }
   }
   ```

3. **Update LLMContext** - Replace the hook-based approach with llama.rn's `initLlama`

4. **Rebuild Native Code**
   ```bash
   npx expo prebuild --platform android --clean
   cd android && ./gradlew assembleDebug
   ```

### API Differences

| Feature | expo-llm-mediapipe | llama.rn |
|---------|-------------------|----------|
| Initialize | `useLLM()` hook | `initLlama()` function |
| Download | `llm.downloadModel()` | Manual with expo-file-system |
| Load | `llm.loadModel()` | Happens in `initLlama()` |
| Generate | `llm.generateResponse()` | `context.completion()` |
| Streaming | Callback parameter | Callback parameter |
| Release | Automatic | `releaseAllLlama()` |

---

## Troubleshooting

### Build Errors

**C++ compilation errors**: llama.rn has a large C++ codebase. The first build takes 10-15 minutes. Ensure you have sufficient memory (8GB+ RAM).

**Missing symbols**: Make sure ProGuard rules are added for release builds:
```proguard
-keep class com.rnllama.** { *; }
```

### Runtime Errors

**Model load failure**: Verify the GGUF file downloaded completely. Check file size matches expected (~253MB for Q4_K_M).

**Out of memory**: Try a smaller quantization (Q4_0) or reduce `n_ctx` in model options.

**Slow inference**: Reduce `n_threads` if the device has fewer cores, or increase `n_batch` for better throughput.

---

## Resources

- [llama.rn GitHub](https://github.com/mybigday/llama.rn)
- [bartowski's GGUF models](https://huggingface.co/bartowski)
- [GGUF format spec](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [llama.cpp documentation](https://github.com/ggerganov/llama.cpp)
- [ONNX Runtime React Native](https://github.com/microsoft/onnxruntime-react-native)
- [FunctionGemma ONNX](https://huggingface.co/onnx-community/functiongemma-270m-it-ONNX)
