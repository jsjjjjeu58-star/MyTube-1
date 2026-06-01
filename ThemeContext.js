import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar'; // [NEW] সিস্টেম বার কন্ট্রোলার

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // সিস্টেম নেভিগেশন বারের কালার আপডেট করার ফাংশন
  const updateSystemNav = async (isDark) => {
    if (Platform.OS === 'android') {
      try {
        // ডার্ক মোডে বটম ট্যাবের কালারের (#0a0a0a) সাথে ম্যাচ করানো হয়েছে
        await NavigationBar.setBackgroundColorAsync(isDark ? '#0a0a0a' : '#FFFFFF');
        // ডার্ক মোডে বাটনগুলো সাদা (light) এবং লাইট মোডে কালো (dark) হবে
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      } catch (error) {
        console.log("Nav bar error:", error);
      }
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme !== null) {
          const isDark = savedTheme === 'dark';
          setIsDarkMode(isDark);
          updateSystemNav(isDark); // অ্যাপ চালুর সময় কালার সেট হবে
        } else {
          updateSystemNav(true); // ডিফল্ট ডার্ক
        }
      } catch (e) {}
    };
    loadTheme();
  }, []);

  const toggleDarkMode = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    updateSystemNav(newTheme); // সুইচ চাপার সাথে সাথে কালার পাল্টাবে
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);