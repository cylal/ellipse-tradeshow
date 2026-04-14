const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');

/**
 * Config plugin to fix Android build issues:
 *
 * 1. Kotlin version mismatch: React Native 0.76.5 ships kotlin 1.9.24 via its
 *    TOML version catalog, but Compose Compiler 1.5.15 requires kotlin 1.9.25.
 *    → Adds resolutionStrategy to force Kotlin 1.9.25.
 *
 * 2. Duplicate libreactnative.so: expo-av links ReactAndroid::reactnative in
 *    RN 0.76+ which bundles libreactnative.so, conflicting with RN's own copy.
 *    → Adds packagingOptions.pickFirst to resolve the conflict.
 */
module.exports = function withKotlinVersion(config, version) {
  // Fix 1: Force Kotlin version in root build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let contents = config.modResults.contents;

      if (!contents.includes('Force Kotlin version')) {
        contents += `

// Force Kotlin version ${version} for Compose Compiler compatibility
allprojects {
    configurations.configureEach {
        resolutionStrategy.eachDependency {
            if (requested.group == "org.jetbrains.kotlin" && requested.name.startsWith("kotlin-")) {
                useVersion("${version}")
            }
        }
    }
}
`;
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  // Fix 2: Add packagingOptions.pickFirst for duplicate native libs
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let contents = config.modResults.contents;

      if (!contents.includes('pickFirst')) {
        // Insert packagingOptions inside the android {} block
        contents = contents.replace(
          /android\s*\{/,
          `android {
    packagingOptions {
        pickFirst 'lib/arm64-v8a/libreactnative.so'
        pickFirst 'lib/x86/libreactnative.so'
        pickFirst 'lib/x86_64/libreactnative.so'
        pickFirst 'lib/armeabi-v7a/libreactnative.so'
    }`
        );
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  return config;
};
