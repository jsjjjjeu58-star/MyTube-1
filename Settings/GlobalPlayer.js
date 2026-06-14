import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, Text, LogBox, BackHandler } from 'react-native';

// 🚨 [LATEST PACKAGES]
import { useVideoPlayer, VideoView } from 'expo-video'; 
import { setAudioModeAsync } from 'expo-audio'; 
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation'; 

// 🚨 [REAL AI INTEGRATION PACKAGES]
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy'; // 🚨 Legacy Import Maintained
import { decode } from 'base64-arraybuffer'; 
import * as jpeg from 'jpeg-js';
import { Asset } from 'expo-asset'; 
import FaceDetection from '@react-native-ml-kit/face-detection';
import { loadTensorflowModel } from 'react-native-fast-tflite';

LogBox.ignoreLogs(['Video component']);

const windowDim = Dimensions.get('window');
const PORTRAIT_WIDTH = Math.min(windowDim.width, windowDim.height);
const PORTRAIT_HEIGHT = Math.max(windowDim.width, windowDim.height);
const PLAYER_HEIGHT = (PORTRAIT_WIDTH * 9) / 16;
const MINI_WIDTH = PORTRAIT_WIDTH * 0.45;
const MINI_HEIGHT = (MINI_WIDTH * 9) / 16;

const MY_API_SERVER = "http://127.0.0.1:10000"; 

const safePlay = (p) => { try { if (p && typeof p.play === 'function') p.play(); } catch(e){} };
const safePause = (p) => { try { if (p && typeof p.pause === 'function') p.pause(); } catch(e){} };
const safeSeek = (p, targetSec) => { if (!p) return; try { p.seekTo(targetSec); } catch (e) {} };

