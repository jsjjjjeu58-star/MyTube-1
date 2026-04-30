import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const DESKTOP_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MicroFetchVideoCard = ({ videoId }) => {
  const [info, setInfo] = useState({ loading: true, title: 'তথ্য আনা হচ্ছে...', thumbnail: null, publishedText: '', lengthText: '', viewCount: '', error: false });

  useEffect(() => {
    let isMounted = true;
    
    const fetchVideoInfo = async () => {
      try {
        // ইউটিউবের InnerTube API তে একটি রিকোয়েস্ট পাঠিয়ে আমরা ভিডিওর বেসিক তথ্য আনছি
        const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': DESKTOP_AGENT },
          body: JSON.stringify({
            context: { client: { clientName: 'WEB', clientVersion: '2.20231214.00.00' } },
            videoId: videoId
          })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (isMounted) {
          const videoDetails = data?.videoDetails || {};
          const microformat = data?.microformat?.playerMicroformatRenderer || {};
          
          setInfo({ 
            loading: false, 
            title: videoDetails.title || 'টাইটেল পাওয়া যায়নি',
            thumbnail: videoDetails.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            publishedText: microformat.publishDate ? new Date(microformat.publishDate).toLocaleDateString() : 'অজানা',
            lengthText: videoDetails.lengthSeconds ? `${Math.floor(videoDetails.lengthSeconds / 60)}:${videoDetails.lengthSeconds % 60}` : 'অজানা',
            viewCount: videoDetails.viewCount || 'অজানা',
            error: false 
          });
        }
      } catch (error) {
        if (isMounted) {
          setInfo({ loading: false, title: 'তথ্য পাওয়া যায়নি', error: true });
        }
      }
    };

    fetchVideoInfo();

    return () => { isMounted = false; };
  }, [videoId]);

  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={0.8}>
      {info.loading ? (
         <View style={styles.thumbnailContainer}>
            <ActivityIndicator size="small" color="#FFD700" />
         </View>
      ) : (
         <View style={styles.thumbnailContainer}>
             <Image source={{ uri: info.thumbnail }} style={styles.thumbnailImage} />
             {info.lengthText ? <Text style={styles.durationBadge}>{info.lengthText}</Text> : null}
         </View>
      )}
      
      <View style={styles.videoInfoContainer}>
        {info.loading ? (
            <Text style={{ color: '#FFD700' }}>ইন্টারনেট থেকে তথ্য খুঁজছে...</Text>
        ) : (
            <>
                <Text style={styles.videoTitle} numberOfLines={2}>{info.title}</Text>
                <Text style={styles.videoMeta}>
                   👁️ {info.viewCount} ভিউ • 📅 {info.publishedText}
                </Text>
            </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function ChannelScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { channelData = {}, channelName: paramChannelName, channelUrl: paramChannelUrl } = route.params || {};
  const channelName = channelData?.channel || paramChannelName || 'YouTube Channel';

  const [loading, setLoading] = useState(true);
  const [videoIds, setVideoIds] = useState([]);

  useEffect(() => {
    fetchChannelVideoIds();
  }, [channelName]);

  const fetchChannelVideoIds = async () => {
    setLoading(true);
    try {
      let url = paramChannelUrl || channelData?.channelUrl || null;

      if (!url) {
          const searchResponse = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`, { headers: { 'User-Agent': DESKTOP_AGENT } });
          const searchHtml = await searchResponse.text();
          let match = searchHtml.match(/ytInitialData\s*=\s*({.+?});/) || searchHtml.match(/var ytInitialData\s*=\s*(.*?);<\/script>/);
          
          if (match && match[1]) {
             const searchData = JSON.parse(match[1]);
             const findUrl = (node) => {
               if (url) return;
               if (node?.channelRenderer?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url) url = node.channelRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url;
               else if (node && typeof node === 'object') Object.values(node).forEach(findUrl);
             };
             findUrl(searchData);
          }
      }

      if (!url) {
        setLoading(false);
        return; 
      }

      const [videosRes, homeRes] = await Promise.all([
        fetch(`https://www.youtube.com${url}/videos`, { headers: { 'User-Agent': DESKTOP_AGENT } }),
        fetch(`https://www.youtube.com${url}`, { headers: { 'User-Agent': DESKTOP_AGENT } })
      ]);

      const videosHtml = await videosRes.text();
      const homeHtml = await homeRes.text();

      const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const ids = new Set(); 

      let match;
      while ((match = regex.exec(videosHtml)) !== null) {
          ids.add(match[1]);
      }
      
      if (ids.size === 0) {
          while ((match = regex.exec(homeHtml)) !== null) {
              ids.add(match[1]);
          }
      }

      setVideoIds(Array.from(ids));

    } catch (error) {
      console.error("Error fetching IDs:", error);
    } finally { 
      setLoading(false); 
    }
  };

  const renderEmptyComponent = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>কোনো ভিডিও লিংক পাওয়া যায়নি</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F0F0F" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
           <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{channelName}</Text>
      </View>
      
      {loading ? (
        <View style={{ padding: 50, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
           <ActivityIndicator size="large" color="#FF0000" />
           <Text style={{ color: '#FFF', marginTop: 10 }}>লিংক স্ক্যান করা হচ্ছে...</Text>
        </View>
      ) : (
        <FlatList 
          keyExtractor={(item, index) => item + index.toString()} 
          data={videoIds} 
          renderItem={({ item }) => <MicroFetchVideoCard videoId={item} />} 
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerIcon: { padding: 10 },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 5 },
  
  videoCard: { marginBottom: 20 },
  thumbnailContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  durationBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.8)', color: '#FFF', fontSize: 12, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontWeight: 'bold' },
  videoInfoContainer: { paddingHorizontal: 12, paddingTop: 10 },
  videoTitle: { color: '#FFF', fontSize: 15, fontWeight: '500', marginBottom: 4, lineHeight: 22 },
  videoMeta: { color: '#AAA', fontSize: 13 },
  
  emptyStateContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyStateText: { color: '#AAA', fontSize: 16, fontWeight: 'bold' }
});