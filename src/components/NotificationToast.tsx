import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

interface NotificationToastProps {
  notification: NotificationData | null;
  onDismiss: () => void;
  isDarkMode: boolean;
}

const typeConfig = {
  info: {
    icon: 'i',
    bgColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  success: {
    icon: '!',
    bgColor: '#22c55e',
    borderColor: '#16a34a',
  },
  warning: {
    icon: '!',
    bgColor: '#f59e0b',
    borderColor: '#d97706',
  },
  error: {
    icon: 'x',
    bgColor: '#ef4444',
    borderColor: '#dc2626',
  },
};

export function NotificationToast({
  notification,
  onDismiss,
  isDarkMode,
}: NotificationToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  const config = typeConfig[notification.type];
  const styles = getStyles(isDarkMode, config);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={dismiss}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
          <Text style={styles.closeIcon}>x</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (isDarkMode: boolean, config: typeof typeConfig.info) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 50,
      left: 16,
      right: 16,
      zIndex: 1000,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderLeftWidth: 4,
      borderLeftColor: config.bgColor,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: config.bgColor,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    icon: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: isDarkMode ? '#f9fafb' : '#111827',
      marginBottom: 2,
    },
    message: {
      fontSize: 13,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      lineHeight: 18,
    },
    closeButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    closeIcon: {
      fontSize: 14,
      fontWeight: '600',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
  });
