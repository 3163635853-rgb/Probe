import { Audio } from "expo-av";
import { Platform } from "react-native";

let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  // 防止重复调用：如果已在录音，先停止之前的
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch {}
    recording = null;
  }

  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) {
    throw new Error("需要麦克风权限才能录音");
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
}

export async function stopRecording(): Promise<{
  uri: string;
  mimeType: string;
}> {
  if (!recording) throw new Error("No active recording");
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  recording = null;

  if (!uri) throw new Error("Recording URI is null");

  const mimeType = Platform.OS === "ios" ? "audio/m4a" : "audio/webm";
  return { uri, mimeType };
}
