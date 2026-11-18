import Constants from 'expo-constants';

export const APP_VERSION =
  Constants.expoConfig?.version ??
  Constants.nativeAppVersion ??
  '1.0.0';

export const ANDROID_VERSION_CODE =
  Constants.expoConfig?.android?.versionCode ?? 1;
