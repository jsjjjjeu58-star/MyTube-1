import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LanguageContext = createContext();

// keyed translations (preserved)
const keyedTranslations = {
  "en": {
    "home": "Home",
    "shorts": "Shorts",
    "live": "Live",
    "me": "ME",
    "search": "Search...",
    "menu": "MENU",
    "history": "History",
    "historyDesc": "Recently watched videos",
    "download": "Download",
    "downloadDesc": "Offline saved videos",
    "subscribe": "My Subscribe",
    "subscribeDesc": "Channels you follow",
    "playlist": "My Playlist",
    "playlistDesc": "Your curated collections",
    "settings": "Settings",
    "settingsDesc": "App preferences & privacy",
    "darkMode": "Dark Mode",
    "darkModeDesc": "Switch app theme",
    "language": "Language",
    "languageDesc": "Change app language",
    "subscriptions": "My Subscriptions",
    "unsubscribe": "Unsubscribe",
    "unsubscribeConfirm": "Are you sure you want to unsubscribe from '%s'?",
    "thumbnailQualityControl": "Thumbnail Quality Control",
    "current": "Current",
    "success": "Success",
    "videoSettings": "Video Settings",
    "videoSettingsDesc": "Customize your playback preferences",
    "longVideoQuality": "Long Video Quality",
    "shortVideoQuality": "Short Video Quality",
    "downloadLocation": "Download Location",
    "cacheLimit": "Cache Limit",
    "defaultTag": "Default"
  },
  "bn": {
    "home": "হোম",
    "shorts": "শর্টস",
    "live": "লাইভ",
    "me": "মি",
    "search": "সার্চ...",
    "menu": "মেন্যু",
    "history": "হিস্ট্রি",
    "historyDesc": "সম্প্রতি দেখা ভিডিও",
    "download": "ডাউনলোড",
    "downloadDesc": "অফলাইন সেভ করা ভিডিও",
    "subscribe": "সাবস্ক্রাইব",
    "subscribeDesc": "আপনার ফলো করা চ্যানেল",
    "playlist": "প্লেলিস্ট",
    "playlistDesc": "আপনার সংগ্রহ",
    "settings": "সেটিংস",
    "settingsDesc": "অ্যাপ প্রিফারেন্স ও প্রাইভেসি",
    "darkMode": "ডার্ক মোড",
    "darkModeDesc": "অ্যাপ থیم পরিবর্তন করুন",
    "language": "ভাষা",
    "languageDesc": "অ্যাপের ভাষা পরিবর্তন করুন",
    "subscriptions": "আমার সাবস্ক্রিপশন",
    "unsubscribe": "সাবস্ক্রাইব রদ করুন",
    "unsubscribeConfirm": "আপনি কি '%s' থেকে সাবস্ক্রাইব রদ করতে চান?",
    "thumbnailQualityControl": "থাম্বনেইল কোয়ালিটি কনট্রোল",
    "current": "বর্তমান",
    "success": "সফল",
    "videoSettings": "ভিডিও সেটিংস",
    "videoSettingsDesc": "আপনার প্লেব্যাক পছন্দ কাস্টমাইজ করুন",
    "longVideoQuality": "দীর্ঘ ভিডিও কোয়ালিটি",
    "shortVideoQuality": "শর্টস কোয়ালিটি",
    "downloadLocation": "ডাউনলোড লোকেশন",
    "cacheLimit": "ক্যাশ সীমা",
    "defaultTag": "ডিফল্ট"
  }
};

// Ensure keyedTranslations has entries for all supported languages (placeholders copied from English)
const supportedLangs = ['en','bn','hi','ur','fa','ar'];
for (const l of supportedLangs) {
  if (!keyedTranslations[l]) keyedTranslations[l] = { ...keyedTranslations['en'] };
}

