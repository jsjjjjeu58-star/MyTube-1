import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, Text, Image, LogBox, Modal, BackHandler, Share, TouchableWithoutFeedback } from 'react-native';
import { Video, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider'; // [NEW] Slider যুক্ত করা হলো

LogBox.ignoreLogs([
    '[expo-av] Expo AV has been deprecated',
    '[expo-av]: Video component from `expo-av` is deprecated',
    'Video component from `expo-av` is deprecated'
]);

const { width, height } = Dimensions.get('window');
const PLAYER_HEIGHT = (width * 9) / 16;
const MINI_WIDTH = width * 0.45;
const MINI_HEIGHT = (MINI_WIDTH * 9) / 16;
const MY_API_SERVER = "http://127.0.0.1:10000"; 

export default function GlobalPlayer() {
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const syncAudioRef = useRef(new Audio.Sound()); 

  const seekPosRef = useRef(0);
  const currentVideoIdRef = useRef(null);
  const isLocalRef = useRef(false);
  const fetchIdRef = useRef(0); 

  // [NEW] ডাবল ট্যাপ ডিটেক্ট করার জন্য Ref
  const lastTapRef = useRef({ time: 0, side: '' });

  const [playerState, setPlayerState] = useState('hidden'); 
  const [videoData, setVideoData] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamMode, setStreamMode] = useState('combined'); 
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [videoKey, setVideoKey] = useState(Date.now().toString());

  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    const backAction = () => {
      if (playerState === 'full') {
        setPlayerState('mini');
        navigation.navigate('Home'); 
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [playerState]);

  const setBackgroundAudio = async (enable) => {
    try {
        await Audio.setAudioModeAsync({
            staysActiveInBackground: enable,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
        });
    } catch (e) {}
  };

  const fetchStreamUrl = async (vidId, targetQuality, fetchId) => {
    try {
      const numQ = targetQuality ? targetQuality.toString().replace(/\D/g, '') : '720';
      const apiUrl = `${MY_API_SERVER}/api/extract?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vidId}`)}&quality=${numQ}&merge=true`;
      const res = await fetch(apiUrl);
      const json = await res.json();

      if (fetchId !== fetchIdRef.current) return;

      if (json.success && json.url) {
          setStreamMode(json.streamType || 'combined');
          setStreamUrl(json.url);

          if (json.streamType === 'separate' && json.audioUrl) {
              await syncAudioRef.current.unloadAsync().catch(()=>{});
              await syncAudioRef.current.loadAsync({ uri: json.audioUrl }, { shouldPlay: isPlaying, positionMillis: seekPosRef.current }).catch(() => {});
          }
          setIsPlaying(true);
      }
    } catch(e) { console.log("Connection Error"); }
  };

  const handlePlaybackStatusUpdate = async (status) => {
    if (status.isLoaded) {
        setCurrentTime(status.positionMillis);
        if (status.durationMillis) setDuration(status.durationMillis);

        if (streamMode === 'separate' && !isAudioMode) {
            try {
                const audioStatus = await syncAudioRef.current.getStatusAsync();
                if (audioStatus.isLoaded) {
                    if (status.isPlaying && !audioStatus.isPlaying) await syncAudioRef.current.playAsync();
                    if (!status.isPlaying && audioStatus.isPlaying) await syncAudioRef.current.pauseAsync();
                    if (Math.abs(status.positionMillis - audioStatus.positionMillis) > 600) {
                        await syncAudioRef.current.setPositionAsync(status.positionMillis);
                    }
                }
            } catch(e) {}
        }
    }
  };

  useEffect(() => {
    const playSub = DeviceEventEmitter.addListener('playVideo', async (data) => {
      fetchIdRef.current = Date.now(); 
      const currentFetchId = fetchIdRef.current;
      
      if (videoRef.current) await videoRef.current.unloadAsync().catch(()=>{});
      await syncAudioRef.current.unloadAsync().catch(()=>{});

      currentVideoIdRef.current = data.videoId;
      isLocalRef.current = !!(data.videoData && data.videoData.localUri);
      setVideoData(data.videoData);
      setPlayerState('full'); 
      setStreamUrl(null);
      setIsAudioMode(false);
      setBackgroundAudio(false);
      setVideoKey(Date.now().toString());
      seekPosRef.current = 0;
      setCurrentTime(0);
      setDuration(0);

      if (isLocalRef.current) {
          setStreamMode('combined');
          setStreamUrl(data.videoData.localUri);
          return;
      }
      const initialQuality = global.appSettings?.normalVideo || '720p';
      fetchStreamUrl(data.videoId, initialQuality, currentFetchId);
    });

    const qualitySub = DeviceEventEmitter.addListener('qualityChanged', async (newQuality) => {
        if (currentVideoIdRef.current && !isLocalRef.current) {
            fetchIdRef.current = Date.now();
            if (videoRef.current) {
                const status = await videoRef.current.getStatusAsync();
                seekPosRef.current = status.positionMillis || 0;
                await videoRef.current.pauseAsync();
            }
            setStreamUrl(null);
            setVideoKey(Date.now().toString());
            fetchStreamUrl(currentVideoIdRef.current, newQuality, fetchIdRef.current);
        }
    });

    return () => { playSub.remove(); qualitySub.remove(); };
  }, [streamMode]);

  const changeSpeed = async (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) await videoRef.current.setRateAsync(speed, true);
    if (syncAudioRef.current) await syncAudioRef.current.setRateAsync(speed, true);
    setShowSpeedModal(false);
  };

  const handleShare = async () => {
    try {
      if (currentVideoIdRef.current) {
        await Share.share({
          message: `Check out this amazing video! https://www.youtube.com/watch?v=${currentVideoIdRef.current}`,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const closePlayer = async () => {
    fetchIdRef.current = Date.now(); 
    currentVideoIdRef.current = null;
    await setBackgroundAudio(false);
    if (videoRef.current) await videoRef.current.unloadAsync().catch(()=>{});
    if (syncAudioRef.current) await syncAudioRef.current.unloadAsync().catch(()=>{});
    setPlayerState('hidden'); 
    setStreamUrl(null);
    setIsPlaying(false);
  };

  // [NEW] ১০ সেকেন্ড স্কিপ করার লজিক
  const skipVideo = async (amount) => {
    if (videoRef.current && duration > 0) {
        let newPosition = currentTime + amount;
        if (newPosition < 0) newPosition = 0;
        if (newPosition > duration) newPosition = duration;
        await videoRef.current.setPositionAsync(newPosition);
        setCurrentTime(newPosition);
    }
  };

  // [NEW] ডাবল ট্যাপ ডিটেকশন
  const handleVideoTap = (side) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ৩০০ মিলি সেকেন্ডের মধ্যে ২ বার ট্যাপ করলে কাজ করবে
    
    if (lastTapRef.current.side === side && now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
        // ডাবল ট্যাপ হয়েছে! (right = +10s, left = -10s)
        skipVideo(side === 'right' ? 10000 : -10000);
        lastTapRef.current = { time: 0, side: '' }; // রিসেট
    } else {
        // সিঙ্গেল ট্যাপ
        lastTapRef.current = { time: now, side };
    }
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false, 
    onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
    },
    onPanResponderGrant: () => { pan.setOffset({ x: pan.x._value, y: pan.y._value }); pan.setValue({ x: 0, y: 0 }); },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => {
      pan.flattenOffset();
      let x = pan.x._value, y = pan.y._value;
      if (x > 10) x = 10; if (x < -(width - MINI_WIDTH - 20)) x = -(width - MINI_WIDTH - 20);
      if (y > 20) y = 20; if (y < -(height - MINI_HEIGHT - 120)) y = -(height - MINI_HEIGHT - 120);
      Animated.spring(pan, { toValue: { x, y }, friction: 6, useNativeDriver: false }).start();
    }
  })).current;

  const formatTime = (millis) => {
    if (!millis) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (playerState === 'hidden') return null;
  const isFull = playerState === 'full';

  return (
     <Animated.View style={[isFull ? styles.fullContainer : styles.miniContainer, !isFull && { transform: pan.getTranslateTransform() }]} {...(isFull ? {} : panResponder.panHandlers)}>
        <View style={styles.videoWrapper}>
            {streamUrl && (
                <Video 
                    key={videoKey}
                    ref={videoRef} 
                    source={(isAudioMode && streamMode === 'separate') ? null : { uri: streamUrl }} 
                    style={styles.video} 
                    shouldPlay={isPlaying} 
                    positionMillis={seekPosRef.current}
                    isMuted={streamMode === 'separate'}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    useNativeControls={false} 
                    resizeMode="contain" 
                />
            )}

            {/* [NEW] Double Tap Overlay for Seeking */}
            {isFull && (
                <View style={styles.doubleTapOverlay}>
                    <TouchableWithoutFeedback onPress={() => handleVideoTap('left')}>
                        <View style={styles.halfScreen} />
                    </TouchableWithoutFeedback>
                    <TouchableWithoutFeedback onPress={() => handleVideoTap('right')}>
                        <View style={styles.halfScreen} />
                    </TouchableWithoutFeedback>
                </View>
            )}

            {isFull && (
                <TouchableOpacity style={styles.backBtn} onPress={() => { setPlayerState('mini'); navigation.navigate('Home'); }}>
                    <Ionicons name="chevron-down" size={30} color="#FFF" />
                </TouchableOpacity>
            )}

            {isFull && (
                <View style={styles.topRightControls}>
                    <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                        <Ionicons name="share-social" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSpeedModal(true)} style={styles.iconBtn}>
                        <Ionicons name="speedometer" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* [NEW] Pro Level Floating Controls with Native Slider */}
            {isFull && (
                <View style={styles.customControlsContainer}>
                    <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#FFF" />
                    </TouchableOpacity>
                    
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={duration > 0 ? duration : 1}
                        value={currentTime}
                        onSlidingComplete={async (value) => {
                            if (videoRef.current) {
                                await videoRef.current.setPositionAsync(value);
                                setCurrentTime(value);
                            }
                        }}
                        minimumTrackTintColor="#FF0000"
                        maximumTrackTintColor="rgba(255, 255, 255, 0.4)"
                        thumbTintColor="#FFF"
                    />

                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
            )}

            {!isFull && (
                <TouchableOpacity 
                    activeOpacity={0.9}
                    style={styles.miniTouchableArea} 
                    onPress={() => {
                        if (videoData) {
                            navigation.navigate('Player', { videoId: currentVideoIdRef.current, videoData });
                            setPlayerState('full');
                        }
                    }}>
                    <TouchableOpacity onPress={closePlayer} style={styles.miniCloseBtn}>
                        <Ionicons name="close-circle" size={28} color="#FFF" />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
        </View>

        <Modal visible={showSpeedModal} transparent animationType="fade">
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSpeedModal(false)}>
                <TouchableOpacity activeOpacity={1} style={styles.settingsMenu}>
                    <Text style={styles.modalTitle}>Select Speed</Text>
                    {[0.25, 0.5, 1.0, 1.5, 2.0].map(s => (
                        <TouchableOpacity key={s} style={styles.menuItem} onPress={() => changeSpeed(s)}>
                            <Text style={[styles.menuText, playbackSpeed === s && {color: '#FF0000'}]}>
                                {s === 1.0 ? 'Normal' : s + 'x'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
     </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { position: 'absolute', top: 55, left: 0, width: width, height: PLAYER_HEIGHT, zIndex: 9999, backgroundColor: '#000' },
  miniContainer: { position: 'absolute', bottom: 80, right: 15, width: MINI_WIDTH, height: MINI_HEIGHT, backgroundColor: '#000', zIndex: 9999, borderRadius: 12, overflow: 'hidden', elevation: 15, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5 },
  videoWrapper: { flex: 1, position: 'relative' },
  video: { width: '100%', height: '100%' },
  
  /* Double Tap Overlay */
  doubleTapOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', zIndex: 10 },
  halfScreen: { flex: 1, height: '100%', backgroundColor: 'transparent' },

  backBtn: { position: 'absolute', top: 10, left: 10, zIndex: 100, padding: 5 },
  
  topRightControls: { position: 'absolute', top: 10, right: 10, zIndex: 100, flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 15, padding: 5 },

  /* Pro Level Custom Controls & Slider */
  customControlsContainer: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20, 20, 20, 0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, elevation: 5, zIndex: 50 },
  timeText: { color: '#FFF', fontSize: 12, marginHorizontal: 5, fontWeight: 'bold' },
  slider: { flex: 1, height: 30, marginHorizontal: 5 },

  miniTouchableArea: { flex: 1, width: '100%', height: '100%', position: 'absolute', zIndex: 50 },
  miniCloseBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  settingsMenu: { width: 220, backgroundColor: '#1A1A1A', borderRadius: 15, padding: 15, elevation: 10 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  menuText: { color: '#FFF', fontSize: 16 }
});