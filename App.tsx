import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LLMProvider, useLLMContext } from './src/context/LLMContext';
import { ModelDownloadDialog } from './src/components/ModelDownloadDialog';
import { ChatInterface, ChatMessage } from './src/components/ChatInterface';
import { ScreenIndicator, ScreenName } from './src/components/ScreenIndicator';
import { NotificationToast, NotificationData } from './src/components/NotificationToast';
import { useToolCalls } from './src/hooks/useToolCalls';

function AppContent() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  
  // Notification state
  const [notification, setNotification] = useState<NotificationData | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // LLM context
  const { status, isModelReady, askToDownload, generateResponse } = useLLMContext();

  // Tool call handlers
  const { processResponse } = useToolCalls({
    onThemeChange: (theme) => {
      if (theme === 'toggle') {
        setIsDarkMode((prev) => !prev);
      } else {
        setIsDarkMode(theme === 'dark');
      }
    },
    onNotification: (title, message, type) => {
      setNotification({
        id: Date.now().toString(),
        title,
        message,
        type: type as NotificationData['type'],
        timestamp: new Date(),
      });
    },
    onNavigate: (screen) => {
      setCurrentScreen(screen as ScreenName);
    },
  });

  const styles = getStyles(isDarkMode);

  // Show download dialog if status is asking, downloading, downloaded, loading, or error
  const showDownloadDialog = ['asking', 'downloading', 'downloaded', 'loading', 'error'].includes(status);

  const handleSendMessage = useCallback(async (text: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    try {
      // Generate response from LLM
      const response = await generateResponse(text);
      
      // Process response for tool calls
      const { toolCall, result, textResponse } = processResponse(response);
      
      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result 
          ? (textResponse || result.message)
          : (textResponse || response),
        toolCall: toolCall && result ? {
          name: toolCall.name,
          action: result.action || `${toolCall.name}()`,
          success: result.success,
        } : undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  }, [generateResponse, processResponse]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onDismiss={() => setNotification(null)}
        isDarkMode={isDarkMode}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>FunctionGemma</Text>
          <Text style={styles.headerSubtitle}>
            {isModelReady ? 'Model Ready' : 'Model Not Loaded'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[
            styles.statusDot,
            isModelReady ? styles.statusReady : styles.statusNotReady
          ]} />
          {!isModelReady && status === 'idle' && (
            <TouchableOpacity
              style={styles.loadButton}
              onPress={askToDownload}
            >
              <Text style={styles.loadButtonText}>Load Model</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Screen Navigation Indicator */}
      <ScreenIndicator
        currentScreen={currentScreen}
        isDarkMode={isDarkMode}
        onScreenChange={setCurrentScreen}
      />

      {/* Main Chat Area */}
      <View style={styles.content}>
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isGenerating}
          isDarkMode={isDarkMode}
          disabled={!isModelReady}
        />
      </View>

      {/* Theme Indicator */}
      <View style={styles.themeIndicator}>
        <Text style={styles.themeText}>
          Theme: {isDarkMode ? 'Dark' : 'Light'}
        </Text>
      </View>

      {/* Model Download Dialog */}
      <ModelDownloadDialog
        visible={showDownloadDialog}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <LLMProvider>
      <AppContent />
    </LLMProvider>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDarkMode ? '#f9fafb' : '#111827',
    },
    headerSubtitle: {
      fontSize: 12,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginTop: 2,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusReady: {
      backgroundColor: '#22c55e',
    },
    statusNotReady: {
      backgroundColor: '#f59e0b',
    },
    loadButton: {
      backgroundColor: '#3b82f6',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    loadButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '600',
    },
    content: {
      flex: 1,
    },
    themeIndicator: {
      position: 'absolute',
      bottom: 80,
      right: 16,
      backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    themeText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
  });
