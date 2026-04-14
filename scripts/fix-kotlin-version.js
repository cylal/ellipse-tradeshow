/**
 * Postinstall script to fix build compatibility issues.
 *
 * 1. Kotlin version mismatch: React Native 0.76.5 ships with Kotlin 1.9.24
 *    in its version catalog, but expo-modules-core's Compose Compiler 1.5.15
 *    requires Kotlin 1.9.25.
 *
 * 2. expo-av CMake error: expo-av 14.0.7 unconditionally links against
 *    ReactAndroid::reactnativejni, but React Native 0.76+ renamed this
 *    target to ReactAndroid::reactnative. This patches the CMakeLists.txt
 *    to use the correct version-conditional logic.
 */
const fs = require('fs');
const path = require('path');

// --- Fix 1: Kotlin version in TOML ---
const tomlPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'gradle',
  'libs.versions.toml'
);

try {
  if (fs.existsSync(tomlPath)) {
    let content = fs.readFileSync(tomlPath, 'utf8');
    const original = content;

    content = content.replace(
      /kotlin\s*=\s*"1\.9\.24"/,
      'kotlin = "1.9.25"'
    );

    if (content !== original) {
      fs.writeFileSync(tomlPath, content, 'utf8');
      console.log('✅ Patched Kotlin version: 1.9.24 → 1.9.25 in libs.versions.toml');
    } else {
      console.log('ℹ️  Kotlin version already correct or pattern not found');
    }
  } else {
    console.log('⚠️  libs.versions.toml not found at:', tomlPath);
  }
} catch (err) {
  console.error('❌ Failed to patch Kotlin version:', err.message);
}

// --- Fix 2: expo-av CMakeLists.txt for React Native 0.76+ ---
const cmakePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-av',
  'android',
  'CMakeLists.txt'
);

try {
  if (fs.existsSync(cmakePath)) {
    let content = fs.readFileSync(cmakePath, 'utf8');
    const original = content;

    // Replace the unconditional ReactAndroid::reactnativejni link with
    // a version-conditional block (matching expo-modules-core's pattern)
    const oldLinking = `target_link_libraries(
        \${PACKAGE_NAME}
        \${LOG_LIB}
        fbjni::fbjni
        ReactAndroid::jsi
        ReactAndroid::reactnativejni
        android
)`;

    const newLinking = `target_link_libraries(
        \${PACKAGE_NAME}
        \${LOG_LIB}
        fbjni::fbjni
        ReactAndroid::jsi
        android
)

# React Native 0.76+ renamed reactnativejni → reactnative
if (ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(\${PACKAGE_NAME} ReactAndroid::reactnative)
else()
  target_link_libraries(\${PACKAGE_NAME} ReactAndroid::reactnativejni)
endif()`;

    if (content.includes('ReactAndroid::reactnativejni')) {
      content = content.replace(oldLinking, newLinking);

      if (content !== original) {
        fs.writeFileSync(cmakePath, content, 'utf8');
        console.log('✅ Patched expo-av CMakeLists.txt: added RN 0.76+ version-conditional linking');
      } else {
        // Fallback: if exact match failed, do a simpler replacement
        content = original.replace(
          /ReactAndroid::reactnativejni/,
          'ReactAndroid::reactnative'
        );
        if (content !== original) {
          fs.writeFileSync(cmakePath, content, 'utf8');
          console.log('✅ Patched expo-av CMakeLists.txt: replaced reactnativejni → reactnative (simple)');
        } else {
          console.log('ℹ️  expo-av CMakeLists.txt: no change needed');
        }
      }
    } else {
      console.log('ℹ️  expo-av CMakeLists.txt: ReactAndroid::reactnativejni not found (already patched?)');
    }
  } else {
    console.log('⚠️  expo-av CMakeLists.txt not found at:', cmakePath);
  }
} catch (err) {
  console.error('❌ Failed to patch expo-av CMakeLists.txt:', err.message);
}