// text-based translations (auto-extracted placeholders)
const textTranslations = {
  "Player Settings": {
    "en": "Player Settings",
    "bn": "Player Settings",
    "hi": "Player Settings",
    "ur": "Player Settings",
    "fa": "Player Settings",
    "ar": "Player Settings"
  },
  "Open in Browser": {
    "en": "Open in Browser",
    "bn": "Open in Browser",
    "hi": "Open in Browser",
    "ur": "Open in Browser",
    "fa": "Open in Browser",
    "ar": "Open in Browser"
  },
  "Playback Speed ({currentSpeed}x)": {
    "en": "Playback Speed ({currentSpeed}x)",
    "bn": "Playback Speed ({currentSpeed}x)",
    "hi": "Playback Speed ({currentSpeed}x)",
    "ur": "Playback Speed ({currentSpeed}x)",
    "fa": "Playback Speed ({currentSpeed}x)",
    "ar": "Playback Speed ({currentSpeed}x)"
  },
  "Save to Playlist": {
    "en": "Save to Playlist",
    "bn": "Save to Playlist",
    "hi": "Save to Playlist",
    "ur": "Save to Playlist",
    "fa": "Save to Playlist",
    "ar": "Save to Playlist"
  },
  "Share": {
    "en": "Share",
    "bn": "Share",
    "hi": "Share",
    "ur": "Share",
    "fa": "Share",
    "ar": "Share"
  },
  "Select Speed": {
    "en": "Select Speed",
    "bn": "Select Speed",
    "hi": "Select Speed",
    "ur": "Select Speed",
    "fa": "Select Speed",
    "ar": "Select Speed"
  },
  "OK, Play Highest Quality": {
    "en": "OK, Play Highest Quality",
    "bn": "OK, Play Highest Quality",
    "hi": "OK, Play Highest Quality",
    "ur": "OK, Play Highest Quality",
    "fa": "OK, Play Highest Quality",
    "ar": "OK, Play Highest Quality"
  },
  "10) x = 10; if (x": {
    "en": "10) x = 10; if (x",
    "bn": "10) x = 10; if (x",
    "hi": "10) x = 10; if (x",
    "ur": "10) x = 10; if (x",
    "fa": "10) x = 10; if (x",
    "ar": "10) x = 10; if (x"
  },
  "20) y = 20; if (y": {
    "en": "20) y = 20; if (y",
    "bn": "20) y = 20; if (y",
    "hi": "20) y = 20; if (y",
    "ur": "20) y = 20; if (y",
    "fa": "20) y = 20; if (y",
    "ar": "20) y = 20; if (y"
  },
  "window": {
    "en": "window",
    "bn": "window",
    "hi": "window",
    "ur": "window",
    "fa": "window",
    "ar": "window"
  },
  "Saved to Playlist successfully!": {
    "en": "Saved to Playlist successfully!",
    "bn": "Saved to Playlist successfully!",
    "hi": "Saved to Playlist successfully!",
    "ur": "Saved to Playlist successfully!",
    "fa": "Saved to Playlist successfully!",
    "ar": "Saved to Playlist successfully!"
  },
  "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}": {
    "en": "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}",
    "bn": "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}",
    "hi": "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}",
    "ur": "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}",
    "fa": "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}",
    "ar": "@{(channelName).replace(/\\s+/g, '').toLowerCase()} • {subscriberCount}"
  },
  ": null}": {
    "en": ": null}",
    "bn": ": null}",
    "hi": ": null}",
    "ur": ": null}",
    "fa": ": null}",
    "ar": ": null}"
  },
  "MyTube": {
    "en": "MyTube",
    "bn": "MyTube",
    "hi": "MyTube",
    "ur": "MyTube",
    "fa": "MyTube",
    "ar": "MyTube"
  },
  "search": {
    "en": "search",
    "bn": "search",
    "hi": "search",
    "ur": "search",
    "fa": "search",
    "ar": "search"
  },
  "menu": {
    "en": "menu",
    "bn": "menu",
    "hi": "menu",
    "ur": "menu",
    "fa": "menu",
    "ar": "menu"
  },
  "history": {
    "en": "history",
    "bn": "history",
    "hi": "history",
    "ur": "history",
    "fa": "history",
    "ar": "history"
  },
  "historyDesc": {
    "en": "historyDesc",
    "bn": "historyDesc",
    "hi": "historyDesc",
    "ur": "historyDesc",
    "fa": "historyDesc",
    "ar": "historyDesc"
  },
  "download": {
    "en": "download",
    "bn": "download",
    "hi": "download",
    "ur": "download",
    "fa": "download",
    "ar": "download"
  },
  "downloadDesc": {
    "en": "downloadDesc",
    "bn": "downloadDesc",
    "hi": "downloadDesc",
    "ur": "downloadDesc",
    "fa": "downloadDesc",
    "ar": "downloadDesc"
  },
  "subscribe": {
    "en": "subscribe",
    "bn": "subscribe",
    "hi": "subscribe",
    "ur": "subscribe",
    "fa": "subscribe",
    "ar": "subscribe"
  },
  "subscribeDesc": {
    "en": "subscribeDesc",
    "bn": "subscribeDesc",
    "hi": "subscribeDesc",
    "ur": "subscribeDesc",
    "fa": "subscribeDesc",
    "ar": "subscribeDesc"
  },
  "playlist": {
    "en": "playlist",
    "bn": "playlist",
    "hi": "playlist",
    "ur": "playlist",
    "fa": "playlist",
    "ar": "playlist"
  },
  "playlistDesc": {
    "en": "playlistDesc",
    "bn": "playlistDesc",
    "hi": "playlistDesc",
    "ur": "playlistDesc",
    "fa": "playlistDesc",
    "ar": "playlistDesc"
  },
  "settings": {
    "en": "settings",
    "bn": "settings",
    "hi": "settings",
    "ur": "settings",
    "fa": "settings",
    "ar": "settings"
  },
  "settingsDesc": {
    "en": "settingsDesc",
    "bn": "settingsDesc",
    "hi": "settingsDesc",
    "ur": "settingsDesc",
    "fa": "settingsDesc",
    "ar": "settingsDesc"
  },
  "darkMode": {
    "en": "darkMode",
    "bn": "darkMode",
    "hi": "darkMode",
    "ur": "darkMode",
    "fa": "darkMode",
    "ar": "darkMode"
  },
  "darkModeDesc": {
    "en": "darkModeDesc",
    "bn": "darkModeDesc",
    "hi": "darkModeDesc",
    "ur": "darkModeDesc",
    "fa": "darkModeDesc",
    "ar": "darkModeDesc"
  },
  "language": {
    "en": "language",
    "bn": "language",
    "hi": "language",
    "ur": "language",
    "fa": "language",
    "ar": "language"
  },
  "languageDesc": {
    "en": "languageDesc",
    "bn": "languageDesc",
    "hi": "languageDesc",
    "ur": "languageDesc",
    "fa": "languageDesc",
    "ar": "languageDesc"
  },
  "home": {
    "en": "home",
    "bn": "home",
    "hi": "home",
    "ur": "home",
    "fa": "home",
    "ar": "home"
  },
  "shorts": {
    "en": "shorts",
    "bn": "shorts",
    "hi": "shorts",
    "ur": "shorts",
    "fa": "shorts",
    "ar": "shorts"
  },
  "live": {
    "en": "live",
    "bn": "live",
    "hi": "live",
    "ur": "live",
    "fa": "live",
    "ar": "live"
  },
  "me": {
    "en": "me",
    "bn": "me",
    "hi": "me",
    "ur": "me",
    "fa": "me",
    "ar": "me"
  },
  "Description": {
    "en": "Description",
    "bn": "Description",
    "hi": "Description",
    "ur": "Description",
    "fa": "Description",
    "ar": "Description"
  },
  "Comments": {
    "en": "Comments",
    "bn": "Comments",
    "hi": "Comments",
    "ur": "Comments",
    "fa": "Comments",
    "ar": "Comments"
  },
  "Audio": {
    "en": "Audio",
    "bn": "Audio",
    "hi": "Audio",
    "ur": "Audio",
    "fa": "Audio",
    "ar": "Audio"
  },
  "Download": {
    "en": "Download",
    "bn": "Download",
    "hi": "Download",
    "ur": "Download",
    "fa": "Download",
    "ar": "Download"
  },
  "Fetching video details via MyTube Server...": {
    "en": "Fetching video details via MyTube Server...",
    "bn": "Fetching video details via MyTube Server...",
    "hi": "Fetching video details via MyTube Server...",
    "ur": "Fetching video details via MyTube Server...",
    "fa": "Fetching video details via MyTube Server...",
    "ar": "Fetching video details via MyTube Server..."
  },
  "Search...": {
    "en": "Search...",
    "bn": "Search...",
    "hi": "Search...",
    "ur": "Search...",
    "fa": "Search...",
    "ar": "Search..."
  },
  "Loading Video...": {
    "en": "Loading Video...",
    "bn": "Loading Video...",
    "hi": "Loading Video...",
    "ur": "Loading Video...",
    "fa": "Loading Video...",
    "ar": "Loading Video..."
  },
  "Loading Description...": {
    "en": "Loading Description...",
    "bn": "Loading Description...",
    "hi": "Loading Description...",
    "ur": "Loading Description...",
    "fa": "Loading Description...",
    "ar": "Loading Description..."
  },
  "Loading Comments...": {
    "en": "Loading Comments...",
    "bn": "Loading Comments...",
    "hi": "Loading Comments...",
    "ur": "Loading Comments...",
    "fa": "Loading Comments...",
    "ar": "Loading Comments..."
  },
  "• {item.time}": {
    "en": "• {item.time}",
    "bn": "• {item.time}",
    "hi": "• {item.time}",
    "ur": "• {item.time}",
    "fa": "• {item.time}",
    "ar": "• {item.time}"
  },
  "• {reply.time}": {
    "en": "• {reply.time}",
    "bn": "• {reply.time}",
    "hi": "• {reply.time}",
    "ur": "• {reply.time}",
    "fa": "• {reply.time}",
    "ar": "• {reply.time}"
  },
  "No comments found": {
    "en": "No comments found",
    "bn": "No comments found",
    "hi": "No comments found",
    "ur": "No comments found",
    "fa": "No comments found",
    "ar": "No comments found"
  },
  "Video": {
    "en": "Video",
    "bn": "Video",
    "hi": "Video",
    "ur": "Video",
    "fa": "Video",
    "ar": "Video"
  },
  "Fetching links...": {
    "en": "Fetching links...",
    "bn": "Fetching links...",
    "hi": "Fetching links...",
    "ur": "Fetching links...",
    "fa": "Fetching links...",
    "ar": "Fetching links..."
  },
  "maximizeVideo": {
    "en": "maximizeVideo",
    "bn": "maximizeVideo",
    "hi": "maximizeVideo",
    "ur": "maximizeVideo",
    "fa": "maximizeVideo",
    "ar": "maximizeVideo"
  },
  "minimizeVideo": {
    "en": "minimizeVideo",
    "bn": "minimizeVideo",
    "hi": "minimizeVideo",
    "ur": "minimizeVideo",
    "fa": "minimizeVideo",
    "ar": "minimizeVideo"
  },
  "My Saved Playlist": {
    "en": "My Saved Playlist",
    "bn": "My Saved Playlist",
    "hi": "My Saved Playlist",
    "ur": "My Saved Playlist",
    "fa": "My Saved Playlist",
    "ar": "My Saved Playlist"
  },
  "Added: {item.addedAt || 'Unknown Date'}": {
    "en": "Added: {item.addedAt || 'Unknown Date'}",
    "bn": "Added: {item.addedAt || 'Unknown Date'}",
    "hi": "Added: {item.addedAt || 'Unknown Date'}",
    "ur": "Added: {item.addedAt || 'Unknown Date'}",
    "fa": "Added: {item.addedAt || 'Unknown Date'}",
    "ar": "Added: {item.addedAt || 'Unknown Date'}"
  },
  "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।": {
    "en": "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।",
    "bn": "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।",
    "hi": "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।",
    "ur": "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।",
    "fa": "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।",
    "ar": "ভিডিও চলাকালীন সেটিংস থেকে \"Save to Playlist\" এ ক্লিক করে ভিডিও সেভ করুন।"
  },
  "style": {
    "en": "style",
    "bn": "style",
    "hi": "style",
    "ur": "style",
    "fa": "style",
    "ar": "style"
  },
  "You haven't subscribed to any channel yet.": {
    "en": "You haven't subscribed to any channel yet.",
    "bn": "You haven't subscribed to any channel yet.",
    "hi": "You haven't subscribed to any channel yet.",
    "ur": "You haven't subscribed to any channel yet.",
    "fa": "You haven't subscribed to any channel yet.",
    "ar": "You haven't subscribed to any channel yet."
  },
  "unsubscribe": {
    "en": "unsubscribe",
    "bn": "unsubscribe",
    "hi": "unsubscribe",
    "ur": "unsubscribe",
    "fa": "unsubscribe",
    "ar": "unsubscribe"
  },
  "unsubscribeConfirm": {
    "en": "unsubscribeConfirm",
    "bn": "unsubscribeConfirm",
    "hi": "unsubscribeConfirm",
    "ur": "unsubscribeConfirm",
    "fa": "unsubscribeConfirm",
    "ar": "unsubscribeConfirm"
  },
  "defaultTag": {
    "en": "defaultTag",
    "bn": "defaultTag",
    "hi": "defaultTag",
    "ur": "defaultTag",
    "fa": "defaultTag",
    "ar": "defaultTag"
  },
  "success": {
    "en": "success",
    "bn": "success",
    "hi": "success",
    "ur": "success",
    "fa": "success",
    "ar": "success"
  },
  "current": {
    "en": "current",
    "bn": "current",
    "hi": "current",
    "ur": "current",
    "fa": "current",
    "ar": "current"
  },
  "subscriptions": {
    "en": "subscriptions",
    "bn": "subscriptions",
    "hi": "subscriptions",
    "ur": "subscriptions",
    "fa": "subscriptions",
    "ar": "subscriptions"
  },
  "thumbnailQualityControl": {
    "en": "thumbnailQualityControl",
    "bn": "thumbnailQualityControl",
    "hi": "thumbnailQualityControl",
    "ur": "thumbnailQualityControl",
    "fa": "thumbnailQualityControl",
    "ar": "thumbnailQualityControl"
  },
  "LIVE": {
    "en": "LIVE",
    "bn": "LIVE",
    "hi": "LIVE",
    "ur": "LIVE",
    "fa": "LIVE",
    "ar": "LIVE"
  },
  "You have no watch history yet.": {
    "en": "You have no watch history yet.",
    "bn": "You have no watch history yet.",
    "hi": "You have no watch history yet.",
    "ur": "You have no watch history yet.",
    "fa": "You have no watch history yet.",
    "ar": "You have no watch history yet."
  },
  "Link: https://youtube.com/watch?v={item.id}": {
    "en": "Link: https://youtube.com/watch?v={item.id}",
    "bn": "Link: https://youtube.com/watch?v={item.id}",
    "hi": "Link: https://youtube.com/watch?v={item.id}",
    "ur": "Link: https://youtube.com/watch?v={item.id}",
    "fa": "Link: https://youtube.com/watch?v={item.id}",
    "ar": "Link: https://youtube.com/watch?v={item.id}"
  },
  "Default": {
    "en": "Default",
    "bn": "Default",
    "hi": "Default",
    "ur": "Default",
    "fa": "Default",
    "ar": "Default"
  },
  "Applying Settings...": {
    "en": "Applying Settings...",
    "bn": "Applying Settings...",
    "hi": "Applying Settings...",
    "ur": "Applying Settings...",
    "fa": "Applying Settings...",
    "ar": "Applying Settings..."
  },
  "Long Video Quality": {
    "en": "Long Video Quality",
    "bn": "Long Video Quality",
    "hi": "Long Video Quality",
    "ur": "Long Video Quality",
    "fa": "Long Video Quality",
    "ar": "Long Video Quality"
  },
  "Shorts Video Quality": {
    "en": "Shorts Video Quality",
    "bn": "Shorts Video Quality",
    "hi": "Shorts Video Quality",
    "ur": "Shorts Video Quality",
    "fa": "Shorts Video Quality",
    "ar": "Shorts Video Quality"
  },
  "Download Location": {
    "en": "Download Location",
    "bn": "Download Location",
    "hi": "Download Location",
    "ur": "Download Location",
    "fa": "Download Location",
    "ar": "Download Location"
  },
  "Shorts Cache Limit": {
    "en": "Shorts Cache Limit",
    "bn": "Shorts Cache Limit",
    "hi": "Shorts Cache Limit",
    "ur": "Shorts Cache Limit",
    "fa": "Shorts Cache Limit",
    "ar": "Shorts Cache Limit"
  },
  "Cache Limit Time": {
    "en": "Cache Limit Time",
    "bn": "Cache Limit Time",
    "hi": "Cache Limit Time",
    "ur": "Cache Limit Time",
    "fa": "Cache Limit Time",
    "ar": "Cache Limit Time"
  },
  "videoSettings": {
    "en": "videoSettings",
    "bn": "videoSettings",
    "hi": "videoSettings",
    "ur": "videoSettings",
    "fa": "videoSettings",
    "ar": "videoSettings"
  },
  "videoSettingsDesc": {
    "en": "videoSettingsDesc",
    "bn": "videoSettingsDesc",
    "hi": "videoSettingsDesc",
    "ur": "videoSettingsDesc",
    "fa": "videoSettingsDesc",
    "ar": "videoSettingsDesc"
  },
  "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}": {
    "en": "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}",
    "bn": "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}",
    "hi": "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}",
    "ur": "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}",
    "fa": "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}",
    "ar": "স্পিড: {item.speed || '0 KB/s'} • বাকি: {item.eta || '--:--'}"
  },
  "ডাউনলোড হচ্ছে... {item.progress || 0}%": {
    "en": "ডাউনলোড হচ্ছে... {item.progress || 0}%",
    "bn": "ডাউনলোড হচ্ছে... {item.progress || 0}%",
    "hi": "ডাউনলোড হচ্ছে... {item.progress || 0}%",
    "ur": "ডাউনলোড হচ্ছে... {item.progress || 0}%",
    "fa": "ডাউনলোড হচ্ছে... {item.progress || 0}%",
    "ar": "ডাউনলোড হচ্ছে... {item.progress || 0}%"
  },
  "চলমান ডাউনলোড ({activeDownloads.length})": {
    "en": "চলমান ডাউনলোড ({activeDownloads.length})",
    "bn": "চলমান ডাউনলোড ({activeDownloads.length})",
    "hi": "চলমান ডাউনলোড ({activeDownloads.length})",
    "ur": "চলমান ডাউনলোড ({activeDownloads.length})",
    "fa": "চলমান ডাউনলোড ({activeDownloads.length})",
    "ar": "চলমান ডাউনলোড ({activeDownloads.length})"
  },
  "Shorts": {
    "en": "Shorts",
    "bn": "Shorts",
    "hi": "Shorts",
    "ur": "Shorts",
    "fa": "Shorts",
    "ar": "Shorts"
  },
  "Error: {error}": {
    "en": "Error: {error}",
    "bn": "Error: {error}",
    "hi": "Error: {error}",
    "ur": "Error: {error}",
    "fa": "Error: {error}",
    "ar": "Error: {error}"
  }
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('bn');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLang');
        if (savedLang) {
          setLocale(savedLang);
          global.__MYTUBE_CURRENT_LOCALE = savedLang;
        }
      } catch (e) {}
    };
    loadLang();
  }, []);

  const changeLanguage = async (lang) => {
    setLocale(lang);
    global.__MYTUBE_CURRENT_LOCALE = lang;
    global.__translate = (k) => {
      const cur = global.__MYTUBE_CURRENT_LOCALE || 'bn';
      if (keyedTranslations[cur] && keyedTranslations[cur][k]) return keyedTranslations[cur][k];
      if (keyedTranslations['en'] && keyedTranslations['en'][k]) return keyedTranslations['en'][k];
      if (textTranslations[k] && textTranslations[k][cur]) return textTranslations[k][cur];
      if (textTranslations[k]) return textTranslations[k][cur] || k;
      return k;
    };
    await AsyncStorage.setItem('appLang', lang);
  };

  // translator used by components via hook
  const t = (key) => {
    // first try keyed translations
    if (keyedTranslations[locale] && keyedTranslations[locale][key]) return keyedTranslations[locale][key];
    if (keyedTranslations['en'] && keyedTranslations['en'][key]) return keyedTranslations['en'][key];
    // then try textTranslations (exact-match on original text)
    if (textTranslations[key] && textTranslations[key][locale]) return textTranslations[key][locale];
    // fallback: if key exists in textTranslations mapped by english match
    if (textTranslations[key]) return textTranslations[key][locale] || key;
    return key;
  };

  // synchronous translator for code that cannot use hooks (global helper)
  // uses a shared current locale variable so translations update when changeLanguage runs
  if (typeof global.__MYTUBE_CURRENT_LOCALE === 'undefined') global.__MYTUBE_CURRENT_LOCALE = locale || 'bn';
  const translateSync = (key) => {
    const cur = global.__MYTUBE_CURRENT_LOCALE || 'bn';
    if (keyedTranslations[cur] && keyedTranslations[cur][key]) return keyedTranslations[cur][key];
    if (keyedTranslations['en'] && keyedTranslations['en'][key]) return keyedTranslations['en'][key];
    if (textTranslations[key] && textTranslations[key][cur]) return textTranslations[key][cur];
    if (textTranslations[key]) return textTranslations[key][cur] || key;
    return key;
  };
  // expose global helper
  global.__translate = translateSync;

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
