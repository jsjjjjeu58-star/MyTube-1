import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, Text, LogBox, Modal, BackHandler, Share, Linking, AppState, Image, Platform, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video'; 
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'; 
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation'; 
import * as WebBrowser from 'expo-web-browser'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

LogBox.ignoreLogs([
  'Video component', 
  'expo-audio', 
  'expo-video',
  'SafeAreaView has been deprecated',
  'InteractionManager has been deprecated'
]);

const windowDim = Dimensions.get('window');
const PORTRAIT_WIDTH = Math.min(windowDim.width, windowDim.height);
const PORTRAIT_HEIGHT = Math.max(windowDim.width, windowDim.height);

const PLAYER_HEIGHT = (PORTRAIT_WIDTH * 9) / 16;
const MINI_WIDTH = PORTRAIT_WIDTH * 0.45;
const MINI_HEIGHT = (MINI_WIDTH * 9) / 16;

const MY_API_SERVER = "http://127.0.0.1:10000"; 

const safeSeek = (p, targetSec) => {
    if (!p) return;
    try {
        if (typeof p.seekTo === 'function') p.seekTo(targetSec).catch(() => {});
        else if (typeof p.seekBy === 'function') p.seekBy(targetSec - p.currentTime).catch(() => {});
        else p.currentTime = targetSec; 
    } catch (e) {}
};

const safeSetRate = (p, rate) => {
    if (!p) return;
    try {
        if (typeof p.setPlaybackRate === 'function') p.setPlaybackRate(rate).catch(() => {});
        else if (typeof p.setRate === 'function') p.setRate(rate).catch(() => {});
        else p.playbackRate = rate;
    } catch (e) {}
};

const safeSetVolume = (p, vol) => {
    if (!p) return;
    try {
        if (typeof p.setVolume === 'function') p.setVolume(vol).catch(() => {});
        else p.volume = vol;
    } catch(e) {}
};

