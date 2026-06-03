const { withBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withYoutubeDLModule(config) {
  return withBuildGradle(config, async (config) => {
    const buildGradle = config.modResults.contents;
    
    // Add YouTube-DL dependencies if not already present
    if (!buildGradle.includes('youtubedl-android')) {
      const dependenciesStart = buildGradle.indexOf('dependencies {');
      if (dependenciesStart !== -1) {
        const dependenciesEnd = buildGradle.indexOf('}', dependenciesStart);
        const beforeDeps = buildGradle.substring(0, dependenciesEnd);
        const afterDeps = buildGradle.substring(dependenciesEnd);
        
        const youtubeDLDeps = `
    // YouTube-DL Android Library
    implementation 'com.github.yausername.youtubedl-android:library:0.16.+'
    implementation 'com.github.yausername.youtubedl-android:ffmpeg:0.16.+'`;
        
        config.modResults.contents = beforeDeps + youtubeDLDeps + '\n' + afterDeps;
      }
    }
    
    return config;
  });
};
