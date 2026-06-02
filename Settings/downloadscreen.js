import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';

// Theme & Language
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const MY_API_SERVER = "http://127.0.0.1:10000";

// সময় ক্যালকুলেট করার ফাংশন
const timeAgoBn = (timestamp) => {
  if (!timestamp) return "";
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  if (isNaN(past)) return timestamp; // যদি পুরানো স্ট্রিং ডেট থাকে

  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "এইমাত্র";
  if (diffMins < 60) return `${diffMins} মিনিট পূর্বে`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ঘন্টা পূর্বে`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} দিন পূর্বে`;
};

export default function DownloadScreen({ navigation }) {
  const [downloads, setDownloads] = useState([]);
  const isFocused = useIsFocused();
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();

  const loadDownloads = async () => {
    try {
      const data = await AsyncStorage.getItem('recorded_downloads');
      if (data) {
          let parsed = JSON.parse(data);
          parsed = parsed.filter(item => item && item.id && item.title);
          setDownloads(parsed);
          await AsyncStorage.setItem('recorded_downloads', JSON.stringify(parsed));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isFocused) loadDownloads();
  }, [isFocused]);

  useEffect(() => {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${MY_API_SERVER}/api/progress`);
            const data = await res.json();
            const active = data.activeDownloads || {};

            setDownloads(prevDownloads => {
                let needsSave = false;
                let updatedList = [...prevDownloads];

                Object.keys(active).forEach(id => {
                    const activeItem = active[id];
                    const existsIndex = updatedList.findIndex(d => d.id === id);

                    if (existsIndex === -1 && activeItem.status !== 'error') {
                        updatedList.unshift({
                            id: id, 
                            videoId: activeItem.videoId, 
                            title: activeItem.title || 'Downloading...', 
                            thumbnail: activeItem.thumbnail, 
                            quality: activeItem.quality, 
                            type: activeItem.type, 
                            date: Date.now(), // সময় স্ট্যাম্প সেট করা হচ্ছে
                            progress: activeItem.progress || '0', 
                            speed: activeItem.speed || '0 KB/s',
                            eta: activeItem.eta || '--:--',
                            isCompleted: activeItem.status === 'completed', 
                            localUri: activeItem.localUrl || null
                        });
                        needsSave = true;
                    } else if (existsIndex !== -1) {
                        const item = updatedList[existsIndex];
                        if (activeItem.status === 'completed' && !item.isCompleted) {
                            item.progress = '100';
                            item.isCompleted = true;
                            item.localUri = activeItem.localUrl;
                            item.date = Date.now(); // সম্পন্ন হওয়ার সময়
                            needsSave = true;
                            fetch(`${MY_API_SERVER}/api/clear-progress?id=${id}`); 
                        } else if (activeItem.status === 'error' && !item.isError) {
                            item.isError = true;
                            needsSave = true;
                        } else {
                            if (item.progress !== activeItem.progress || item.speed !== activeItem.speed || item.eta !== activeItem.eta) {
                                item.progress = activeItem.progress;
                                item.speed = activeItem.speed;
                                item.eta = activeItem.eta;
                                // স্টেট আপডেটের জন্য
                                updatedList[existsIndex] = { ...item }; 
                            }
                        }
                    }
                });

                if (needsSave) {
                    AsyncStorage.setItem('recorded_downloads', JSON.stringify(updatedList));
                }
                return updatedList;
            });
        } catch(e) {}
    }, 1000); 

    return () => clearInterval(interval);
  }, []);

  const deleteDownload = async (id) => {
    Alert.alert("মুছে ফেলুন", "আপনি কি এই ডাউনলোডের রেকর্ডটি মুছে ফেলতে চান?", [
      { text: "না", style: "cancel" },
      { text: "হ্যাঁ", onPress: async () => {
          const newList = downloads.filter(item => item.id !== id);
          setDownloads(newList);
          await AsyncStorage.setItem('recorded_downloads', JSON.stringify(newList));
        }
      }
    ]);
  };

  const cancelActiveDownload = async (id) => {
    Alert.alert("confirm to delete permanently", "আপনি কি এই চলমান ডাউনলোডটি বাতিল করতে চান?", [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: async () => {
          try {
             await fetch(`${MY_API_SERVER}/api/cancel-download?id=${id}`);
             const newList = downloads.filter(item => item.id !== id);
             setDownloads(newList);
             await AsyncStorage.setItem('recorded_downloads', JSON.stringify(newList));
          } catch(e) {}
        }
      }
    ]);
  };

  const handlePlayVideo = (item) => {
    if (!item.isCompleted) return;
    try {
      navigation.navigate('Player', {
        videoId: item.videoId,
        videoData: { id: item.videoId, title: item.title, channel: 'Downloaded File', thumbnail: item.thumbnail, localUri: item.localUri, type: item.type }
      });
    } catch (error) {}
  };

  const activeDownloads = downloads.filter(d => !d.isCompleted && !d.isError);
  const completedDownloads = downloads.filter(d => d.isCompleted);

  const renderActiveItem = ({ item }) => (
    <View style={styles.activeCard}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.metaSpeed}>
          স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}
        </Text>
        <Text style={styles.metaPercentage}>ডাউনলোড হচ্ছে... {item.progress || 0}%</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${item.progress || 0}%` }]} />
        </View>
      </View>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelActiveDownload(item.id)}>
        <Ionicons name="close" size={28} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} activeOpacity={0.8} onPress={() => handlePlayVideo(item)}>
        
        {/* অডিও হলে হাফ থাম্বনেইল এবং হাফ আইকন */}
        {item.type === 'audio' ? (
           <View style={styles.splitThumbContainer}>
              <Image source={{ uri: item.thumbnail }} style={styles.halfThumb} />
              <View style={styles.halfIcon}>
                 <Ionicons name="musical-notes" size={30} color="#00BFA5" />
              </View>
           </View>
        ) : (
           <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        )}

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.meta}>{item.quality} • {item.type?.toUpperCase()} • {timeAgoBn(item.date)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDownload(item.id)}>
        <Ionicons name="trash-outline" size={22} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F0F0F' : '#F9F9F9' }]}>
      <StatusBar backgroundColor={isDarkMode ? '#0F0F0F' : '#FFFFFF'} barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#000' }]}>{t('download') || 'ডাউনলোডসমূহ'}</Text>
      </View>

      <FlatList 
        data={completedDownloads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          activeDownloads.length > 0 ? (
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.sectionTitle}>চলমান ডাউনলোড ({activeDownloads.length})</Text>
              {activeDownloads.map(item => <React.Fragment key={item.id}>{renderActiveItem({ item })}</React.Fragment>)}
              <View style={styles.divider} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          activeDownloads.length === 0 && completedDownloads.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="download-outline" size={80} color="#333" />
              <Text style={styles.emptyText}>{__translate('কোনো ডাউনলোড পাওয়া যায়নি')}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 10 },
  sectionTitle: { color: '#00BFA5', fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  activeCard: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center', borderColor: '#00BFA5', borderWidth: 1 },
  cancelBtn: { paddingLeft: 10 },
  card: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 10, marginBottom: 12, overflow: 'hidden', alignItems: 'center' },
  cardMain: { flex: 1, flexDirection: 'row', padding: 10 },
  thumb: { width: 120, height: 68, borderRadius: 6, backgroundColor: '#333' },
  
  // অডিওর হাফ থাম্বনেইল স্টাইল
  splitThumbContainer: { width: 120, height: 68, borderRadius: 6, backgroundColor: '#222', flexDirection: 'row', overflow: 'hidden' },
  halfThumb: { width: '50%', height: '100%', backgroundColor: '#333' },
  halfIcon: { width: '50%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  metaSpeed: { color: '#00BFA5', fontSize: 11, marginBottom: 2, fontWeight: 'bold' },
  metaPercentage: { color: '#AAA', fontSize: 11, marginBottom: 5 },
  meta: { color: '#AAA', fontSize: 12, marginBottom: 5 },
  progressBarBg: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden', width: '100%', marginTop: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#00BFA5' },
  deleteBtn: { padding: 15 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  empty: { flex: 1, marginTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#555', fontSize: 16, marginTop: 15 }
});