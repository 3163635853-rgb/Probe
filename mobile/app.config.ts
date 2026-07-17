import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {
    ...config,
    name: config.name || "Probe",
    slug: config.slug || "probe",
    extra: {
      ...config.extra,
      eas: easProjectId ? { projectId: easProjectId } : {},
      wechatAppId: process.env.EXPO_PUBLIC_WECHAT_APP_ID || "",
      wechatCallbackUrl:
        process.env.EXPO_PUBLIC_WECHAT_CALLBACK_URL ||
        "https://probe.app/auth/wechat/callback",
    },
  };
};
