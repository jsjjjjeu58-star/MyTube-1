/**
 * PlayerScreen.js Integration Guide
 * 
 * YtdlpModule ব্যবহার করে ভিডিও স্ট্রিম URL পাওয়ার উদাহরণ
 */

import React, { useState, useEffect } from 'react';
import { NativeModules, View, Text, ActivityIndicator } from 'react-native';

const { YtdlpModule } = NativeModules;

/**
 * ভিডিও লোড করার হুক
 */
export const useVideoLoader = (videoUrl, quality = '720') => {
  const [videoStream, setVideoStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [streamType, setStreamType] = useState(null);
  const [actualQuality, setActualQuality] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoUrl) {
      setLoading(false);
      return;
    }

    loadVideoStreams();
  }, [videoUrl, quality]);

  const loadVideoStreams = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!YtdlpModule) {
        throw new Error('YtdlpModule not available');
      }

      console.log(`🎥 লোড করছি: ${videoUrl} (Quality: ${quality})`);

      const result = await YtdlpModule.extractVideoInfo(
        videoUrl,
        quality,
        'info'
      );

      const videoData = JSON.parse(result);

      if (videoData.success) {
        setVideoStream(videoData.url);
        setAudioStream(videoData.audioUrl);
        setStreamType(videoData.streamType);
        setActualQuality(videoData.actualQuality);

        console.log('✅ ভিডিও লোড সফল!');
        console.log(`   Stream Type: ${videoData.streamType}`);
        console.log(`   Quality: ${videoData.actualQuality}`);
      } else {
        throw new Error('Video extraction failed');
      }
    } catch (err) {
      console.error('❌ ভিডিও লোড ব্যর্থ:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return {
    videoStream,
    audioStream,
    streamType,
    actualQuality,
    loading,
    error,
    retry: loadVideoStreams
  };
};

/**
 * PlayerScreen.js এর মধ্যে ব্যবহার করার উদাহরণ:
 * 
 * export default function PlayerScreen({ route, navigation }) {
 *   const { videoId, videoData = {} } = route?.params || {};
 *   const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
 * 
 *   const {
 *     videoStream,
 *     audioStream,
 *     streamType,
 *     actualQuality,
 *     loading,
 *     error,
 *     retry
 *   } = useVideoLoader(youtubeUrl, currentQuality);
 * 
 *   useEffect(() => {
 *     if (videoStream) {
 *       setVideoUrl(videoStream);
 *       setAudioUrl(audioStream);
 *       setStreamMode(streamType);
 *       setActualPlayingQuality(actualQuality);
 *     }
 *   }, [videoStream, audioStream, streamType, actualQuality]);
 * 
 *   if (loading) {
 *     return (
 *       <View style={styles.loadingContainer}>
 *         <ActivityIndicator size="large" color="#fff" />
 *         <Text>{__translate('ভিডিও লোড হচ্ছে...')}</Text>
 *       </View>
 *     );
 *   }
 * 
 *   if (error) {
 *     return (
 *       <View style={styles.errorContainer}>
 *         <Text>Error: {error}</Text>
 *         <TouchableOpacity onPress={retry}>
 *           <Text>{__translate('পুনরায় চেষ্টা করুন')}</Text>
 *         </TouchableOpacity>
 *       </View>
 *     );
 *   }
 * 
 *   // ... বাকি PlayerScreen UI
 * }
 */

export default useVideoLoader;
