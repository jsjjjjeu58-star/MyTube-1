package com.imtiaz.biodigitaltruth

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import org.json.JSONObject
import org.json.JSONArray
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class YtdlpModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "YtdlpModule"
    }

    @ReactMethod
    fun extractVideoInfo(videoUrl: String, requestedQuality: String, action: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                // ১. ইউটিউব-ডিএল রিকোয়েস্ট তৈরি
                val request = YoutubeDLRequest(videoUrl)
                request.addOption("-J") // JSON ফরম্যাটে ডাটা চাই
                request.addOption("--no-warnings")
                request.addOption("--no-playlist")
                request.addOption("--no-check-certificate")

                // ২. রিকোয়েস্টটি এক্সিকিউট করা (লিংক বের করা)
                val response = YoutubeDL.getInstance().execute(request, null, null)
                val stdout = response.out

                if (stdout.isNullOrEmpty()) {
                    promise.reject("EXTRACTION_ERROR", "No data received from yt-dlp")
                    return@launch
                }

                // ३. JSON পার্সিং এবং আপনার অ্যাপের শর্তের লজিক প্রয়োগ
                val output = JSONObject(stdout)
                val formats = output.optJSONArray("formats") ?: JSONArray()
                
                val resultObj = JSONObject()
                resultObj.put("success", true)

                var finalVideoUrl: String? = null
                var finalAudioUrl: String? = null
                var streamType = "combined"
                var actualQuality = "Auto"
                val reqQ = requestedQuality.toIntOrNull() ?: 720

                // কম্বাইন্ড ফরম্যাট খোঁজা (Audio + Video)
                for (i in formats.length() - 1 downTo 0) {
                    val f = formats.optJSONObject(i) ?: continue
                    val h = f.optInt("height", 0)
                    val vcodec = f.optString("vcodec", "none")
                    val acodec = f.optString("acodec", "none")
                    val ext = f.optString("ext", "")

                    if (h in 1..reqQ && vcodec != "none" && acodec != "none" && (ext == "mp4" || ext == "webm")) {
                        finalVideoUrl = f.optString("url", null)
                        actualQuality = "${h}p"
                        break
                    }
                }

                // যদি কম্বাইন্ড না পায়, তবে আলাদা আলাদা খোঁজা (যেমন 1080p)
                if (finalVideoUrl == null || reqQ > 720) {
                    var vOnlyUrl: String? = null
                    var aOnlyUrl: String? = null

                    for (i in formats.length() - 1 downTo 0) {
                        val f = formats.optJSONObject(i) ?: continue
                        val h = f.optInt("height", 0)
                        val vcodec = f.optString("vcodec", "none")
                        val acodec = f.optString("acodec", "none")
                        val ext = f.optString("ext", "")

                        if (vOnlyUrl == null && h in 1..reqQ && vcodec != "none" && acodec == "none" && (ext == "mp4" || ext == "webm")) {
                            vOnlyUrl = f.optString("url", null)
                            actualQuality = "${h}p"
                        }
                        if (aOnlyUrl == null && acodec != "none" && vcodec == "none") {
                            aOnlyUrl = f.optString("url", null)
                        }
                        
                        if (vOnlyUrl != null && aOnlyUrl != null) break
                    }

                    if (vOnlyUrl != null && aOnlyUrl != null) {
                        finalVideoUrl = vOnlyUrl
                        finalAudioUrl = aOnlyUrl
                        streamType = "separate"
                    }
                }

                // Fallback (কিছুই না পেলে ডিফল্ট)
                if (finalVideoUrl == null) {
                    finalVideoUrl = output.optString("url", null)
                    actualQuality = "Fallback"
                }

                resultObj.put("url", finalVideoUrl)
                resultObj.put("audioUrl", finalAudioUrl)
                resultObj.put("streamType", streamType)
                resultObj.put("actualQuality", actualQuality)

                // সিসি (Captions) ডাটা যুক্ত করা (আপনার সার্ভারের মতো)
                val captionsArray = JSONArray()
                // ... (আপনার আগের সার্ভারের সিসি লজিক এখানে যুক্ত করা যাবে, আপাতত খালি রাখলাম) ...
                resultObj.put("captions", captionsArray)

                // ৮. React Native-এ ডাটা পাঠানো
                promise.resolve(resultObj.toString())

            } catch (e: Exception) {
                promise.reject("YT_DLP_ERROR", e.message, e)
            }
        }
    }
}
