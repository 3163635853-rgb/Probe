"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, Pause, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { getToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";

interface AudioPlayerProps {
  text: string;
  voice?: "female" | "male";
}

export function AudioPlayer({ text, voice = "female" }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  async function play() {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/speech/tts?text=${encodeURIComponent(text)}&voice=${voice}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("语音合成失败");

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        toast.error("播放失败");
      };
      await audio.play();
      setPlaying(true);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "语音合成失败"));
    } finally {
      setLoading(false);
    }
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return (
    <button
      onClick={play}
      disabled={loading || !text}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
      title={playing ? "暂停" : "朗读"}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : playing ? (
        <Pause className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
