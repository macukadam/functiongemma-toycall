import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { initLlama, LlamaContext as LlamaCtx, releaseAllLlama } from 'llama.rn';
import { Paths, File } from 'expo-file-system';
import { createDownloadResumable } from 'expo-file-system/legacy';
import { availableTools } from '../types/tools';

// FunctionGemma GGUF model (Q4_K_M quantization - good balance of size/quality)
const MODEL_URL = 'https://huggingface.co/bartowski/google_functiongemma-270m-it-GGUF/resolve/main/google_functiongemma-270m-it-Q4_K_M.gguf';
const MODEL_NAME = 'functiongemma-270m-it-Q4_K_M.gguf';

export type ModelStatus = 'idle' | 'asking' | 'downloading' | 'downloaded' | 'loading' | 'ready' | 'error';

interface LLMContextType {
  status: ModelStatus;
  downloadProgress: number;
  error: string | null;
  isModelReady: boolean;
  askToDownload: () => void;
  confirmDownload: () => Promise<void>;
  cancelDownload: () => void;
  loadModel: () => Promise<void>;
  generateResponse: (prompt: string, onPartial?: (text: string) => void) => Promise<string>;
  releaseModel: () => Promise<void>;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

interface LLMProviderProps {
  children: ReactNode;
}

export function LLMProvider({ children }: LLMProviderProps) {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const llamaContextRef = useRef<LlamaCtx | null>(null);

  const getModelFile = () => new File(Paths.document, MODEL_NAME);

  const askToDownload = useCallback(() => {
    setStatus('asking');
    setError(null);
  }, []);

  const cancelDownload = useCallback(() => {
    setStatus('idle');
  }, []);

  const confirmDownload = useCallback(async () => {
    try {
      setStatus('downloading');
      setError(null);
      setDownloadProgress(0);

      const modelFile = getModelFile();
      const modelUri = modelFile.uri;

      // Check if already downloaded
      if (modelFile.exists && modelFile.size && modelFile.size > 100000000) {
        // File exists and is > 100MB (sanity check)
        setStatus('downloaded');
        setDownloadProgress(1);
        return;
      }

      // Use legacy createDownloadResumable for streaming download to disk
      // This avoids loading the entire file into memory
      const downloadResumable = createDownloadResumable(
        MODEL_URL,
        modelUri,
        {},
        (progress) => {
          const percent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
          setDownloadProgress(percent);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) {
        throw new Error('Download failed - no URI returned');
      }

      setStatus('downloaded');
      setDownloadProgress(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
      setStatus('error');
    }
  }, []);

  const loadModel = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      const modelFile = getModelFile();

      // Verify file exists
      if (!modelFile.exists) {
        throw new Error('Model file not found. Please download first.');
      }

      // Release any existing context
      if (llamaContextRef.current) {
        await releaseAllLlama();
        llamaContextRef.current = null;
      }

      // Initialize llama.rn context
      const context = await initLlama({
        model: modelFile.uri,
        n_ctx: 2048,        // Context window size
        n_batch: 512,       // Batch size for prompt processing
        n_threads: 4,       // Number of threads for inference
        use_mlock: true,    // Lock model in memory
        use_mmap: true,     // Memory-map the model file
      });

      llamaContextRef.current = context;
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setStatus('error');
    }
  }, []);

  const releaseModel = useCallback(async () => {
    try {
      await releaseAllLlama();
      llamaContextRef.current = null;
      setStatus('downloaded');
    } catch (err) {
      console.warn('Error releasing model:', err);
    }
  }, []);

  const generateResponse = useCallback(async (
    userPrompt: string,
    onPartial?: (text: string) => void
  ): Promise<string> => {
    if (!llamaContextRef.current) {
      throw new Error('Model is not ready');
    }

    // Convert tools to JSON schema format that FunctionGemma expects
    const toolsJsonSchema = availableTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    // Build the developer prompt with JSON tool definitions
    const developerPrompt = `You are a helpful assistant that can perform actions using function calls.

Available tools:
${JSON.stringify(toolsJsonSchema, null, 2)}

When the user asks you to perform an action, respond with a function call in this format:
<start_function_call>call:function_name{param_name:<escape>param_value<escape>}<end_function_call>

Examples:
- User says "switch to dark mode" -> <start_function_call>call:change_theme{theme:<escape>dark<escape>}<end_function_call>
- User says "show a notification" -> <start_function_call>call:show_notification{message:<escape>Hello!<escape>,type:<escape>info<escape>}<end_function_call>
- User says "go to settings" -> <start_function_call>call:navigate_to_screen{screen:<escape>settings<escape>}<end_function_call>

Always use the exact function call format above. Do not add any text before or after the function call.`;

    // Use Gemma 3 chat template format
    // Format: <bos><start_of_turn>developer\n{system}<end_of_turn>\n<start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n
    const fullPrompt = `<start_of_turn>developer
${developerPrompt}<end_of_turn>
<start_of_turn>user
${userPrompt}<end_of_turn>
<start_of_turn>model
`;

    try {
      let fullText = '';

      const result = await llamaContextRef.current.completion(
        {
          prompt: fullPrompt,
          n_predict: 128,       // Reduced - function calls are short
          temperature: 0.1,     // Very low for deterministic function calling
          top_k: 40,
          top_p: 0.95,
          stop: ['<end_of_turn>', '<start_of_turn>', '\n\n'],  // Gemma 3 stop tokens
        },
        (data) => {
          if (data.token && onPartial) {
            fullText += data.token;
            onPartial(fullText);
          }
        }
      );

      return result.text || fullText || '';
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to generate response');
    }
  }, []);

  const value: LLMContextType = {
    status,
    downloadProgress,
    error,
    isModelReady: !!llamaContextRef.current,
    askToDownload,
    confirmDownload,
    cancelDownload,
    loadModel,
    generateResponse,
    releaseModel,
  };

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
}

export function useLLMContext() {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error('useLLMContext must be used within a LLMProvider');
  }
  return context;
}
