import React, { useState, useEঈffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, Alert, Animated, PanResponder, Dimensions, Modal, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system'; // 🚨 নেটিভ ডাউনলোডার ইমপোর্ট

import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BADGE_SIZE = 60;

const timeAgoBn = (timestamp) => {
  if (!timestamp) return "";
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (diffMins < 1) return "এইমাত্র";
  if (diffMins < 60) return `${diffMins} মিনিট পূর্বে`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ঘন্টা পূর্বে`;
  return `${Math.floor(diffHours / 24)} দিন পূর্বে`;
};

export default function GlobalDownloadManager() {
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const { t } = useLanguage();

    const [downloads, setDownloads] = useState([]);
    const [isScreenVisible, setIsScreenVisible] = useState(false); 
    const [isBadgeVisible, setIsBadgeVisible] = useState(false);
    
    const pan = useRef(new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT - 150 })).current;
    
    // 🚨 ব্যাকগ্রাউন্ড ডাউনলোড কন্ট্রোল করার জন্য Ref
    const activeDownloadsRef = useRef({}); 
    const lastProgressTimeRef = useRef({}); 
    const lastDownloadedBytesRef = useRef({});

    const loadDownloads = async () => {
        try {
            const data = await AsyncStorage.getItem('recorded_downloads');
            if (data) setDownloads(JSON.parse(data).filter(item => item && item.id));
        } catch (e) {}
    };

    useEffect(() => {
        loadDownloads();
        const openEvent = DeviceEventEmitter.addListener('openDownloadScreen', () => {
            setIsScreenVisible(true); loadDownloads();
        });

        // 🚨 নেটিভ ডাউনলোড সিগন্যাল রিসিভ করা হচ্ছে
        const startDownloadEvent = DeviceEventEmitter.addListener('startNativeDownload', async (data) => {
            const fileExt = data.ext || 'mp4';
            const safeTitle = data.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const fileUri = `${FileSystem.documentDirectory}${safeTitle}_${data.id}.${fileExt}`;

<<<<<<< HEAD
                const currentActiveIds = Object.keys(active).filter(k => {
                    const ai = active[k];
                    const progressVal = parseFloat(ai.progress) || 0;
                    if (ai.status === 'error' || ai.status === 'completed') return false;
                    if (progressVal >= 100) return false; // treat 100% as completed client-side
                    return true;
                });
                setActiveCount(currentActiveIds.length);
=======
            // UI-তে ইনস্ট্যান্ট দেখানো হচ্ছে
            setDownloads(prev => [{
                id: data.id, videoId: data.videoId, title: data.title, thumbnail: data.thumbnail,
                quality: data.quality, type: data.type, date: Date.now(),
                progress: '0.0', speed: 'Connecting...', eta: '--:--',
                isCompleted: false, localUri: fileUri, isError: false
            }, ...prev]);
>>>>>>> a9e815df9a56633ed9005d87d7d85ad2bc48a645

            setIsBadgeVisible(true);
            Animated.spring(pan, { toValue: { x: 20, y: SCREEN_HEIGHT - 150 }, useNativeDriver: false }).start();

            lastProgressTimeRef.current[data.id] = Date.now();
            lastDownloadedBytesRef.current[data.id] = 0;

            // 🚨 আসল ম্যাজিক: এক্সপো ফাইল সিস্টেম দিয়ে ডাউনলোড
            const downloadResumable = FileSystem.createDownloadResumable(
                data.url,
                fileUri,
                {},
                (downloadProgress) => {
                    const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
                    const now = Date.now();
                    const timeDiff = (now - lastProgressTimeRef.current[data.id]) / 1000; 

                    // প্রতি ১ সেকেন্ডে স্পিড এবং ETA আপডেট
                    if (timeDiff >= 1) { 
                        const bytesDiff = downloadProgress.totalBytesWritten - lastDownloadedBytesRef.current[data.id];
                        const speedKBs = (bytesDiff / 1024 / timeDiff).toFixed(2);
                        const speedMBs = (speedKBs / 1024).toFixed(2);
                        const displaySpeed = speedMBs > 1 ? `${speedMBs} MB/s` : `${speedKBs} KB/s`;

                        const bytesRemaining = downloadProgress.totalBytesExpectedToWrite - downloadProgress.totalBytesWritten;
                        const etaSeconds = bytesDiff > 0 ? Math.round(bytesRemaining / bytesDiff * timeDiff) : 0;
                        const etaFormatted = `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s`;

                        lastProgressTimeRef.current[data.id] = now;
                        lastDownloadedBytesRef.current[data.id] = downloadProgress.totalBytesWritten;

                        setDownloads(prev => prev.map(item =>
                            item.id === data.id ? { ...item, progress: progress.toFixed(1), speed: displaySpeed, eta: etaFormatted } : item
                        ));
                    } else {
                        setDownloads(prev => prev.map(item =>
                            item.id === data.id ? { ...item, progress: progress.toFixed(1) } : item
                        ));
                    }
                }
            );

            activeDownloadsRef.current[data.id] = downloadResumable;

<<<<<<< HEAD
                    Object.keys(active).forEach(id => {
                        const activeItem = active[id];
                        const existsIndex = updatedList.findIndex(d => d.id === id);

                        if (existsIndex === -1 && activeItem.status !== 'error') {
                            updatedList.unshift({
                                id: id, videoId: activeItem.videoId || id, title: activeItem.title || 'Downloading...', 
                                thumbnail: activeItem.thumbnail || `https://ui-avatars.com/api/?name=DL&background=00BFA5&color=fff&size=150`, 
                                quality: activeItem.quality || 'N/A', type: activeItem.type || 'Media', 
                                date: Date.now(), progress: activeItem.progress || '0', speed: activeItem.speed || '0 KB/s',
                                eta: activeItem.eta || '--:--', isCompleted: activeItem.status === 'completed', localUri: activeItem.localUrl || null,
                                processingStartTime: null, fakeProgress: null
                            });
                            needsSave = true;
                        } else if (existsIndex !== -1) {
                            const item = {...updatedList[existsIndex]}; 

                            // normalize numeric progress early
                            let progressVal = parseFloat(activeItem.progress) || 0;

                            // Treat explicit completed status OR progress reaching 100 as completed
                            if ((activeItem.status === 'completed' || progressVal >= 100) && !item.isCompleted) {
                                item.progress = '100'; item.isCompleted = true; item.localUri = activeItem.localUrl; item.date = Date.now(); needsSave = true;
                                fetch(`${MY_API_SERVER}/api/clear-progress?id=${id}`).catch(()=>{});
                            } else if (activeItem.status === 'error' && !item.isError) {
                                item.isError = true; needsSave = true;
                            } else {
                                // 🎯 🚀 [FIX] অডিও হলে ফেক প্রসেসিং স্কিপ করবে
                                if (progressVal >= 99.9 && activeItem.status !== 'completed' && activeItem.type !== 'audio') {
                                    if (!item.processingStartTime) { item.processingStartTime = Date.now(); needsSave = true; }
                                    let elapsed = Date.now() - item.processingStartTime;
                                    item.fakeProgress = Math.min((elapsed / 15000) * 100, 99.9).toFixed(1);
                                    needsSave = true; 
                                } else {
                                    item.processingStartTime = null; item.fakeProgress = null;
                                }

                                if (item.progress !== activeItem.progress || item.speed !== activeItem.speed) {
                                    item.progress = activeItem.progress; item.speed = activeItem.speed; item.eta = activeItem.eta; needsSave = true;
                                }
                            }
                            updatedList[existsIndex] = item;
                        }
                    });

                    if (needsSave) AsyncStorage.setItem('recorded_downloads', JSON.stringify(updatedList)).catch(()=>{});
                    return updatedList;
