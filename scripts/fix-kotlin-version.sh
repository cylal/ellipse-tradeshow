#!/bin/bash
# Fix Kotlin version mismatch between React Native 0.76.5 (kotlin 1.9.24)
# and expo-modules-core Compose Compiler (requires kotlin 1.9.25)
TOML_FILE="node_modules/react-native/gradle/libs.versions.toml"
if [ -f "$TOML_FILE" ]; then
  sed -i.bak 's/kotlin = "1.9.24"/kotlin = "1.9.25"/' "$TOML_FILE"
  echo "✅ Patched Kotlin version to 1.9.25 in $TOML_FILE"
else
  echo "⚠️  $TOML_FILE not found, skipping patch"
fi
