import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, DeviceEventEmitter, Alert, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';

// 🚨 লজিক প্রসেস করার জন্য আমাদের তৈরি করা ফাইলটি ইমপোর্ট করা হলো
import { processExtractedData } from '../VideoProcessor'; 

export default function GlobalDownloadOverlay() {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(isDarkMode);

  const [downloadRequests, setDownloadRequests] = useState([]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('triggerDownloadOverlay', (data) => {
      if (!data || !data.videoId) return;
      const id = Date.now().toString();
      const request = {
        id,
        videoData: { title: data.title || '', thumbnail: data.thumbnail || null, videoId: data.videoId },
        step: 'fetching',
        downloadType: data.type || 'video',
        downloadLinks: []
      };
      setDownloadRequests(prev => [request, ...prev]);
      fetchDownloadLinks(id, request.videoData.videoId, request.downloadType);
    });
    return () => sub.remove();
  }, []);

  const removeRequest = (id) => setDownloadRequests(prev => prev.filter(r => r.id !== id));

  const fetchDownloadLinks = async (id, videoId, type = 'video') => {
    try {
      const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // 🚨 লোকাল সার্ভারের বদলে সরাসরি নেটিভ ইঞ্জিন কল করা হচ্ছে
      const rawJsonString = await NativeModules.YtDlpModule.extractVideoInfo(targetUrl);
      
      // 🚨 VideoProcessor দিয়ে কাঁচা ডেটাকে সুন্দর এবং সাজানো হচ্ছে
      const data = processExtractedData(rawJsonString, type === 'audio' ? 'audio' : 'download');

      setDownloadRequests(prev => prev.map(r => r.id === id ? { 
          ...r, 
          downloadLinks: (type === 'audio' ? data.availableAudio : data.availableLinks) || [], 
          step: 'list' 
      } : r));

    } catch (e) {
      console.error("Extraction Error:", e);
      setDownloadRequests(prev => prev.map(r => r.id === id ? { ...r, downloadLinks: [], step: 'list' } : r));
    }
  };

  const changeDownloadType = (id, type) => {
    setDownloadRequests(prev => prev.map(r => r.id === id ? { ...r, downloadType: type, step: 'fetching' } : r));
    const req = downloadRequests.find(r => r.id === id);
    const vid = req?.videoData?.videoId;
    if (vid) fetchDownloadLinks(id, vid, type);
  };

  const getSortedLinks = (links) => {
    if (!links) return [];
    return [...links].sort((a, b) => {
      const valA = parseInt(String(a.quality).replace(/[^0-9]/g, '')) || 0;
      const valB = parseInt(String(b.quality).replace(/[^0-9]/g, '')) || 0;
      return valA - valB;
    });
  };

  const formatQualityText = (text) => {
    if (!text) return '';
    return String(text).replace(/(\d+)p/, (match, heightStr) => {
      const height = parseInt(heightStr);
      if (height >= 1000) {
        if (height === 1440) return '2K';
        if (height === 2160) return '4K';
        return (height / 1000).toFixed(1) + 'K';
      }
      return match;
    });
  };

  const handleDownloadExecute = async (id, item) => {
    try {
      const req = downloadRequests.find(r => r.id === id);
      if (!req) return;
      const { videoData, downloadType } = req;
      const downloadId = Date.now().toString();

      // 🚨 সার্ভারে API কলের বদলে আমরা সরাসরি Download Manager-কে ইভেন্ট/সিগন্যাল পাঠাচ্ছি
      DeviceEventEmitter.emit('startNativeDownload', {
          id: downloadId,
          videoId: videoData.videoId,
          title: videoData.title || 'Unknown Video',
          thumbnail: videoData.thumbnail || `https://i.ytimg.com/vi/${videoData.videoId}/hqdefault.jpg`,
          url: item.url, // 👈 yt-dlp থেকে বের করা ডাইরেক্ট ডাউনলোড লিংক
          quality: item.quality,
          type: downloadType,
          ext: item.ext || (downloadType === 'video' ? 'mp4' : 'm4a')
      });

    } catch (e) {
      Alert.alert('Error', 'ডাউনলোড শুরু করতে সমস্যা হচ্ছে।');
    } finally {
      removeRequest(id);
    }
  };

  if (!downloadRequests || downloadRequests.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      {downloadRequests.map((req, idx) => (
        <View key={req.id} style={[styles.card, { bottom: 10 + idx * 10 }]}> 
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1}>{req.videoData?.title || 'Unknown'}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => removeRequest(req.id)}>
              <Ionicons name="close" size={18} color={isDarkMode ? '#FFF' : '#111'} />
            </TouchableOpacity>
          </View>

          {req.step === 'fetching' ? (
            <View style={styles.fetchingArea}>
              <ActivityIndicator size="small" color="#00BFA5" />
              <Text style={styles.fetchingText}>{t('Fetching links...')}</Text>
            </View>
          ) : (
            <View>
              <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tabButton, req.downloadType === 'video' && styles.activeTabButton]} onPress={() => changeDownloadType(req.id, 'video')}>
                  <Ionicons name="videocam" size={14} color={req.downloadType === 'video' ? '#FFF' : '#888'} />
                  <Text style={[styles.tabText, req.downloadType === 'video' && styles.activeTabText]}>{t('Video')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, req.downloadType === 'audio' && styles.activeTabButton]} onPress={() => changeDownloadType(req.id, 'audio')}>
                  <Ionicons name="musical-notes" size={14} color={req.downloadType === 'audio' ? '#FFF' : '#888'} />
                  <Text style={[styles.tabText, req.downloadType === 'audio' && styles.activeTabText]}>{t('Audio')}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.qualityList} contentContainerStyle={{ paddingBottom: 8 }}>
                {getSortedLinks(req.downloadLinks).map((item, index) => (
                  <TouchableOpacity key={index} style={styles.qualityCard} onPress={() => handleDownloadExecute(req.id, item)}>
                    <View style={styles.qualityLeft}>
                      <View style={styles.qualityIconBg}><Ionicons name={req.downloadType === 'audio' ? 'headset' : 'videocam'} size={16} color="#00BFA5" /></View>
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.qualityText}>{formatQualityText(item.quality)}</Text>
                        <Text style={styles.qualitySubText}>{item.filesize || item.size || (req.downloadType === 'video' ? 'MP4' : 'MP3')}</Text>
                      </View>
                    </View>
                    <View style={styles.downloadIconBtn}><Ionicons name="download-outline" size={16} color="#00BFA5" /></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  wrapper: { position: 'absolute', right: 10, bottom: 60, zIndex: 9999, width: 280, alignItems: 'flex-end', pointerEvents: 'box-none' },
  card: { width: 260, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderRadius: 12, padding: 10, marginBottom: 10, elevation: 10, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: isDark ? '#FFF' : '#111', fontWeight: 'bold', flex: 1, marginRight: 8 },
  closeBtn: { padding: 6, marginLeft: 8, backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', borderRadius: 12 },
  fetchingArea: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  fetchingText: { marginLeft: 8, color: isDark ? '#AAA' : '#666' },
  tabContainer: { flexDirection: 'row', backgroundColor: isDark ? '#111' : '#F0F0F0', borderRadius: 10, padding: 3, marginTop: 10, marginBottom: 8 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  activeTabButton: { backgroundColor: isDark ? '#2A2A2A' : '#e6e6e6' },
  tabText: { color: isDark ? '#888' : '#666', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  activeTabText: { color: isDark ? '#FFF' : '#111' },
  qualityList: { maxHeight: 220 },
  qualityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDark ? '#282828' : '#FFFFFF', padding: 8, borderRadius: 10, marginBottom: 8 },
  qualityLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  qualityIconBg: { backgroundColor: 'rgba(0, 191, 165, 0.1)', padding: 6, borderRadius: 8 },
  qualityText: { color: isDark ? '#FFF' : '#111', fontSize: 13, fontWeight: 'bold' },
  qualitySubText: { color: isDark ? '#888' : '#666', fontSize: 11, marginTop: 2 },
  downloadIconBtn: { padding: 6 }
});