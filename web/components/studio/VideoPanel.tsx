"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Loader2, Play, RefreshCw, Upload, Video as VideoIcon } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useFetch } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

type Analysis = {
  uuid: string;
  duration_sec?: number;
  transcript?: string;
  delivery_metrics: { score?: number; words_per_minute?: number; filler_count?: number; filler_rate?: number; pause_estimate?: number; long_sentence_count?: number; repetition_count?: number };
  visual_metrics: { available?: boolean; face_presence_ratio?: number; eye_visibility_ratio?: number; centered_face_ratio?: number; visual_score?: number; note?: string };
  overall_score?: number;
  media_url: string;
  created_at: string;
};

export function VideoPanel() {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: analyses, refetch } = useFetch<Analysis[]>("/video/analyses");
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Analysis | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function enableCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "无法访问摄像头和麦克风"));
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const preferred = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setPreviewUrl(url);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.controls = true;
        void videoRef.current.play();
      }
    };
    recorderRef.current = recorder;
    recorder.start(500);
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function analyzeFile(file?: File | Blob, name = "probe-recording.webm") {
    if (!file) return;
    const data = new FormData();
    data.append("file", file, name);
    data.append("transcript", transcript);
    setUploading(true);
    try {
      const result = await fetchAPI<Analysis>("/video/analyze", { method: "POST", body: data });
      setSelected(result);
      toast.success("表达分析完成");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "视频分析失败"));
    } finally {
      setUploading(false);
    }
  }

  function mediaUrl(item: Analysis) {
    const token = getToken();
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
    const origin = apiBase.startsWith("http") ? new URL(apiBase).origin : "";
    return `${origin}${item.media_url}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">视频表达训练</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">第一版只做可解释指标：语速、填充词、重复、时长，以及面部居中和眼部可见比例。</p>
          <div className="mt-5 overflow-hidden rounded-2xl bg-stone-950">
            <video ref={videoRef} muted={!previewUrl} playsInline className="aspect-video w-full object-cover" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!cameraReady && !recordedBlob && <button onClick={enableCamera} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Camera className="h-4 w-4" />开启摄像头</button>}
            {cameraReady && !recording && <button onClick={startRecording} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white"><span className="h-2.5 w-2.5 rounded-full bg-white" />开始录制</button>}
            {recording && <button onClick={stopRecording} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white"><CircleStop className="h-4 w-4" />结束录制</button>}
            {recordedBlob && <button onClick={() => analyzeFile(recordedBlob)} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}分析这次录像</button>}
            {recordedBlob && <button onClick={() => { setRecordedBlob(null); setPreviewUrl(""); void enableCamera(); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"><RefreshCw className="h-4 w-4" />重录</button>}
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={(event) => analyzeFile(event.target.files?.[0], event.target.files?.[0]?.name)} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"><VideoIcon className="h-4 w-4" />上传已有录像</button>
          </div>
          <label className="mt-4 block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">可选：粘贴转写文本（留空时调用语音识别）</span><textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={4} placeholder="嗯，我当时主要负责…" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">最近分析</h2>
          <div className="mt-4 space-y-2">
            {analyses?.map((item) => <button key={item.uuid} onClick={() => setSelected(item)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selected?.uuid === item.uuid ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}><span><span className="block text-sm font-semibold">表达分 {item.overall_score ?? 0}</span><span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("zh-CN")}</span></span><Play className="h-4 w-4 text-primary" /></button>)}
            {analyses?.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">完成一段录像后，分析记录会保存在这里。</p>}
          </div>
        </div>
      </section>

      {selected && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="lg:w-[42%]"><video src={mediaUrl(selected)} controls className="aspect-video w-full rounded-xl bg-black object-contain" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-3"><span className="text-5xl font-bold text-primary">{selected.overall_score ?? 0}</span><span className="pb-1 text-sm text-muted-foreground">表达表现 / 100</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Metric label="语速" value={`${selected.delivery_metrics.words_per_minute ?? 0} 字/分`} />
                <Metric label="填充词" value={`${selected.delivery_metrics.filler_count ?? 0} 次`} />
                <Metric label="重复表达" value={`${selected.delivery_metrics.repetition_count ?? 0} 处`} />
                <Metric label="长句" value={`${selected.delivery_metrics.long_sentence_count ?? 0} 句`} />
                <Metric label="面部出现" value={selected.visual_metrics.available ? `${Math.round((selected.visual_metrics.face_presence_ratio ?? 0) * 100)}%` : "未分析"} />
                <Metric label="眼部可见" value={selected.visual_metrics.available ? `${Math.round((selected.visual_metrics.eye_visibility_ratio ?? 0) * 100)}%` : "未分析"} />
              </div>
              {selected.transcript && <details className="mt-4 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">查看转写</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.transcript}</p></details>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-base font-semibold">{value}</p></div>;
}
