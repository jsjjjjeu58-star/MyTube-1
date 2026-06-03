package com.imtiaz.biodigitaltruth;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import java.util.HashMap;
import java.util.Map;

public class YoutubeDLPackage extends TurboReactPackage {
  @Override
  public NativeModule getModule(String name, ReactApplicationContext context) {
    if (name.equals(YoutubeDLModule.NAME)) {
      return new YoutubeDLModule(context);
    }
    if (name.equals("YtdlpModule")) {
      return new YtdlpModule(context);
    }
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> {
      final Map<String, ReactModuleInfoProvider> moduleInfoMap = new HashMap<>();
      moduleInfoMap.put(
          YoutubeDLModule.NAME,
          new ReactModuleInfo(
              YoutubeDLModule.NAME,
              YoutubeDLModule.NAME,
              false, // canOverrideExistingModule
              false, // needsEagerInit
              true, // hasConstants
              false, // isCxxModule
              true // isTurboModule
          )
      );
      moduleInfoMap.put(
          "YtdlpModule",
          new ReactModuleInfo(
              "YtdlpModule",
              "YtdlpModule",
              false, // canOverrideExistingModule
              false, // needsEagerInit
              true, // hasConstants
              false, // isCxxModule
              true // isTurboModule
          )
      );
      return moduleInfoMap;
    };
  }
}
