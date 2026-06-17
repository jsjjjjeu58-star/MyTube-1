import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// থিমের কালার প্যালেট তৈরি (Light Mode এবং Dark Mode-এর জন্য)
export const themeColors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    surface: '#F5F5F5',
    primary: '#FF0000',
    icon: '#212121',
    border: '#E0E0E0',
    card: '#FFFFFF',
    textMuted: '#606060'
  },
  dark: {
    background: '#000000',
    text: '#FFFFFF',
    surface: '#121212',
    primary: '#FF0000',
    icon: '#FFFFFF',
    border: '#333333',
    card: '#1F1F1F',
    textMuted: '#AAAAAA'
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme(); // মোবাইলের সিস্টেম থিম ডিটেক্ট করার জন্য
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    // অ্যাপ চালু হওয়ার সময় ইউজারের আগের সেভ করা থিম প্রিফারেন্স লোড করা
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user_theme');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // যদি আগে কোনো চয়েস না থাকে, মোবাইলের সিস্টেম থিম ব্যবহার করবে
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (e) {
        console.error('Error loading theme settings:', e);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  // থিম টগল (লাইট থেকে ডার্ক বা ডার্ক থেকে লাইট) করার ফাংশন
  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('user_theme', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Error saving theme settings:', e);
    }
  };

  // বর্তমান থিম অনুযায়ী কালার সিলেক্ট করা
  const colors = isDarkMode ? themeColors.dark : themeColors.light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// কাস্টম হুক (সহজে অন্য স্ক্রিন থেকে থিম ব্যবহার করার জন্য)
export const useTheme = () => useContext(ThemeContext);