=======
            try {
                const { uri } = await downloadResumable.downloadAsync();
                // 🚨 ডাউনলোড সফল!
                setDownloads(prev => {
                    const newList = prev.map(item =>
                        item.id === data.id ? { ...item, progress: '100', isCompleted: true, localUri: uri, speed: 'Completed', eta: '' } : item
                    );
                    AsyncStorage.setItem('recorded_downloads', JSON.stringify(newList));
                    return newList;
>>>>>>> a9e815df9a56633ed9005d87d7d85ad2bc48a645
                });
                delete activeDownloadsRef.current[data.id];
            } catch (e) {
                // এরর বা ক্যানসেল
                setDownloads(prev => prev.map(item =>
                    item.id === data.id ? { ...item, isError: true, speed: 'Failed/Cancelled', eta: '' } : item
                ));
                delete activeDownloadsRef.current[data.id];
            }
        });

        return () => { openEvent.remove(); startDownloadEvent.remove(); };
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
            onPanResponderGrant: () => { pan.setOffset({ x: pan.x._value, y: pan.y._value }); pan.setValue({ x: 0, y: 0 }); },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();
                if (pan.x._value < -20 || pan.x._value > SCREEN_WIDTH - BADGE_SIZE + 20 || pan.y._value < -20 || pan.y._value > SCREEN_HEIGHT - BADGE_SIZE + 20 || Math.abs(gestureState.vx) > 1.5 || Math.abs(gestureState.vy) > 1.5) {
                    setIsBadgeVisible(false); 
                } else {
                    let safeX = pan.x._value < 0 ? 10 : (pan.x._value > SCREEN_WIDTH - BADGE_SIZE ? SCREEN_WIDTH - BADGE_SIZE - 10 : pan.x._value);
                    let safeY = pan.y._value < 50 ? 50 : (pan.y._value > SCREEN_HEIGHT - BADGE_SIZE - 50 ? SCREEN_HEIGHT - BADGE_SIZE - 50 : pan.y._value);
                    Animated.spring(pan, { toValue: { x: safeX, y: safeY }, friction: 5, useNativeDriver: false }).start();
                }
            }
        })
    ).current;

    const cancelActiveDownload = async (id) => {
        Alert.alert("Cancel Download", "আপনি কি এই চলমান ডাউনলোডটি বাতিল করতে চান?", [
            { text: "না", style: "cancel" },
            { text: "হ্যাঁ", onPress: async () => {
                if (activeDownloadsRef.current[id]) {
                    await activeDownloadsRef.current[id].cancelAsync();
                    delete activeDownloadsRef.current[id];
                }
                const newList = downloads.filter(item => item.id !== id);
                setDownloads(newList);
                await AsyncStorage.setItem('recorded_downloads', JSON.stringify(newList));
            }}
        ]);
    };

    const deleteDownload = async (id) => {
        Alert.alert("Delete File", "এই ফাইলটি কি ডিভাইস থেকে মুছে ফেলতে চান?", [
            { text: "না", style: "cancel" },
            { text: "হ্যাঁ", onPress: async () => {
                const item = downloads.find(d => d.id === id);
                if (item && item.localUri) {
                    try { await FileSystem.deleteAsync(item.localUri, { idempotent: true }); } catch (e) {}
                }
                const newList = downloads.filter(d => d.id !== id);
                setDownloads(newList);
                await AsyncStorage.setItem('recorded_downloads', JSON.stringify(newList));
            }}
        ]);
    };

    const handlePlayVideo = (item) => {
        if (!item.isCompleted) return;
        setIsScreenVisible(false); 
        navigation.navigate('Player', {
            videoId: item.videoId,
            videoData: { id: item.videoId, title: item.title, channel: 'Downloaded File', thumbnail: item.thumbnail, localUri: item.localUri, type: item.type }
        });
    };

    const activeDownloads = downloads.filter(d => !d.isCompleted && !d.isError);
    const completedDownloads = downloads.filter(d => d.isCompleted);
    const activeCount = activeDownloads.length;

    useEffect(() => {
        if (!isScreenVisible && activeCount === 0) setIsBadgeVisible(false);
    }, [activeCount, isScreenVisible]);

    return (
        <>
            {isBadgeVisible && !isScreenVisible && activeCount > 0 && (
                <Animated.View {...panResponder.panHandlers} style={[styles.badgeContainer, { transform: pan.getTranslateTransform() }]}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => { setIsBadgeVisible(false); setIsScreenVisible(true); }} style={styles.badge}>
                        <Ionicons name="download" size={28} color="#FFF" />
                        <View style={styles.countCircle}><Text style={styles.countText}>{activeCount}</Text></View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <Modal visible={isScreenVisible} animationType="slide" onRequestClose={() => setIsScreenVisible(false)}>
                <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F0F0F' : '#F9F9F9' }]}>
                    <StatusBar backgroundColor={isDarkMode ? '#0F0F0F' : '#FFFFFF'} barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                    <View style={[styles.header, { backgroundColor: isDarkMode ? '#0F0F0F' : '#FFFFFF', borderBottomColor: isDarkMode ? '#222' : '#E5E5E5' }]}>
                        <TouchableOpacity onPress={() => setIsScreenVisible(false)} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFF' : '#000'} /></TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#000' }]}>মাই ডাউনলোড লিস্ট</Text>
                        <View style={{ width: 24 }} /> 
                    </View>

                    <FlatList 
                        data={completedDownloads}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        ListHeaderComponent={
                            activeDownloads.length > 0 ? (
                                <View style={{ marginBottom: 15 }}>
                                    <Text style={styles.sectionTitle}>চলমান ডাউনলোড ({activeDownloads.length})</Text>

                                    {activeDownloads.map(item => {
                                        return (
                                            <View key={item.id} style={[styles.activeCard, { overflow: 'hidden' }]}>
                                                {item.type === 'audio' ? (
                                                    <View style={styles.splitThumbContainer}>
                                                        <Image source={{ uri: item.thumbnail }} style={styles.halfThumb} />
                                                        <View style={styles.halfIcon}><Ionicons name="musical-notes" size={30} color="#00BFA5" /></View>
                                                    </View>
                                                ) : (
                                                    <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                                                )}

                                                <View style={styles.info}>
                                                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                                                    <Text style={styles.metaSpeed}>স্পিড: {item.speed} • বাকি: {item.eta}</Text>
                                                    <Text style={styles.metaPercentage}>ডাউনলোড হচ্ছে... {item.progress}%</Text>
                                                    <View style={styles.progressBarBg}>
                                                        <View style={[styles.progressBarFill, { width: `${item.progress}%`, backgroundColor: '#00BFA5' }]} />
                                                    </View>
                                                </View>
                                                <TouchableOpacity style={[styles.cancelBtn, {zIndex: 20}]} onPress={() => cancelActiveDownload(item.id)}>
                                                    <Ionicons name="close" size={28} color="#FF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                    <View style={styles.divider} />
                                </View>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <TouchableOpacity style={styles.cardMain} activeOpacity={0.8} onPress={() => handlePlayVideo(item)}>
                                    {item.type === 'audio' ? (
                                        <View style={styles.splitThumbContainer}><Image source={{ uri: item.thumbnail }} style={styles.halfThumb} /><View style={styles.halfIcon}><Ionicons name="musical-notes" size={30} color="#00BFA5" /></View></View>
                                    ) : (
                                        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                                    )}
                                    <View style={styles.info}>
                                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                                        <Text style={styles.meta}>{item.quality} • {item.type?.toUpperCase()} • {timeAgoBn(item.date)}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDownload(item.id)}><Ionicons name="trash-outline" size={22} color="#FF4444" /></TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={<View style={styles.empty}><Ionicons name="download-outline" size={80} color="#333" /><Text style={styles.emptyText}>{t('কোনো ডাউনলোড পাওয়া যায়নি')}</Text></View>}
                    />
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    badgeContainer: { position: 'absolute', zIndex: 999999, elevation: 10 },
    badge: { width: BADGE_SIZE, height: BADGE_SIZE, backgroundColor: '#00BFA5', borderRadius: BADGE_SIZE / 2, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, borderWidth: 2, borderColor: '#FFF' },
    countCircle: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF0000', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
    countText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 10 },
    sectionTitle: { color: '#00BFA5', fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
    activeCard: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center', borderColor: '#00BFA5', borderWidth: 1, position: 'relative' },
    cancelBtn: { paddingLeft: 10 },
    card: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 10, marginBottom: 12, overflow: 'hidden', alignItems: 'center' },
    cardMain: { flex: 1, flexDirection: 'row', padding: 10 },
    thumb: { width: 120, height: 68, borderRadius: 6, backgroundColor: '#333', zIndex: 5 },
    splitThumbContainer: { width: 120, height: 68, borderRadius: 6, backgroundColor: '#222', flexDirection: 'row', overflow: 'hidden', zIndex: 5 },
    halfThumb: { width: '50%', height: '100%', backgroundColor: '#333' },
    halfIcon: { width: '50%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1, marginLeft: 12, justifyContent: 'center', zIndex: 5 },
    title: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 4 },
    metaSpeed: { color: '#00BFA5', fontSize: 11, marginBottom: 2, fontWeight: 'bold' },
    metaPercentage: { color: '#AAA', fontSize: 11, marginBottom: 5 },
    meta: { color: '#AAA', fontSize: 12, marginBottom: 5 },
    progressBarBg: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden', width: '100%', marginTop: 2 },
    progressBarFill: { height: '100%' }, 
    deleteBtn: { padding: 15 },
    divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
    empty: { flex: 1, marginTop: 100, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: '#555', fontSize: 16, marginTop: 15 }
});