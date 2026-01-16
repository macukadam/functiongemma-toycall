import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCall?: {
    name: string;
    action: string;
    success: boolean;
  };
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isDarkMode: boolean;
  disabled?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  isDarkMode,
  disabled,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const styles = getStyles(isDarkMode);

  const handleSend = () => {
    if (inputText.trim() && !isLoading && !disabled) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
          isSystem && styles.systemMessage,
        ]}
      >
        <Text style={[styles.messageRole, isUser && styles.userRole]}>
          {isUser ? 'You' : isSystem ? 'System' : 'FunctionGemma'}
        </Text>
        <Text style={[styles.messageText, isUser && styles.userText]}>
          {item.content}
        </Text>
        {item.toolCall && (
          <View style={[
            styles.toolCallBadge,
            item.toolCall.success ? styles.toolCallSuccess : styles.toolCallError
          ]}>
            <Text style={styles.toolCallIcon}>
              {item.toolCall.success ? 'fn()' : 'fn()'}
            </Text>
            <Text style={styles.toolCallText}>
              {item.toolCall.action}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSuggestions = () => {
    const suggestions = [
      'Switch to dark mode',
      'Show me a notification',
      'Go to settings',
      'Toggle the theme',
      'Navigate to profile',
      'Alert me about something',
    ];

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Try saying:</Text>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => setInputText(suggestion)}
              disabled={disabled || isLoading}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>FunctionGemma Tool Calling Demo</Text>
          <Text style={styles.emptySubtitle}>
            Ask me to perform actions like changing the theme, showing notifications, or navigating to different screens.
          </Text>
          {renderSuggestions()}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={disabled ? 'Load the model first...' : 'Type a message...'}
          placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
          editable={!disabled && !isLoading}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading || disabled}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    messagesList: {
      padding: 16,
      paddingBottom: 8,
    },
    messageContainer: {
      maxWidth: '85%',
      padding: 12,
      borderRadius: 16,
      marginBottom: 12,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#3b82f6',
      borderBottomRightRadius: 4,
    },
    assistantMessage: {
      alignSelf: 'flex-start',
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      borderBottomLeftRadius: 4,
    },
    systemMessage: {
      alignSelf: 'center',
      backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb',
      maxWidth: '95%',
    },
    messageRole: {
      fontSize: 11,
      fontWeight: '600',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    userRole: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    messageText: {
      fontSize: 15,
      color: isDarkMode ? '#f9fafb' : '#111827',
      lineHeight: 21,
    },
    userText: {
      color: '#ffffff',
    },
    toolCallBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      gap: 6,
    },
    toolCallSuccess: {
      backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
    },
    toolCallError: {
      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
    },
    toolCallIcon: {
      fontSize: 12,
      fontWeight: '700',
      color: '#22c55e',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    toolCallText: {
      fontSize: 12,
      color: isDarkMode ? '#d1d5db' : '#374151',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      flex: 1,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: isDarkMode ? '#f9fafb' : '#111827',
    },
    sendButton: {
      backgroundColor: '#3b82f6',
      borderRadius: 20,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
    },
    sendButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 15,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: isDarkMode ? '#f9fafb' : '#111827',
      textAlign: 'center',
      marginBottom: 12,
    },
    emptySubtitle: {
      fontSize: 15,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    suggestionsContainer: {
      width: '100%',
    },
    suggestionsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginBottom: 12,
      textAlign: 'center',
    },
    suggestionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    suggestionChip: {
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
    },
    suggestionText: {
      fontSize: 13,
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
  });
