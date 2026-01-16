import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useLLM } from 'expo-llm-mediapipe';
import { availableTools, formatToolsForPrompt } from '../types/tools';

// FunctionGemma model URL (mobile-actions fine-tuned version for LiteRT)
const MODEL_URL = 'https://huggingface.co/JackJ1/functiongemma-270m-it-mobile-actions-litertlm/resolve/main/mobile-actions_q8_ekv1024.litertlm';
const MODEL_NAME = 'functiongemma-mobile-actions.bin';

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
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

interface LLMProviderProps {
  children: ReactNode;
}

export function LLMProvider({ children }: LLMProviderProps) {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const llm = useLLM({
    modelName: MODEL_NAME,
    modelUrl: MODEL_URL,
    maxTokens: 512,
    temperature: 0.3,
    topK: 40,
    randomSeed: 42,
  });

  // Sync status from llm hook
  useEffect(() => {
    if (llm.downloadStatus === 'downloaded' && status === 'downloading') {
      setStatus('downloaded');
    }
    if (llm.downloadStatus === 'error' && llm.downloadError) {
      setError(llm.downloadError);
      setStatus('error');
    }
    if (llm.isLoaded && status === 'loading') {
      setStatus('ready');
    }
  }, [llm.downloadStatus, llm.downloadError, llm.isLoaded, status]);

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

      // Check if model already downloaded
      if (llm.downloadStatus === 'downloaded') {
        setStatus('downloaded');
        return;
      }

      // Download the model
      await llm.downloadModel();
      setStatus('downloaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
      setStatus('error');
    }
  }, [llm]);

  const loadModel = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      await llm.loadModel();
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setStatus('error');
    }
  }, [llm]);

  const generateResponse = useCallback(async (
    userPrompt: string,
    onPartial?: (text: string) => void
  ): Promise<string> => {
    if (!llm.isLoaded) {
      throw new Error('Model is not ready');
    }

    // Build the system prompt with tool definitions
    const toolsDescription = formatToolsForPrompt(availableTools);
    
    const systemPrompt = `You are a helpful assistant that can perform actions using function calls.

Available functions:
${toolsDescription}

When the user asks you to perform an action, respond with a function call in this format:
<start_function_call>call:function_name{param_name:<escape>param_value<escape>}<end_function_call>

For example:
- To change theme: <start_function_call>call:change_theme{theme:<escape>dark<escape>}<end_function_call>
- To show notification: <start_function_call>call:show_notification{message:<escape>Hello World<escape>,type:<escape>info<escape>}<end_function_call>
- To navigate: <start_function_call>call:navigate_to_screen{screen:<escape>settings<escape>}<end_function_call>

If the user's request doesn't match any function, just respond normally.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}\nAssistant:`;

    try {
      const response = await llm.generateResponse(
        fullPrompt,
        onPartial ? (partial) => onPartial(partial) : undefined
      );
      return response || '';
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to generate response');
    }
  }, [llm]);

  const value: LLMContextType = {
    status,
    downloadProgress: llm.downloadProgress,
    error,
    isModelReady: llm.isLoaded,
    askToDownload,
    confirmDownload,
    cancelDownload,
    loadModel,
    generateResponse,
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
