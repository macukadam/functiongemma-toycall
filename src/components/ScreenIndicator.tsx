import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type ScreenName = 'home' | 'settings' | 'profile' | 'about';

interface ScreenIndicatorProps {
  currentScreen: ScreenName;
  isDarkMode: boolean;
  onScreenChange?: (screen: ScreenName) => void;
}

const screenInfo: Record<ScreenName, { title: string; icon: string; description: string }> = {
  home: {
    title: 'Home',
    icon: 'H',
    description: 'Main chat interface',
  },
  settings: {
    title: 'Settings',
    icon: 'S',
    description: 'App configuration',
  },
  profile: {
    title: 'Profile',
    icon: 'P',
    description: 'User information',
  },
  about: {
    title: 'About',
    icon: 'A',
    description: 'App information',
  },
};

export function ScreenIndicator({ currentScreen, isDarkMode, onScreenChange }: ScreenIndicatorProps) {
  const styles = getStyles(isDarkMode);
  const screens: ScreenName[] = ['home', 'settings', 'profile', 'about'];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {screens.map((screen) => {
          const isActive = screen === currentScreen;
          const info = screenInfo[screen];
          
          return (
            <TouchableOpacity
              key={screen}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onScreenChange?.(screen)}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Text style={[styles.icon, isActive && styles.activeIcon]}>
                  {info.icon}
                </Text>
              </View>
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {info.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={styles.currentScreenInfo}>
        <Text style={styles.currentScreenLabel}>Current Screen:</Text>
        <Text style={styles.currentScreenTitle}>
          {screenInfo[currentScreen].title}
        </Text>
        <Text style={styles.currentScreenDescription}>
          {screenInfo[currentScreen].description}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    },
    tabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
    },
    tab: {
      alignItems: 'center',
      padding: 8,
      borderRadius: 12,
    },
    activeTab: {
      backgroundColor: isDarkMode ? '#374151' : '#eff6ff',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    activeIconContainer: {
      backgroundColor: '#3b82f6',
    },
    icon: {
      fontSize: 16,
      fontWeight: '700',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
    activeIcon: {
      color: '#ffffff',
    },
    tabText: {
      fontSize: 11,
      fontWeight: '500',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
    activeTabText: {
      color: '#3b82f6',
      fontWeight: '600',
    },
    currentScreenInfo: {
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    currentScreenLabel: {
      fontSize: 11,
      color: isDarkMode ? '#6b7280' : '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    currentScreenTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDarkMode ? '#f9fafb' : '#111827',
      marginTop: 2,
    },
    currentScreenDescription: {
      fontSize: 13,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginTop: 2,
    },
  });
