import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { fetchAPI } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getDeviceId(): Promise<string> {
  if (Platform.OS === "ios") {
    const id = await Application.getIosIdForVendorAsync();
    return id || "unknown";
  }
  return Application.getAndroidId() || "unknown";
}

export function notificationRoute(data: Record<string, unknown> | undefined): string {
  const screen = typeof data?.screen === "string" ? data.screen : "notifications";
  if (screen === "report" && typeof data?.session_uuid === "string") {
    return `/interview/${data.session_uuid}/report`;
  }
  const routes: Record<string, string> = {
    achievements: "/achievements",
    invite: "/invite",
    growth: "/(main)/growth",
    membership: "/membership",
    notifications: "/notifications",
  };
  return routes[screen] || "/notifications";
}

export async function registerPushToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || typeof projectId !== "string") {
    // EAS 项目尚未绑定时不请求无效 token；邮箱登录和其余功能仍可使用。
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Probe 通知",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    const deviceId = await getDeviceId();
    await fetchAPI("/user/push-token", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        device_id: deviceId,
      }),
    });
    return token;
  } catch {
    // 网络或 Expo 服务失败时，下次启动自动重试。
    return null;
  }
}
