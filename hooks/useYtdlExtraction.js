import { NativeModules } from 'react-native';

const { YtdlpModule } = NativeModules;

/**
 * ইউটিউব ভিডিও এক্সট্র্যাক্ট করার জন্য হুক
 * @param {string} videoUrl - ইউটিউব ভিডিও URL
 * @param {string} quality - চাহিদাকৃত কোয়ালিটি (ডিফল্ট: 720)
 * @returns {Promise} ভিডিও ইনফো এবং স্ট্রিম URL
 */
export const useYtdlExtraction = async (videoUrl, quality = '720') => {
  try {
    if (!YtdlpModule) {
      throw new Error('YtdlpModule is not available');
    }

    const result = await YtdlpModule.extractVideoInfo(
      videoUrl,
      quality,
      'info'
    );

    // Parse JSON response
    const parsedResult = JSON.parse(result);

    return {
      success: true,
      data: parsedResult
    };
  } catch (error) {
    console.error('YouTube DL Extraction Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

/**
 * ভিডিও URL এবং অডিও URL আলাদাভাবে পান
 */
export const extractStreamUrls = async (videoUrl, quality = '720') => {
  const result = await useYtdlExtraction(videoUrl, quality);

  if (!result.success) {
    return {
      videoUrl: null,
      audioUrl: null,
      streamType: null,
      quality: null,
      error: result.error
    };
  }

  const { data } = result;

  return {
    videoUrl: data.url,
    audioUrl: data.audioUrl,
    streamType: data.streamType, // 'combined' or 'separate'
    quality: data.actualQuality,
    captions: data.captions || []
  };
};

export default YtdlpModule;
