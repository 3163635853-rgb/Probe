"use client";

import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { getToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";

interface VoiceInputProps {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscribed, disabled }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const toast = useToast();

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast.error("无法访问麦克风");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      if (json.data.text) {
        onTranscribed(json.data.text);
      } else {
        toast.warning("未识别到语音内容");
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "语音识别失败"));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled || processing}
      className={`rounded-xl p-3 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors disabled:opacity-40 ${
        recording
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      title={recording ? "停止录音" : processing ? "识别中" : "语音输入"}
    >
      {processing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : recording ? (
        <Square className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
