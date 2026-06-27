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

    private fun sendLogToTerminal(message: String) {
        Log.d("YtDlpModule", message) 
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("EngineLiveLog", message)
        } catch (e: Exception) { }
    }

    // =========================================================================
    // 🚀 ১. রকেট স্পিড ভিডিও প্লেয়ার (মাত্র ১-২ সেকেন্ডে প্লে হবে)
    // =========================================================================
    @ReactMethod
    fun extractFastVideoInfo(videoUrl: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            sendLogToTerminal("\n============ 🟢 [FAST PLAYBACK] Fetching Stream URLs Only ============")
            try {
                val request = YoutubeDLRequest(videoUrl)
                request.addOption("-j") 
                request.addOption("--no-warnings")
                request.addOption("--no-playlist")
                request.addOption("--no-check-certificate")
                request.addOption("--force-ipv4") // নেটওয়ার্ক টাইমআউট বন্ধ করতে
                
                // কমেন্ট ছাড়া শুধু ক্লায়েন্ট বাইপাস
                request.addOption("--extractor-args", "youtube:player_client=android,web_embedded;formats=missing_pot")

                val response = YoutubeDL.getInstance().execute(request, null, null)
                
                if (response.out.isNullOrEmpty()) {
                    promise.reject("EXTRACTION_ERROR", "No data received")
                    return@launch
                }
                sendLogToTerminal("============ ✅ [FAST PLAYBACK] Success! Ready to play! ============")
                promise.resolve(response.out)
            } catch (e: Exception) {
                promise.reject("YT_DLP_ERROR", e.message)
            }
        }
    }

    // =========================================================================
    // 💬 ২. অন-ডিমান্ড কমেন্ট ফেচার (শুধু যখন ইউজার চাইবে তখন লোড হবে)
    // =========================================================================
    @ReactMethod
    fun fetchCommentsOnly(videoUrl: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            sendLogToTerminal("\n============ 💬 [COMMENTS] Fetching Comments in Background ============")
            try {
                val request = YoutubeDLRequest(videoUrl)
                request.addOption("-j") 
                request.addOption("--write-comments")
                request.addOption("--extractor-args", "youtube:max_comments=100")
                request.addOption("--skip-download") // ভিডিও ফরম্যাট স্কিপ করবে, শুধু কমেন্ট আনবে

                val response = YoutubeDL.getInstance().execute(request, null, null)
                promise.resolve(response.out)
            } catch (e: Exception) {
                promise.reject("COMMENT_ERROR", e.message)
            }
        }
    }

    // =========================================================================
    // 🔄 ইঞ্জিন আপডেটার
    // =========================================================================
    @ReactMethod
    fun updateEngine(promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val app = reactApplicationContext.applicationContext as android.app.Application
                YoutubeDL.getInstance().updateYoutubeDL(app, YoutubeDL.UpdateChannel.STABLE)
                promise.resolve("UPDATED_SUCCESSFULLY")
            } catch (e: Exception) {
                promise.reject("UPDATE_ERROR", e.message)
            }
        }
    }
}