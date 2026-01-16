import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ToolCall } from '../types/tools';

// Parse FunctionGemma's tool call format
// Format: <start_function_call>call:function_name{param1:<escape>value1<escape>,param2:<escape>value2<escape>}<end_function_call>
export function parseToolCall(response: string): ToolCall | null {
  const toolCallRegex = /<start_function_call>call:(\w+)\{([^}]*)\}<end_function_call>/;
  const match = response.match(toolCallRegex);
  
  if (!match) {
    return null;
  }

  const functionName = match[1];
  const paramsString = match[2];
  
  // Parse parameters
  const parameters: Record<string, string> = {};
  
  if (paramsString) {
    // Split by comma but be careful with escaped values
    const paramPairs = paramsString.split(',');
    
    for (const pair of paramPairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = pair.substring(0, colonIndex).trim();
      let value = pair.substring(colonIndex + 1).trim();
      
      // Remove <escape> tags
      value = value.replace(/<escape>/g, '').replace(/<\/escape>/g, '');
      
      if (key) {
        parameters[key] = value;
      }
    }
  }

  return {
    name: functionName,
    parameters,
  };
}

// Check if response contains a tool call
export function hasToolCall(response: string): boolean {
  return response.includes('<start_function_call>');
}

// Extract any text before or after the tool call
export function extractNonToolText(response: string): string {
  return response
    .replace(/<start_function_call>.*?<end_function_call>/g, '')
    .trim();
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  action?: string;
}

export interface UseToolCallsOptions {
  onThemeChange: (theme: 'light' | 'dark' | 'toggle') => void;
  onNotification: (title: string, message: string, type: string) => void;
  onNavigate: (screen: string) => void;
}

export function useToolCalls(options: UseToolCallsOptions) {
  const { onThemeChange, onNotification, onNavigate } = options;

  const executeToolCall = useCallback((toolCall: ToolCall): ToolExecutionResult => {
    switch (toolCall.name) {
      case 'change_theme': {
        const theme = toolCall.parameters.theme as 'light' | 'dark' | 'toggle';
        if (!theme) {
          return { success: false, message: 'Missing theme parameter' };
        }
        onThemeChange(theme);
        return { 
          success: true, 
          message: `Theme changed to ${theme}`,
          action: `change_theme(${theme})`
        };
      }

      case 'show_notification': {
        const message = toolCall.parameters.message;
        const title = toolCall.parameters.title || 'Notification';
        const type = toolCall.parameters.type || 'info';
        
        if (!message) {
          return { success: false, message: 'Missing message parameter' };
        }
        
        onNotification(title, message, type);
        return { 
          success: true, 
          message: `Notification shown: ${message}`,
          action: `show_notification("${title}", "${message}", "${type}")`
        };
      }

      case 'navigate_to_screen': {
        const screen = toolCall.parameters.screen;
        if (!screen) {
          return { success: false, message: 'Missing screen parameter' };
        }
        onNavigate(screen);
        return { 
          success: true, 
          message: `Navigated to ${screen}`,
          action: `navigate_to_screen(${screen})`
        };
      }

      default:
        return { 
          success: false, 
          message: `Unknown function: ${toolCall.name}` 
        };
    }
  }, [onThemeChange, onNotification, onNavigate]);

  const processResponse = useCallback((response: string): {
    toolCall: ToolCall | null;
    result: ToolExecutionResult | null;
    textResponse: string;
  } => {
    const toolCall = parseToolCall(response);
    const textResponse = extractNonToolText(response);
    
    if (toolCall) {
      const result = executeToolCall(toolCall);
      return { toolCall, result, textResponse };
    }
    
    return { toolCall: null, result: null, textResponse: response };
  }, [executeToolCall]);

  return {
    parseToolCall,
    executeToolCall,
    processResponse,
    hasToolCall,
  };
}