export default function GlobalPlayer() {
  const navigation = useNavigation();
  const videoViewRef = useRef(null); 
  const syncAudioRef = useRef(null); 
  
  const currentVideoIdRef = useRef(null);
  const fetchIdRef = useRef(0);
  
  const scale = useRef(new Animated.Value(1)).current;
  const baseScaleRef = useRef(1);
  const initialDistanceRef = useRef(null);
  const isZoomingRef = useRef(false);
  
  const lastTapRef = useRef({ time: 0, side: '' });
  const tapTimeoutRef = useRef(null);
  const isSlidingRef = useRef(false); 

  const [playerState, setPlayerState] = useState('hidden'); 
  const [isFullscreen, setIsFullscreen] = useState(false); 
  const [videoData, setVideoData] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [videoSource, setVideoSource] = useState(null); 
  const resumeTimeRef = useRef(0); 

  const [streamMode, setStreamMode] = useState('combined');
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [fallbackData, setFallbackData] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isPlayingUI, setIsPlayingUI] = useState(false); 

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const isAudioModeRef = useRef(false);
  const streamModeRef = useRef('combined');
  const cachedAudioUrlRef = useRef(null); 
  const pendingSeekRef = useRef(null); 
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true, shouldDuckAndroid: true });
      } catch (e) {}
    };
    setupAudio();
  }, []);

  const safeReleaseAudio = () => {
      if (syncAudioRef.current) {
          try { syncAudioRef.current.release(); } catch(e) {}
          syncAudioRef.current = null;
      }
  };

  const player = useVideoPlayer(videoSource, (p) => {
    if (!videoSource) return; 
    try { p.loop = false; } catch(e) {}
    safeSetRate(p, currentSpeed);
    if (streamModeRef.current === 'separate') { try { p.muted = true; } catch(e){} }
    try { p.play(); } catch(e) {}
  });

  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', async (nextAppState) => {
        if (nextAppState.match(/inactive|background/)) {
            if (!isAudioModeRef.current) {
                try { if (player && player.playing) player.pause(); } catch(e){}
                try { if (syncAudioRef.current && syncAudioRef.current.playing) syncAudioRef.current.pause(); } catch(e){}
            }
        }
    });
    return () => appStateSub.remove();
  }, [player]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      if (!e.data.state) return;
      const currentRoute = e.data.state.routes[e.data.state.routes.length - 1].name;
      if (currentRoute !== 'Player' && currentRoute !== 'PlayerScreen') {
          setPlayerState((prev) => {
              if (prev === 'full' || prev === 'center' || prev === 'fullscreen') {
                  if (isFullscreen) {
                      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                      setIsFullscreen(false);
                  }
                  return 'mini';
              }
              return prev;
          });
      }
    });
    return unsubscribe;
  }, [navigation, isFullscreen]);

  const handleSmartBack = () => {
      if (playerState === 'fullscreen') { toggleFullscreen(); return true; }
      if (playerState === 'center' || playerState === 'full') {
          setPlayerState('mini');
          navigation.navigate('Home'); 
          return true;
      }
      return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleSmartBack);
    return () => backHandler.remove();
  }, [playerState, navigation, isFullscreen]);

  const toggleFullscreen = async () => {
    try {
        if (isFullscreen) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            setIsFullscreen(false);
            setPlayerState('full'); 
        } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            setIsFullscreen(true);
            setPlayerState('fullscreen');
        }
        scale.setValue(1); baseScaleRef.current = 1;
    } catch (error) {}
  };

  useEffect(() => {
    const playSub = DeviceEventEmitter.addListener('playVideo', async (data) => {
      if (currentVideoIdRef.current === data.videoId) {
          setPlayerState('full');
          if (isFullscreen) toggleFullscreen();
          return;
      }

      fetchIdRef.current = Date.now();
      currentVideoIdRef.current = data.videoId;
      setVideoData(data.videoData);
      setPlayerState('full');
      
      setIsLoading(true);
      setStreamUrl(null);
      setVideoSource(null); 
      resumeTimeRef.current = 0; 
      
      setFallbackData(null);
      setIsAudioMode(false);
      isAudioModeRef.current = false;
      cachedAudioUrlRef.current = null;
      setCurrentTime(0);
      scale.setValue(1);
      baseScaleRef.current = 1;
      triggerControls();
      safeReleaseAudio();

      fetchStreamUrl(data.videoId, global.appSettings?.normalVideo || '720p', fetchIdRef.current);
    });

    const audioModeSub = DeviceEventEmitter.addListener('toggleAudioMode', async (mode) => {
      setIsAudioMode(mode);
      isAudioModeRef.current = mode;

      if (mode) {
          try { resumeTimeRef.current = player ? player.currentTime : currentTime; if (player) player.pause(); } catch(e) {}
          setVideoSource(null); 
          setIsPlayingUI(true); 

          if (streamModeRef.current === 'separate' && syncAudioRef.current) {
              if (!syncAudioRef.current.playing) syncAudioRef.current.play();
          } else if (cachedAudioUrlRef.current) {
              safeReleaseAudio();
              syncAudioRef.current = createAudioPlayer(cachedAudioUrlRef.current);
              pendingSeekRef.current = resumeTimeRef.current; 
              syncAudioRef.current.play();
          }
      } else {
          let resumeVideoTime = resumeTimeRef.current;
          if (syncAudioRef.current) {
              try { resumeVideoTime = syncAudioRef.current.currentTime; } catch(e){}
              if (streamModeRef.current !== 'separate') safeReleaseAudio();
              else syncAudioRef.current.pause();
          }
          resumeTimeRef.current = resumeVideoTime;
          setVideoSource(streamUrl); 
      }
    });

    return () => { playSub.remove(); audioModeSub.remove(); };
  }, [isFullscreen, streamUrl]);

  useEffect(() => {
      let timeoutId;
      if (!isAudioMode && videoSource && player) {
          timeoutId = setTimeout(() => {
              try {
                  if (resumeTimeRef.current > 0) {
                      safeSeek(player, resumeTimeRef.current);
                      if (streamModeRef.current === 'separate' && syncAudioRef.current) safeSeek(syncAudioRef.current, resumeTimeRef.current);
                  }
                  player.play();
                  if (streamModeRef.current === 'separate' && syncAudioRef.current) syncAudioRef.current.play();
              } catch (e) {}
          }, 800); 
      }
      return () => clearTimeout(timeoutId);
  }, [videoSource, isAudioMode, player]);

  const fetchStreamUrl = async (vidId, targetQuality, fetchId) => {
    try {
      const qStr = targetQuality.toString().toUpperCase();
      let reqQ = qStr.includes('8K') ? 4320 : qStr.includes('4K') ? 2160 : qStr.includes('2K') ? 1440 : parseInt(qStr.replace(/\D/g, '')) || 720;
      
      const res = await fetch(`${MY_API_SERVER}/api/extract?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vidId}`)}&quality=${reqQ}&action=play`);
      const json = await res.json();

      if (fetchId !== fetchIdRef.current) return;

      if (json.success && json.url) {
          const resQ = parseInt(json.quality) || 720;
          if (reqQ > resQ) {
              setFallbackData({ reqQ, resQ, data: json, message: `Requested ${reqQ}p is not available. Play ${resQ}p instead?` });
              setIsLoading(false);
              return;
          }
          startPlayback(json);
      }
    } catch(e) { setIsLoading(false); }
  };

  const startPlayback = async (json) => {
    setStreamMode(json.streamType || 'combined');
    streamModeRef.current = json.streamType || 'combined';
    cachedAudioUrlRef.current = json.audioUrl || null; 
    setStreamUrl(json.url);
    setVideoSource(json.url); 
    setIsLoading(false);
    
    if (json.audioUrl && streamModeRef.current === 'separate') {
        safeReleaseAudio();
        syncAudioRef.current = createAudioPlayer(json.audioUrl);
        safeSetVolume(syncAudioRef.current, 1.0); 
        syncAudioRef.current.play();
    }
  };

  const handleSkip = (amount) => {
      let currentPosition = currentTime;
      try { if (!isAudioMode && player) currentPosition = player.currentTime; } catch(e) {}
      let newTime = Math.max(0, Math.min(currentPosition + amount, duration));
      
      if (isAudioMode && syncAudioRef.current) safeSeek(syncAudioRef.current, newTime);
      else if (player) {
          safeSeek(player, newTime);
          if (streamMode === 'separate' && syncAudioRef.current) safeSeek(syncAudioRef.current, newTime);
      }
      setCurrentTime(newTime);
      triggerControls(); 
  };

  const handleTap = (side) => {
      const now = Date.now();
      if (lastTapRef.current.side === side && (now - lastTapRef.current.time) < 300) {
          clearTimeout(tapTimeoutRef.current);
          lastTapRef.current = { time: 0, side: '' }; 
          handleSkip(side === 'right' ? 10 : -10); 
      } else {
          lastTapRef.current = { time: now, side };
          tapTimeoutRef.current = setTimeout(() => {
              setShowControls(prev => { const next = !prev; if (next) triggerControls(); return next; });
              lastTapRef.current = { time: 0, side: '' };
          }, 300);
      }
  };

  const togglePlayPause = () => {
      if (isAudioMode && syncAudioRef.current) {
          syncAudioRef.current.playing ? syncAudioRef.current.pause() : syncAudioRef.current.play();
      } else if (player) {
          try {
              if (player.playing) {
                  player.pause();
                  if (streamMode === 'separate' && syncAudioRef.current) syncAudioRef.current.pause();
              } else {
                  player.play();
                  if (streamMode === 'separate' && syncAudioRef.current) syncAudioRef.current.play();
              }
          } catch(e) {}
      }
      triggerControls();
  };

  useEffect(() => {
    const interval = setInterval(() => {
        if (isSyncingRef.current) return; 
        if (isAudioMode && syncAudioRef.current) {
            setIsPlayingUI(syncAudioRef.current.playing);
            if (!isSlidingRef.current) {
                setCurrentTime(syncAudioRef.current.currentTime);
                if (syncAudioRef.current.duration > 0) setDuration(syncAudioRef.current.duration);
            }
        } else if (player) {
            setIsPlayingUI(player?.playing || false);
            if (!isSlidingRef.current && player.currentTime > 0) {
                setCurrentTime(player.currentTime);
                if (player.duration > 0) setDuration(player.duration);
            }
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isAudioMode]);

  const videoPanResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => false, 
      onMoveShouldSetPanResponder: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) return true; 
          
          if (gestureState.y0 > Dimensions.get('window').height - 120) return false;
          if (Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20) return true; 
          return false;
      },
      onPanResponderRelease: (evt, gestureState) => {
          if (Math.abs(gestureState.dy) > 50 && Math.abs(gestureState.vy) > 0.5) {
              setPlayerState(prev => prev === 'fullscreen' ? (toggleFullscreen(), 'mini') : prev === 'full' ? 'center' : prev === 'center' ? (handleSmartBack(), 'mini') : prev);
          } else if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
              const side = gestureState.x0 < (PORTRAIT_WIDTH / 2) ? 'left' : 'right';
              handleTap(side);
          }
      }
  })).current;

  const miniPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false, 
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10,
    onPanResponderGrant: () => { pan.setOffset({ x: pan.x._value, y: pan.y._value }); pan.setValue({ x: 0, y: 0 }); },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => {
      pan.flattenOffset();
      Animated.spring(pan, { toValue: { x: Math.min(10, Math.max(pan.x._value, -(PORTRAIT_WIDTH - MINI_WIDTH - 20))), y: Math.min(20, Math.max(pan.y._value, -(Dimensions.get('window').height - MINI_HEIGHT - 120))) }, friction: 6, useNativeDriver: false }).start();
    }
  })).current;

  const closePlayer = async () => {
      setPlayerState('hidden');
      if (isFullscreen) await toggleFullscreen();
      setStreamUrl(null); setVideoSource(null); safeReleaseAudio();
  };

  const formatTime = (time) => isNaN(time) ? "00:00" : `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;

  if (playerState === 'hidden') return null;
  const isInteractiveFull = playerState === 'full' || playerState === 'center' || playerState === 'fullscreen';

  return (
    <Animated.View 
        style={[
            playerState === 'fullscreen' ? styles.fullscreenContainer : playerState === 'full' ? styles.fullContainer : playerState === 'center' ? styles.centerContainer : styles.miniContainer, 
            playerState === 'mini' && { transform: pan.getTranslateTransform() }
        ]} 
        {...(!isInteractiveFull ? miniPanResponder.panHandlers : {})}
    >
      <View style={styles.masterWrapper}>
        
        {/* Layer 1: Video */}
        <Animated.View style={[styles.layerVideo, { transform: [{ scale: scale }] }]}>
            {isLoading ? (
                <ActivityIndicator size="large" color="#FF0000" />
            ) : videoSource ? (
                <VideoView ref={videoViewRef} player={player} style={styles.video} contentFit="contain" nativeControls={false} surfaceType="textureView" />
            ) : null}
            
            {isAudioMode && (
                <View style={[StyleSheet.absoluteFillObject, styles.audioModeOverlay]}>
                    <Ionicons name="headset" size={70} color="#00BFA5" />
                    <Text style={{ color: '#00BFA5', marginTop: 15, fontSize: 16, fontWeight: 'bold' }}>ব্যাকগ্রাউন্ড অডিও মোড</Text>
                </View>
            )}
        </Animated.View>

        {/* Layer 2: Gestures */}
        {isInteractiveFull && !fallbackData && (
            <View style={styles.layerGestures} {...videoPanResponder.panHandlers}>
                <TouchableOpacity activeOpacity={1} style={styles.tapHalf} onPress={() => handleTap('left')} />
                <TouchableOpacity activeOpacity={1} style={styles.tapHalf} onPress={() => handleTap('right')} />
            </View>
        )}

        {/* Layer 3: UI Controls */}
        {isInteractiveFull && showControls && !fallbackData && (
          <View style={styles.layerUI} pointerEvents="box-none">
             
             {/* 🚨 Fix: Absolute Center Play/Pause 🚨 */}
             <View style={styles.centerRow} pointerEvents="box-none">
                <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
                   <Ionicons name={isPlayingUI ? "pause-circle" : "play-circle"} size={75} color="#FFF" />
                </TouchableOpacity>
             </View>

             {/* Bottom Controls */}
             <View style={styles.bottomBar}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                
                <View style={styles.sliderWrapper}>
                    <Slider 
                      style={{ flex: 1, height: 40 }}
                      minimumValue={0} maximumValue={duration > 0 ? duration : 1} value={currentTime}
                      onSlidingStart={() => { isSlidingRef.current = true; clearTimeout(controlsTimeoutRef.current); }}
                      onValueChange={(v) => setCurrentTime(v)} 
                      onSlidingComplete={(v) => {
                          isAudioMode && syncAudioRef.current ? safeSeek(syncAudioRef.current, v) : player && safeSeek(player, v);
                          isSlidingRef.current = false; triggerControls();
                      }}
                      minimumTrackTintColor="#FF0000" maximumTrackTintColor="#FFFFFF50" thumbTintColor="#FF0000"
                    />
                </View>

                <Text style={styles.timeText}>{formatTime(duration)}</Text>
                
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettingsMenu(true)}>
                    <Ionicons name="settings-outline" size={24} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={toggleFullscreen}>
                    <Ionicons name={isFullscreen ? "contract" : "expand"} size={24} color="#FFF" />
                </TouchableOpacity>
             </View>
          </View>
        )}

        {/* Settings Modal */}
        <Modal visible={showSettingsMenu} transparent animationType="fade">
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettingsMenu(false)}>
                <TouchableOpacity activeOpacity={1} style={styles.settingsMenu}>
                    <Text style={styles.modalTitle}>Player Settings</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setShowSpeedMenu(true); }}>
                        <Ionicons name="speedometer-outline" size={20} color="#FFF" style={styles.menuIcon} />
                        <Text style={styles.menuText}>Playback Speed ({currentSpeed}x)</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>

        {/* Speed Modal */}
        <Modal visible={showSpeedMenu} transparent animationType="fade">
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSpeedMenu(false)}>
                <TouchableOpacity activeOpacity={1} style={styles.settingsMenu}>
                    <Text style={styles.modalTitle}>Select Speed</Text>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => (
                        <TouchableOpacity key={s} style={styles.menuItem} onPress={() => { setCurrentSpeed(s); safeSetRate(player, s); if (syncAudioRef.current) safeSetRate(syncAudioRef.current, s); setShowSpeedMenu(false); setShowSettingsMenu(false); }}>
                            <Text style={[styles.menuText, currentSpeed === s && {color: '#FF0000', fontWeight: 'bold'}]}>
                                {s === 1.0 ? 'Normal (1.0x)' : `${s}x`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>

        {/* Fallback Overlay */}
        {fallbackData && (
          <View style={styles.fallbackOverlay}>
            <Ionicons name="alert-circle" size={50} color="#FFD700" />
            <Text style={styles.fallbackText}>{fallbackData.message}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => { startPlayback(fallbackData.data); setFallbackData(null); }}>
              <Text style={styles.btnText}>OK, Play Highest Quality</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Mini Player Controls */}
        {!isInteractiveFull && (
            <TouchableOpacity activeOpacity={0.9} style={StyleSheet.absoluteFillObject} onPress={() => setPlayerState('full')}>
                <View style={styles.miniControlsRow}>
                    <TouchableOpacity onPress={togglePlayPause} style={{padding:5}}><Ionicons name={isPlayingUI ? "pause" : "play"} size={22} color="#FFF" /></TouchableOpacity>
                    <TouchableOpacity onPress={closePlayer} style={{padding:5}}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
                </View>
            </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: '#000', overflow: 'hidden' }, 
  fullContainer: { position: 'absolute', top: 55, left: 0, width: PORTRAIT_WIDTH, height: PLAYER_HEIGHT, zIndex: 9999, backgroundColor: '#000', overflow: 'hidden' },
  centerContainer: { position: 'absolute', top: 0, left: 0, width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT, zIndex: 9999, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  miniContainer: { position: 'absolute', bottom: 100, right: 20, width: MINI_WIDTH, height: MINI_HEIGHT, backgroundColor: '#000', borderRadius: 15, overflow: 'hidden', elevation: 10, borderWidth: 1, borderColor: '#00FF00' },
  
  masterWrapper: { flex: 1, width: '100%', height: '100%' },

  // Layer 1
  layerVideo: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 1, elevation: 1 },
  video: { flex: 1, width: '100%', height: '100%' },
  
  // Layer 2
  layerGestures: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 10, elevation: 10 },
  tapHalf: { flex: 1, height: '100%' },
  
  // 🚨 Layer 3 (Fix: Center alignment removed here) 🚨
  layerUI: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 100, elevation: 100 },

  audioModeOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  
  // 🚨 Fix: Absolute Center Row for Play Button 🚨
  centerRow: { 
      position: 'absolute', 
      top: '50%', 
      left: '50%', 
      transform: [{ translateX: -60 }, { translateY: -60 }], // Adjusted for button size + padding
      flexDirection: 'row', 
      alignItems: 'center' 
  },
  playButton: { padding: 30 }, 
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: 'rgba(0,0,0,0.5)' },
  timeText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', minWidth: 45, textAlign: 'center' },
  sliderWrapper: { flex: 1, marginHorizontal: 10, justifyContent: 'center', height: 40 },
  iconBtn: { marginLeft: 15, padding: 5 },
  
  miniControlsRow: { position: 'absolute', top: 5, right: 5, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, paddingHorizontal: 5 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  settingsMenu: { width: 250, backgroundColor: '#1A1A1A', borderRadius: 15, padding: 15, elevation: 10 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  menuIcon: { marginRight: 10 },
  menuText: { color: '#FFF', fontSize: 16 },

  fallbackOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  fallbackText: { color: '#FFF', textAlign: 'center', marginVertical: 20, fontSize: 16 },
  btn: { backgroundColor: '#FF0000', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
});