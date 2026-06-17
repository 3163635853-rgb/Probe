import { fetchAPI } from "./api";
import type { ActiveInterview } from "./types";
import { router } from "expo-router";
import { Alert, Linking, Platform } from "react-native";
import Constants from "expo-constants";

interface AppVersionResponse {
  latest_version: string;
  min_version: string;
  force_update: boolean;
  update_url: string;
  changelog: string;
}

/**
 * 检查是否有未完成的面试，提示用户恢复
 */
export async function checkActiveInterview(): Promise<void> {
  try {
    const active = await fetchAPI<ActiveInterview | null>("/interview/active");
    if (active && active.session_uuid) {
      // 有活跃面试，直接跳转
      router.replace(`/interview/${active.session_uuid}`);
    }
  } catch {
    // 静默，不影响正常使用
  }
}

/**
 * 检查 App 版本，判断是否需要强制更新
 */
export async function checkAppVersion(): Promise<void> {
  try {
    const currentVersion = Constants.expoConfig?.version || "1.0.0";
    const data = await fetchAPI<AppVersionResponse>("/config/app-version");

    if (compareVersion(currentVersion, data.min_version) < 0) {
      // 强制更新
      Alert.alert(
        "需要更新",
        data.changelog || "请更新到最新版本以继续使用",
        [
          {
            text: "立即更新",
            onPress: () => Linking.openURL(data.update_url),
          },
        ],
        { cancelable: false }
      );
    }
  } catch {
    // 版本检查失败不阻塞使用
  }
}

/**
 * 简单版本比较 (1.0.0 < 1.0.1)
 * 返回: -1 (a < b), 0 (a == b), 1 (a > b)
 */
function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}
