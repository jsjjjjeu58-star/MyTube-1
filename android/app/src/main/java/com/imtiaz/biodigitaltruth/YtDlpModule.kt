package com.imtiaz.biodigitaltruth

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class YtDlpModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "YtDlpModule"
    }

    // 🚨 নেটিভ লেভেল থেকে জাভাস্ক্রিপ্ট টার্মিনালে লগ পাঠানোর গোপন ব্রিজ 🚨
    private fun sendLogToTerminal(message: String) {
        Log.d("YtDlpModule", message) 
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("EngineLiveLog", message)
        } catch (e: Exception) {
            // JS রেডি না থাকলে লগ স্কিপ করবে
        }
    }

    @ReactMethod
    fun extractVideoInfo(videoUrl: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            sendLogToTerminal("\n============ 🟢 [ENGINE START] Awakening for Extraction ============")
            sendLogToTerminal("Target URL: $videoUrl")
            
            try {
                val request = YoutubeDLRequest(videoUrl)
                request.addOption("-j") 
                request.addOption("--no-warnings")
                request.addOption("--no-playlist")
                request.addOption("--no-check-certificate")
                request.addOption("--write-comments")
                request.addOption("--extractor-args")
                request.addOption("youtube:max_comments=100")
                request.addOption("--extractor-args")
                request.addOption("youtube:player_client=android,web_embedded;formats=missing_pot")

                sendLogToTerminal("============ ⏳ [ENGINE PROCESSING] Options Added. Executing Command... ============")

                // 🚨 [FIX] ভুল কলব্যাকটি মুছে ফেলা হলো, এটি এখন কোনো কম্পাইল এরর দেবে না 🚨
                val response = YoutubeDL.getInstance().execute(request, null, null)

                sendLogToTerminal("============ ✅ [ENGINE SUCCESS] Data Extracted Successfully! ============")

                if (response.out.isNullOrEmpty()) {
                    sendLogToTerminal("============ ❌ [ENGINE ERROR] Output string is empty! ============")
                    promise.reject("EXTRACTION_ERROR", "No data received from yt-dlp")
                    return@launch
                }

                sendLogToTerminal("============ 📤 [ENGINE EXIT] Sending data to JS level... ============\n")
                promise.resolve(response.out)

            } catch (e: Exception) {
                sendLogToTerminal("============ 💥 [ENGINE CRASH] Error: ${e.message} ============\n")
                promise.reject("YT_DLP_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun updateEngine(promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            sendLogToTerminal("\n============ 🔄 [ENGINE UPDATE] Starting Background Update... ============")
            try {
                val app = reactApplicationContext.applicationContext as android.app.Application
                YoutubeDL.getInstance().updateYoutubeDL(app, YoutubeDL.UpdateChannel.STABLE)
                sendLogToTerminal("============ ✅ [ENGINE UPDATE SUCCESS] Engine is now up to date! ============\n")
                promise.resolve("UPDATED_SUCCESSFULLY")
            } catch (e: Exception) {
                sendLogToTerminal("============ ❌ [ENGINE UPDATE FAILED] Error: ${e.message} ============\n")
                promise.reject("UPDATE_ERROR", e.message)
            }
        }
    }
}