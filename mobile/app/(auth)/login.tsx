import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Mail, Lock, Eye, EyeOff, MessageCircle } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, register, loginWithWechat } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("请填写邮箱和密码");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (mode === "login" ? "登录失败" : "注册失败"));
    } finally {
      setLoading(false);
    }
  }

  async function handleWechatLogin() {
    const appId = Constants.expoConfig?.extra?.wechatAppId;
    const callbackUrl = Constants.expoConfig?.extra?.wechatCallbackUrl;
    if (!appId || !callbackUrl) {
      setError("微信登录尚未配置，请使用邮箱登录");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const state = Crypto.randomUUID().replaceAll("-", "");
      const returnUrl = Linking.createURL("auth/wechat");
      const oauthCallback = new URL(String(callbackUrl));
      oauthCallback.searchParams.set("return_to", returnUrl);
      const authUrl =
        "https://open.weixin.qq.com/connect/oauth2/authorize" +
        `?appid=${encodeURIComponent(String(appId))}` +
        `&redirect_uri=${encodeURIComponent(oauthCallback.toString())}` +
        "&response_type=code&scope=snsapi_userinfo" +
        `&state=${encodeURIComponent(state)}#wechat_redirect`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      if (result.type !== "success") {
        if (result.type !== "cancel") setError("微信授权未完成");
        return;
      }
      const redirect = new URL(result.url);
      const code = redirect.searchParams.get("code");
      const returnedState = redirect.searchParams.get("state");
      if (!code || returnedState !== state) {
        throw new Error("微信登录状态校验失败");
      }
      await loginWithWechat(code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "微信登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <LinearGradient
        colors={["#fffbeb", "#fafaf9", "#fafaf9"]}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          {/* Logo */}
          <MotiView
            from={{ opacity: 0, translateY: -30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600 }}
            className="items-center mb-12"
          >
            <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary mb-4">
              <Text className="text-3xl font-bold text-white">P</Text>
            </View>
            <Text className="text-3xl font-bold text-foreground tracking-tight">
              Probe
            </Text>
            <Text className="mt-2 text-base text-muted-foreground">
              AI 面试训练
            </Text>
          </MotiView>

          {/* Form */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 200 }}
            className="gap-4"
          >
            {/* Email Input */}
            <View className="flex-row items-center h-14 rounded-xl border border-input bg-white px-4">
              <Mail size={18} color="#78716c" />
              <TextInput
                className="flex-1 ml-3 text-base text-foreground"
                placeholder="邮箱"
                placeholderTextColor="#a8a29e"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                maxLength={100}
              />
            </View>

            {/* Password Input */}
            <View className="flex-row items-center h-14 rounded-xl border border-input bg-white px-4">
              <Lock size={18} color="#78716c" />
              <TextInput
                className="flex-1 ml-3 text-base text-foreground"
                placeholder="密码"
                placeholderTextColor="#a8a29e"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                maxLength={128}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color="#a8a29e" />
                ) : (
                  <Eye size={18} color="#a8a29e" />
                )}
              </Pressable>
            </View>

            {/* Error */}
            {error ? (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
              >
                <Text className="text-sm text-destructive text-center">
                  {error}
                </Text>
              </MotiView>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#f59e0b", "#d97706"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="h-14 items-center justify-center rounded-xl"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-bold text-white">
                    {mode === "login" ? "登录" : "注册"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row items-center gap-3 py-1">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs text-muted-foreground">或</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <TouchableOpacity
              onPress={handleWechatLogin}
              disabled={loading}
              activeOpacity={0.8}
              className="h-14 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-white"
            >
              <MessageCircle size={19} color="#16a34a" />
              <Text className="text-base font-semibold text-foreground">微信登录</Text>
            </TouchableOpacity>
          </MotiView>

          {/* Footer — Toggle mode */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 600, delay: 500 }}
            className="mt-10 items-center"
          >
            <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
              <Text className="text-sm text-muted-foreground">
                {mode === "login" ? "没有账号？立即注册" : "已有账号？去登录"}
              </Text>
            </Pressable>
          </MotiView>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
