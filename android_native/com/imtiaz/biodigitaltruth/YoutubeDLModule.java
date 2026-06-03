package com.imtiaz.biodigitaltruth;

import android.content.Context;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import android.util.Log;

@ReactModule(name = "YoutubeDLModule")
public class YoutubeDLModule extends ReactContextBaseJavaModule {
  public static final String NAME = "YoutubeDLModule";

  public YoutubeDLModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void initializeYoutubeDL(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      
      // Initialize YouTube-DL
      com.yausername.youtubedl_android.YoutubeDL.getInstance().init(context);
      
      Log.d("YoutubeDLModule", "YouTube-DL initialized successfully");
      promise.resolve("YouTube-DL initialized successfully");
    } catch (Exception e) {
      Log.e("YoutubeDLModule", "Failed to initialize YouTube-DL: ", e);
      promise.reject("YOUTUBE_DL_INIT_ERROR", "Failed to initialize YouTube-DL", e);
    }
  }

  @ReactMethod
  public void getYoutubeDLVersion(Promise promise) {
    try {
      String version = com.yausername.youtubedl_android.YoutubeDL.getInstance().version(getReactApplicationContext());
      promise.resolve(version);
    } catch (Exception e) {
      promise.reject("YOUTUBE_DL_VERSION_ERROR", "Failed to get YouTube-DL version", e);
    }
  }
}
