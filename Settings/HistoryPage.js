import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme & Language Context
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';

export default function HistoryPage() {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = getDynamicStyles(isDarkMode);
  
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // পেজে প্রবেশ করার সাথে সাথে ডেটাবেস থেকে হিস্টোরি লোড করা হবে
  useEffect(() => {
    if (isFocused) {
      loadHistory();
    }
  }, [isFocused]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const storedHistory = await AsyncStorage.getItem('userHistory');
      if (storedHistory) {
        setHistoryData(JSON.parse(storedHistory));
      } else {
        setHistoryData([]);
      }
    } catch (error) {
      console.error("History Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 ১. সম্পূর্ণ হিস্টোরি একসাথে ক্লিয়ার করার ফাংশন (Bulk Delete)
  const clearAllHistory = () => {
    Alert.alert(
      t('Clear History'),
      t('Are you sure you want to delete all watch history?'),
      [
        { text: t('Cancel'), style: "cancel" },
        { 
          text: t('Yes, Delete'), 
          onPress: async () => {
            try {
              // স্টোরেজ থেকে পুরো Key রিমুভ করা হচ্ছে ($O(1)$ Time)
              await AsyncStorage.removeItem('userHistory');
              setHistoryData([]);
            } catch (e) { console.error(e); }
          },
          style: "destructive"
        }
      ]
    );
  };

  // 🎯 ২. একটি একটি করে হিস্টোরি ক্লিয়ার করার ফাংশন (Single Delete)
  const deleteSingleVideo = async (videoId) => {
    try {
      // Filter মেথড ব্যবহার করে ইমিউটেবল (Immutable) ডেটা আপডেট
      const updatedHistory = historyData.filter(item => item.id !== videoId);
      setHistoryData(updatedHistory);
      // আপডেট করা ডেটা পুনরায় ডেটাবেসে সেভ করা হচ্ছে
      await AsyncStorage.setItem('userHistory', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Delete Error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <StatusBar 
        hidden={false} 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={isDarkMode ? '#0F0F0F' : '#F9F9F9'} 
      />

      <View style={styles.logoRow}>
        <Ionicons name="logo-youtube" size={32} color="#FF0000" />
        <Text style={styles.logoText}>MyTube</Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconPadding}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFF' : '#000'} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('history') || 'Watch History'}</Text>
        
        {/* 🚨 সম্পূর্ণ ডিলিট করার আইকন (Trash Icon) - হেডার বারে থাকবে */}
        {historyData.length > 0 && (
          <TouchableOpacity onPress={clearAllHistory} style={styles.iconPadding}>
            <Ionicons name="trash-outline" size={24} color="#FF4444" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF0000" />
        </View>
      ) : historyData.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="time-outline" size={64} color="#333" />
          <Text style={styles.emptyText}>{t('You have no watch history yet.')}</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.historyCard}
              onPress={() => navigation.navigate('Player', { videoId: item.id, videoData: item })}
            >
              <Image 
                source={{ uri: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg` }} 
                style={styles.thumbnail} 
              />
              
              <View style={styles.infoContainer}>
                <Text style={styles.title} numberOfLines={2}>{item.title || 'Unknown Title'}</Text>
                <Text style={styles.meta}>
                  <Ionicons name="calendar-outline" size={12} color={isDarkMode ? '#AAA' : '#555'} /> {item.date || 'Unknown Date'}  •  {item.channel}
                </Text>
                <Text style={styles.linkText} numberOfLines={1}>
                  Link: https://youtube.com/watch?v={item.id}
                </Text>
              </View>
              
              {/* 🚨 সিঙ্গেল ডিলিট করার আইকন (Close Circle) - প্রতিটি ভিডিওর পাশে থাকবে */}
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={() => deleteSingleVideo(item.id)}
              >
                <Ionicons name="close-circle" size={24} color="#555" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function getDynamicStyles(isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F9F9F9' },
    logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#222' : '#EAEAEA' },
    logoText: { fontSize: 20, fontWeight: 'bold', marginLeft: 8, color: isDark ? '#FFF' : '#111' },
    header: { flexDirection: 'row', alignItems: 'center', height: 55, borderBottomWidth: 1, borderBottomColor: isDark ? '#222' : '#EAEAEA' },
    headerTitle: { flex: 1, color: isDark ? '#FFF' : '#000', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    iconPadding: { padding: 10 },
    historyCard: { flexDirection: 'row', padding: 15, backgroundColor: isDark ? '#1A1A1A' : '#FFF', marginBottom: 10, borderRadius: 10, alignItems: 'center' },
    thumbnail: { width: 130, height: 75, borderRadius: 8, backgroundColor: isDark ? '#222' : '#ddd', marginRight: 12 },
    infoContainer: { flex: 1, justifyContent: 'center' },
    title: { color: isDark ? '#FFF' : '#000', fontSize: 15, fontWeight: 'bold', marginBottom: 6, lineHeight: 20 },
    meta: { color: isDark ? '#AAA' : '#666', fontSize: 13, marginBottom: 4 },
    linkText: { color: '#3EA6FF', fontSize: 12, fontStyle: 'italic' },
    deleteBtn: { paddingLeft: 10 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: isDark ? '#888' : '#666', marginTop: 10, fontSize: 16 },
    listPadding: { padding: 10 }
  });
}