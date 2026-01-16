import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLLMContext, ModelStatus } from '../context/LLMContext';

interface ModelDownloadDialogProps {
  visible: boolean;
  isDarkMode: boolean;
}

export function ModelDownloadDialog({ visible, isDarkMode }: ModelDownloadDialogProps) {
  const { 
    status, 
    downloadProgress, 
    error, 
    confirmDownload, 
    cancelDownload, 
    loadModel 
  } = useLLMContext();

  const styles = getStyles(isDarkMode);

  const renderContent = () => {
    switch (status) {
      case 'asking':
        return (
          <>
            <Text style={styles.title}>Download FunctionGemma Model?</Text>
            <Text style={styles.description}>
              This app uses FunctionGemma, a 270M parameter model for function calling.
              The model is approximately 288MB and will be downloaded to your device.
            </Text>
            <Text style={styles.subtext}>
              The model runs entirely on-device for privacy and offline use.
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={cancelDownload}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.confirmButton]} 
                onPress={confirmDownload}
              >
                <Text style={styles.confirmButtonText}>Download</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 'downloading':
        return (
          <>
            <Text style={styles.title}>Downloading Model...</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.round(downloadProgress * 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
            <Text style={styles.subtext}>
              Please wait while the model is being downloaded...
            </Text>
          </>
        );

      case 'downloaded':
        return (
          <>
            <Text style={styles.title}>Download Complete!</Text>
            <Text style={styles.description}>
              The model has been downloaded successfully. 
              Tap the button below to load it into memory.
            </Text>
            <TouchableOpacity 
              style={[styles.button, styles.confirmButton, styles.fullWidthButton]} 
              onPress={loadModel}
            >
              <Text style={styles.confirmButtonText}>Load Model</Text>
            </TouchableOpacity>
          </>
        );

      case 'loading':
        return (
          <>
            <Text style={styles.title}>Loading Model...</Text>
            <ActivityIndicator size="large" color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
            <Text style={styles.subtext}>
              Initializing the model for inference...
            </Text>
          </>
        );

      case 'error':
        return (
          <>
            <Text style={styles.title}>Error</Text>
            <Text style={[styles.description, styles.errorText]}>
              {error || 'An unexpected error occurred'}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={cancelDownload}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.confirmButton]} 
                onPress={confirmDownload}
              >
                <Text style={styles.confirmButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dialog: {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: isDarkMode ? '#f9fafb' : '#111827',
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      color: isDarkMode ? '#d1d5db' : '#4b5563',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 8,
    },
    subtext: {
      fontSize: 13,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
    },
    fullWidthButton: {
      marginTop: 8,
    },
    cancelButton: {
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
    },
    confirmButton: {
      backgroundColor: '#3b82f6',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    progressContainer: {
      marginVertical: 16,
    },
    progressBar: {
      height: 8,
      backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      color: isDarkMode ? '#d1d5db' : '#4b5563',
      textAlign: 'center',
      marginTop: 8,
    },
    errorText: {
      color: '#ef4444',
    },
  });
