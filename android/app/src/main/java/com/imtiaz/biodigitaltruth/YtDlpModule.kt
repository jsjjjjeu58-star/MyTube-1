package com.imtiaz.biodigitaltruth

import android.app.Application
import com.facebook.react.bridge.*
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.ffmpeg.FFmpeg 
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class YtDlpModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "YtDlpModule"
    }

    @ReactMethod
    fun extractVideoInfo(videoUrl: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                try {
                    val app = reactApplicationContext.applicationContext as Application
                    YoutubeDL.getInstance().init(app)
                    FFmpeg.getInstance().init(app) 
                } catch (e: Exception) {
                    promise.reject("INIT_ERROR", "ইঞ্জিন চালু হতে ব্যর্থ হয়েছে: " + e.localizedMessage)
                    return@launch
                }

                val request = YoutubeDLRequest(videoUrl)
                request.addOption("-j") 
                request.addOption("--no-warnings")
                request.addOption("--no-playlist")
                request.addOption("--no-check-certificate")
                
                request.addOption("--write-comments")
                request.addOption("--extractor-args")
                request.addOption("youtube:max_comments=100")

                val response = YoutubeDL.getInstance().execute(request, null, null)

                if (response.out.isNullOrEmpty()) {
                    promise.reject("EXTRACTION_ERROR", "No data received from yt-dlp")
                    return@launch
                }

                promise.resolve(response.out)

            } catch (e: Exception) {
                promise.reject("YT_DLP_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun updateEngine(promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val app = reactApplicationContext.applicationContext as Application
                YoutubeDL.getInstance().init(app)
                
                // 🚨 0.14.0 ভার্সনের জন্য সঠিক আপডেট কমান্ড (UpdateChannel রিমুভ করা হয়েছে)
                YoutubeDL.getInstance().updateYoutubeDL(app)
                promise.resolve("UPDATED_SUCCESSFULLY")
            } catch (e: Exception) {
                promise.reject("UPDATE_ERROR", e.message)
            }
        }
    }
}