export default function GlobalPlayer() {
  const navigation = useNavigation();

  const currentVideoIdRef = useRef(null);
  const fetchIdRef = useRef(0);
  const scale = useRef(new Animated.Value(1)).current;

  const [playerState, setPlayerState] = useState('hidden'); 
  const [isFullscreen, setIsFullscreen] = useState(false); 
  const [streamUrl, setStreamUrl] = useState(null);
  const [videoSource, setVideoSource] = useState(null); 
  
  // 🚨 টারমাক্সের জন্য 144p এর লিংক
  const [lowStreamUrl, setLowStreamUrl] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayingUI, setIsPlayingUI] = useState(false); 
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const isSyncingRef = useRef(false);

  // 🚨 AI ডেটা ম্যাপে এখন ফ্রেমের সাইজও থাকবে
  const aiDataMapRef = useRef({}); 
  const targetScanSecRef = useRef(0); 
  const isAiProcessingRef = useRef(false); 
  const genderModelRef = useRef(null);

  useEffect(() => {
    const setupAudio = async () => {
      try { await setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false }); } catch (e) {}
    };
    setupAudio();
  }, []);

  const player = useVideoPlayer(videoSource, (p) => {
    if (!videoSource) return; 
    try { p.loop = false; } catch(e) {}
    safePlay(p);
  });

  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      if (!e.data.state) return;
      const currentRoute = e.data.state.routes[e.data.state.routes.length - 1].name;
      if (currentRoute !== 'Player' && currentRoute !== 'PlayerScreen') {
          setPlayerState((prev) => {
              if (prev === 'full' || prev === 'fullscreen') {
                  if (isFullscreen) { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); setIsFullscreen(false); }
                  return 'mini';
              }
              return prev;
          });
      }
    });
    return unsubscribe;
  }, [navigation, isFullscreen]);

  const toggleFullscreen = async () => {
    try {
        if (isFullscreen) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            setIsFullscreen(false); setPlayerState('full'); scale.setValue(1); 
        } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            setIsFullscreen(true); setPlayerState('fullscreen'); scale.setValue(1); 
        }
    } catch (error) {}
  };

  const seekTo = async (newTime) => {
      setCurrentTime(newTime); 
      safeSeek(player, newTime); 
  };

  useEffect(() => {
    const playSub = DeviceEventEmitter.addListener('playVideo', async (data) => {
      if (currentVideoIdRef.current === data.videoId) {
          setPlayerState('full'); if (isFullscreen) toggleFullscreen(); return;
      }

      fetchIdRef.current = Date.now();
      currentVideoIdRef.current = data.videoId;
      setPlayerState('full');
      setStreamUrl(null); setVideoSource(null); setLowStreamUrl(null);
      
      aiDataMapRef.current = {};
      targetScanSecRef.current = 0; 
      isAiProcessingRef.current = false;

      setCurrentTime(0); setDuration(0); scale.setValue(1); 
      triggerControls();

      const targetQuality = global.appSettings?.normalVideo || '720p';
      fetchStreamUrl(data.videoId, targetQuality, fetchIdRef.current);
    });

    return () => { playSub.remove(); };
  }, [isFullscreen, streamUrl, player]);

  const fetchStreamUrl = async (vidId, targetQuality, fetchId) => {
    try {
      const qStr = (targetQuality || '720p').toString().toUpperCase();
      let reqQ = 720;
      if (qStr.includes('8K') || qStr.includes('4320')) reqQ = 4320;
      else if (qStr.includes('4K') || qStr.includes('2160')) reqQ = 2160;
      else if (qStr.includes('2K') || qStr.includes('1440')) reqQ = 1440;
      else reqQ = parseInt(qStr.replace(/\D/g, '')) || 720;

      const res = await fetch(`${MY_API_SERVER}/api/extract?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vidId}`)}&quality=${reqQ}&action=play`);
      const json = await res.json();
      
      if (fetchId !== fetchIdRef.current) return;
      if (json.success && json.url) {
          if (json.lowQualityUrl) setLowStreamUrl(json.lowQualityUrl);
          setStreamUrl(json.url); 
          setVideoSource(json.url); 
      }
    } catch(e) {}
  };

  // 🤖 -------------------- AI ENGINE START -------------------- 🤖
  
  const loadGenderModelAsync = async () => {
      if (!genderModelRef.current) {
          try {
              const asset = Asset.fromModule(require('../assets/gender_classification.tflite'));
              await asset.downloadAsync();
              genderModelRef.current = await loadTensorflowModel({ url: asset.localUri || asset.uri }, []);
          } catch (e) { }
      }
  };

  const processFrameForGender = async (uri) => {
      try {
          const faces = await FaceDetection.detect(uri);
          if (faces && faces.length > 0) {
              let hasFemale = false; let hasMale = false;

              for (let i = 0; i < faces.length; i++) {
                  const face = faces[i];
                  const box = face.frame || face.bounds || {}; 
                  let originX = Math.floor(Math.max(0, box.left ?? box.x ?? box.originX ?? 0));
                  let originY = Math.floor(Math.max(0, box.top ?? box.y ?? box.originY ?? 0));
                  let width = Math.floor(Math.max(10, box.width ?? 0));
                  let height = Math.floor(Math.max(10, box.height ?? 0));
                  
                  const croppedFace = await ImageManipulator.manipulateAsync(
                      uri, [{ crop: { originX, originY, width, height } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                  );
                  
                  await loadGenderModelAsync();
                  const base64Data = await FileSystem.readAsStringAsync(croppedFace.uri, { encoding: FileSystem.EncodingType.Base64 });
                  const rawBuffer = new Uint8Array(decode(base64Data));
                  const rawImageData = jpeg.decode(rawBuffer, { useTArray: true });

                  const pureInputBuffer = new ArrayBuffer(224 * 224 * 3 * 4);
                  const inputData = new Float32Array(pureInputBuffer);

                  let rgbIndex = 0;
                  for (let i = 0; i < rawImageData.data.length; i += 4) {
                      inputData[rgbIndex++] = rawImageData.data[i] / 255.0;     
                      inputData[rgbIndex++] = rawImageData.data[i + 1] / 255.0; 
                      inputData[rgbIndex++] = rawImageData.data[i + 2] / 255.0; 
                  }

                  const output = await genderModelRef.current.run([pureInputBuffer]);
                  let probability = output && output.length > 0 ? new Float32Array(output[0])[0] : 0;
                  
                  if (probability >= 0.50) { hasFemale = true; break; } else { hasMale = true; }
              }
              if (hasFemale) return 'w';
              if (hasMale) return 'm';
          }
          return 'none';
      } catch (error) { return 'none'; }
  };

  // 🚨 [FULL VIDEO SCANNER: WITH SIZE MEASUREMENT]
  useEffect(() => {
      let isQueueActive = true;

      const processQueue = async () => {
          
          while (isQueueActive) {
              if (player && player.playing && player.duration > 0) break;
              await new Promise(r => setTimeout(r, 500));
          }

          if (!isQueueActive) return;

          console.log("⏸️ Video started! Giving player 2s to buffer...");
          await new Promise(r => setTimeout(r, 2000));
          console.log("🚀 AI Scanner Engine Started for the ENTIRE VIDEO...");

          while (isQueueActive) {
              if (!lowStreamUrl || !videoSource) {
                  await new Promise(r => setTimeout(r, 1000));
                  continue;
              }

              let targetSec = targetScanSecRef.current;
              const vDuration = player ? player.duration : 0;

              // ভিডিও স্ক্যানিং শেষ হয়ে গেলে চুপ করে বসে থাকবে
              if (vDuration > 0 && targetSec > vDuration) {
                  await new Promise(r => setTimeout(r, 5000));
                  continue;
              }

              if (aiDataMapRef.current[targetSec] !== undefined) {
                  targetScanSecRef.current += 3;
                  continue;
              }

              isAiProcessingRef.current = true;
              try {
                  const response = await fetch(`${MY_API_SERVER}/api/get-frame?url=${encodeURIComponent(lowStreamUrl)}&time=${targetSec}`);
                  const data = await response.json();

                  if (data.success && data.frameUrl) {
                      
                      // 🚨 ১. ফ্রেম ডাউনলোড করে সাইজ বের করা
                      const tempLocalPath = `${FileSystem.cacheDirectory}temp_frame_${targetSec}.jpg`;
                      await FileSystem.downloadAsync(data.frameUrl, tempLocalPath);
                      const fileInfo = await FileSystem.getInfoAsync(tempLocalPath);
                      
                      let sizeKB = "0.00";
                      if (fileInfo.exists) {
                          sizeKB = (fileInfo.size / 1024).toFixed(2); // বাইট থেকে কিলোবাইটে কনভার্ট
                      }

                      // 🚨 ২. ডাউনলোড করা ফ্রেম থেকে এআই রেজাল্ট বের করা
                      const result = await processFrameForGender(tempLocalPath);
                      
                      // 🚨 ৩. ম্যাপে রেজাল্ট এবং সাইজ সেভ করা
                      aiDataMapRef.current[targetSec] = { gender: result, size: sizeKB };
                      
                      // 🚨 ৪. টার্মিনালে সুন্দর করে প্রিন্ট করা
                      let terminalLog = `\n--- 📊 AI DATA MAP (FFmpeg 144p + Size) ---\n`;
                      Object.keys(aiDataMapRef.current).map(Number).sort((a,b) => a - b).forEach(timeKey => {
                          const entry = aiDataMapRef.current[timeKey];
                          terminalLog += `${timeKey}s : [${entry.gender}] - Size: ${entry.size} KB\n`;
                      });
                      console.log(terminalLog);
                      
                      // 🚨 ৫. ফোন মেমোরি বাঁচানোর জন্য ছবি ডিলিট করা
                      await FileSystem.deleteAsync(tempLocalPath, { idempotent: true });

                      targetScanSecRef.current += 3;
                  }
              } catch(e) {
                  // Error handling silently to keep the engine running fast
              } finally {
                  isAiProcessingRef.current = false;
              }

              // কোনো ১৫ সেকেন্ডের ব্রেক নেই! মাত্র ১০০ মিলি-সেকেন্ড গ্যাপ দিয়ে একটানা স্ক্যান চলবে!
              await new Promise(r => setTimeout(r, 100)); 
          }
      };

      processQueue();
      return () => { isQueueActive = false; };
  }, [player, videoSource, lowStreamUrl]);

  // 🤖 -------------------- AI ENGINE END -------------------- 🤖

  useEffect(() => {
    const videoProgressSync = setInterval(async () => {
        if (isSyncingRef.current) return; 
        isSyncingRef.current = true;
        try {
            setIsPlayingUI(player?.playing || false);
            if (player) {
                if (player.currentTime >= 0) {
                    setCurrentTime(player.currentTime);
                    if (player.duration > 0 && duration === 0) setDuration(player.duration);
                }
            }
        } catch(e) {}
        isSyncingRef.current = false;
    }, 1000);
    return () => clearInterval(videoProgressSync);
  }, [player, videoSource, duration]);

  const closePlayer = async () => {
      setPlayerState('hidden'); if (isFullscreen) await toggleFullscreen();
      setStreamUrl(null); setVideoSource(null); safePause(player); 
  };

  const formatTime = (timeInSeconds) => {
      if (isNaN(timeInSeconds)) return "00:00";
      const m = Math.floor(timeInSeconds / 60); const s = Math.floor(timeInSeconds % 60); return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (playerState === 'hidden') return null;
  const isInteractiveFull = playerState === 'full' || playerState === 'center' || playerState === 'fullscreen';

  return (
    <Animated.View 
        style={[
            playerState === 'fullscreen' ? styles.fullscreenContainer : 
            playerState === 'full' ? styles.fullContainer : 
            playerState === 'center' ? styles.centerContainer : 
            styles.miniContainer, 
            playerState === 'mini' && { transform: pan.getTranslateTransform() }
        ]} 
    >
      <View style={styles.videoWrapper}>
        {streamUrl && (
          <View style={{ flex: 1, width: '100%', height: '100%' }}>
            <Animated.View style={[styles.animatedVideoWrapper, { transform: [{ scale: scale }] }]}>
                {videoSource ? (
                    <View collapsable={false} style={styles.video}>
                        <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} allowsPictureInPicture surfaceType="textureView" />
                    </View>
                ) : null}
            </Animated.View>
          </View>
        )}

        {isInteractiveFull && showControls && (
          <View style={styles.controls} pointerEvents="box-none">
             <View style={styles.centerRow} pointerEvents="box-none">
                <TouchableOpacity onPress={async () => {
                    if (player) {
                        if (player.playing) safePause(player); 
                        else safePlay(player); 
                    }
                    triggerControls();
                }}>
                   <Ionicons name={isPlayingUI ? "pause-circle" : "play-circle"} size={75} color="#FFF" />
                </TouchableOpacity>
             </View>

             <View style={styles.bottomBar}>
                <Text style={styles.timeTextLeft}>{formatTime(currentTime)}</Text>
                <View style={styles.sliderWrapper}>
                    <Slider style={{ flex: 1, height: 40 }} minimumValue={0} maximumValue={duration} value={currentTime} onValueChange={(v) => setCurrentTime(v)} onSlidingComplete={async (v) => { await seekTo(v); triggerControls(); }} minimumTrackTintColor="#FF0000" maximumTrackTintColor="transparent" thumbTintColor="#FF0000" />
                </View>
                <Text style={styles.timeTextRight}>{formatTime(duration)}</Text>
                <TouchableOpacity style={{marginLeft: 12}} onPress={toggleFullscreen}><Ionicons name={isFullscreen ? "contract" : "expand"} size={22} color="#FFF" /></TouchableOpacity>
             </View>
          </View>
        )}
        
        {!isInteractiveFull && (
            <TouchableOpacity activeOpacity={0.9} style={styles.miniTouchableArea} onPress={() => { if (videoData) { navigation.navigate('Player', { videoId: currentVideoIdRef.current, videoData }); setPlayerState('full'); } }}>
                <View style={styles.miniControlsRow}>
                    <TouchableOpacity onPress={closePlayer} style={styles.miniCtrlBtn}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
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
  centerContainer: { position: 'absolute', top: 0, left: 0, width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT, zIndex: 9999, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  miniContainer: { position: 'absolute', bottom: 100, right: 20, width: MINI_WIDTH, height: MINI_HEIGHT, backgroundColor: '#000', borderRadius: 15, overflow: 'hidden', elevation: 10, borderWidth: 1, borderColor: '#00FF00' },
  videoWrapper: { flex: 1, justifyContent: 'center', width: '100%', height: '100%' }, animatedVideoWrapper: { flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }, video: { flex: 1, width: '100%', height: '100%' },
  tapOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 }, tapHalf: { flex: 1 }, controls: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  centerRow: { flexDirection: 'row', alignItems: 'center', zIndex: 20 }, bottomBar: { position: 'absolute', bottom: 5, width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, zIndex: 20 },
  timeTextLeft: { color: '#FFF', fontSize: 13, fontWeight: 'bold', minWidth: 40, textAlign: 'center' }, timeTextRight: { color: '#FFF', fontSize: 13, fontWeight: 'bold', minWidth: 40, textAlign: 'center' },
  sliderWrapper: { flex: 1, marginHorizontal: 8, justifyContent: 'center', position: 'relative', height: 40 }, customTrackContainer: { position: 'absolute', left: Platform.OS === 'android' ? 15 : 0, right: Platform.OS === 'android' ? 15 : 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }, bufferedBar: { height: '100%', backgroundColor: 'rgba(144, 238, 144, 0.8)', borderRadius: 2 }, miniTouchableArea: { flex: 1, width: '100%', height: '100%', position: 'absolute', zIndex: 50 }, miniControlsRow: { position: 'absolute', top: 5, right: 5, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, paddingHorizontal: 5, paddingVertical: 2, alignItems: 'center' }, miniCtrlBtn: { padding: 5, marginHorizontal: 3 }
});