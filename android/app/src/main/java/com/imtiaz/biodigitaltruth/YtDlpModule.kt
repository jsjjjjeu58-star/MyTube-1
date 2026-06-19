package com.imtiaz.biodigitaltruth

import com.facebook.react.bridge.*
import com.yausername.youtubedl_android.YoutubeDL
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
                val request = YoutubeDLRequest(videoUrl)
                request.addOption("-j") // JSON আউটপুট
                request.addOption("--no-warnings")
                request.addOption("--no-playlist")
                request.addOption("--no-check-certificate")
                
                // 🚨 কমেন্ট নিয়ে আসার ম্যাজিক কমান্ড
                request.addOption("--write-comments")
                
                // 🚨 একবারে ১০০টি কমেন্ট আনবে, যেন ইঞ্জিন স্লো না হয়
                request.addOption("--extractor-args")
                request.addOption("youtube:max_comments=100")

                val response = YoutubeDL.getInstance().execute(request, null, null)
                
                if (response.out.isNullOrEmpty()) {
                    promise.reject("EXTRACTION_ERROR", "No data received from yt-dlp")
                    return@launch
                }

                // পুরো ডেটা (কমেন্টসহ) জাভাস্ক্রিপ্টে পাঠিয়ে দেওয়া হলো
                promise.resolve(response.out)

            } catch (e: Exception) {
                promise.reject("YT_DLP_ERROR", e.message)
            }
        }
    }
}
