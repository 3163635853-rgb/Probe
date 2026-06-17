import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { fetchAPI } from "./api";

// 前台通知显示配置
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 获取设备唯一标识
 * iOS: identifierForVendor, Android: androidId
 */
async function getDeviceId(): Promise<string> {
  if (Platform.OS === "ios") {
    const id = await Application.getIosIdForVendorAsync();
    return id || "unknown";
  }
  return Application.getAndroidId() || "unknown";
}

export async function registerPushToken(): Promise<string | null> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const token = tokenData.data;

  // 上报后端（含 device_id）
  try {
    const deviceId = await getDeviceId();
    await fetchAPI("/user/push-token", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        device_id: deviceId,
      }),
    });
  } catch {
    // 静默失败，下次启动会重试
  }

  return token;
}
