import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Burnt from "burnt";
import { BookOpenText, Building2, Code2, FileUser, Repeat2, Upload, Video } from "lucide-react-native";

import { fetchAPI, uploadFile } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import type { InterviewHistoryItem, PaginatedData } from "@/lib/types";

type Tab = "career" | "practice" | "video" | "coach" | "enterprise" | "technical";
type Resume = { uuid: string; name: string; is_active: boolean; parsed: { completeness?: { score?: number }; skills?: string[] } };
type Story = { uuid: string; title: string; action?: string; result?: string; quality?: { score: number; issues: string[] } };
type Drill = { code: string; name: string; duration_min: number; dimension: string; prompt: string };
type Optimized = { structured: string; concise: string; star: string; outline: string[]; fact_warnings: string[] };
type Analysis = { uuid: string; session_uuid?: string; overall_score: number; duration_sec?: number; delivery_metrics: Record<string, number>; visual_metrics: Record<string, number | boolean> };
type Review = { uuid: string; session_uuid: string; status: string; rating?: number; comments: string; video?: { uuid: string; overall_score?: number } | null };
type AttemptResult = { score: number; optimized_answers: Optimized; comparison: { score_delta: number }; xp_awarded: number };
type Org = { uuid: string; name: string; slug: string; role: string };
type Exercise = { code: string; kind: string; title: string; prompt: string; language: string };

const TABS: { key: Tab; label: string; icon: typeof FileUser }[] = [
  { key: "career", label: "经历", icon: FileUser },
  { key: "practice", label: "复练", icon: Repeat2 },
  { key: "video", label: "表达", icon: Video },
  { key: "coach", label: "教练", icon: BookOpenText },
  { key: "enterprise", label: "组织", icon: Building2 },
  { key: "technical", label: "技术", icon: Code2 },
];

export default function StudioScreen() {
  const [tab, setTab] = useState<Tab>("career");
  return <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View className="px-6 pb-4 pt-5"><Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">Training Studio</Text><Text className="mt-1 text-3xl font-bold text-foreground">训练室</Text><Text className="mt-2 text-sm leading-6 text-muted-foreground">把反馈接到下一次练习，而不是看完报告就结束。</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {TABS.map((item) => { const Icon = item.icon; const active = item.key === tab; return <TouchableOpacity key={item.key} onPress={() => setTab(item.key)} className={`flex-row items-center gap-2 rounded-full px-4 py-2.5 ${active ? "bg-primary" : "border border-border bg-white"}`}><Icon size={15} color={active ? "white" : "#78716c"} /><Text className={`text-xs font-semibold ${active ? "text-white" : "text-foreground"}`}>{item.label}</Text></TouchableOpacity>; })}
      </ScrollView>
      <View className="mt-5 px-5">
        {tab === "career" && <CareerSection />}
        {tab === "practice" && <PracticeSection />}
        {tab === "video" && <VideoSection />}
        {tab === "coach" && <CoachSection />}
        {tab === "enterprise" && <EnterpriseSection />}
        {tab === "technical" && <TechnicalSection />}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function CareerSection() {
  const { data: resumes, refetch: refetchResumes } = useFetch<Resume[]>("/career/resumes");
  const { data: stories, refetch: refetchStories } = useFetch<Story[]>("/career/stories");
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(""); const [action, setAction] = useState(""); const [result, setResult] = useState("");
  async function pickResume() {
    const picked = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"], copyToCacheDirectory: true });
    if (picked.canceled) return;
    const asset = picked.assets[0]; const form = new FormData();
    form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" } as unknown as Blob);
    setUploading(true);
    try { await uploadFile("/career/resumes?create_stories=true", form); Burnt.toast({ title: "简历解析完成", preset: "done" }); await Promise.all([refetchResumes(), refetchStories()]); } catch (error) { showError(error); } finally { setUploading(false); }
  }
  async function addStory() {
    if (!title.trim()) return;
    try { await fetchAPI("/career/stories", { method: "POST", body: JSON.stringify({ title, action, result, situation: "", task: "", tags: [], metrics: {}, is_favorite: false }) }); setTitle(""); setAction(""); setResult(""); Burnt.toast({ title: "故事已保存", preset: "done" }); refetchStories(); } catch (error) { showError(error); }
  }
  return <View className="gap-4"><Card title="简历证据库"><Text className="text-sm leading-6 text-muted-foreground">上传 PDF / DOCX / TXT，自动识别技能和量化成果。</Text><PrimaryButton label={uploading ? "解析中…" : "上传简历"} icon={<Upload size={16} color="white" />} onPress={pickResume} disabled={uploading} />{resumes?.map((item) => <View key={item.uuid} className="mt-2 rounded-xl bg-secondary p-3"><View className="flex-row justify-between"><Text className="flex-1 font-semibold text-foreground" numberOfLines={1}>{item.name}</Text>{item.is_active && <Text className="text-xs font-semibold text-success">当前</Text>}</View><Text className="mt-1 text-xs text-muted-foreground">完整度 {item.parsed.completeness?.score || 0} · {(item.parsed.skills || []).slice(0, 4).join(" / ")}</Text></View>)}</Card><Card title="新增 STAR 故事"><Field value={title} onChangeText={setTitle} placeholder="故事标题" /><Field value={action} onChangeText={setAction} placeholder="我做了什么" multiline /><Field value={result} onChangeText={setResult} placeholder="量化结果" multiline /><PrimaryButton label="保存到经历库" onPress={addStory} /></Card><Card title={`故事库存 · ${stories?.length || 0}`}>{stories?.map((item) => <View key={item.uuid} className="mb-2 rounded-xl border border-border p-3"><View className="flex-row justify-between"><Text className="font-semibold text-foreground">{item.title}</Text><Text className="text-xs text-primary">{item.quality?.score || 0}</Text></View><Text className="mt-1 text-xs leading-5 text-muted-foreground">A {item.action || "待补充"}{"\n"}R {item.result || "待补充"}</Text></View>)}</Card></View>;
}

function PracticeSection() {
  const { data: drills } = useFetch<Drill[]>("/practice/drills");
  const { data: history, refetch: refetchHistory } = useFetch<{ uuid: string; drill_code: string; score: number; created_at: string }[]>("/practice/drills/attempts?limit=10");
  const [selected, setSelected] = useState<Drill | null>(null); const [answer, setAnswer] = useState(""); const [result, setResult] = useState<AttemptResult | null>(null); const [loading, setLoading] = useState(false);
  async function optimize() { if (!selected || !answer.trim()) return; setLoading(true); try { const data = await fetchAPI<AttemptResult>(`/practice/drills/${selected.code}/attempts`, { method: "POST", body: JSON.stringify({ question: selected.prompt, answer, difficulty: 3, duration_sec: Math.round(answer.length / 4.2), focus: selected.dimension }) }); setResult(data); Burnt.toast({ title: `训练已保存${data.xp_awarded ? ` · +${data.xp_awarded} XP` : ""}`, preset: "done" }); refetchHistory(); } catch (error) { showError(error); } finally { setLoading(false); } }
  return <View className="gap-4"><Card title="弱项专项训练"><View className="flex-row flex-wrap gap-2">{drills?.map((item) => <TouchableOpacity key={item.code} onPress={() => { setSelected(item); setAnswer(""); setResult(null); }} className={`rounded-full px-3 py-2 ${selected?.code === item.code ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${selected?.code === item.code ? "text-white" : "text-foreground"}`}>{item.name} · {item.duration_min}m</Text></TouchableOpacity>)}</View></Card>{selected && <Card title={selected.name}><Text className="rounded-xl bg-secondary p-3 text-sm leading-6 text-foreground">{selected.prompt}</Text><Field value={answer} onChangeText={setAnswer} placeholder="完整回答一次…" multiline /><PrimaryButton label={loading ? "评分并保存中…" : "评分、保存并生成优化版本"} onPress={optimize} disabled={loading || !answer.trim()} />{result && <View className="gap-3"><View className="flex-row gap-2"><MetricBox label="本次得分" value={`${result.score}/10`} /><MetricBox label="较上次" value={`${result.comparison.score_delta >= 0 ? "+" : ""}${result.comparison.score_delta}`} /><MetricBox label="XP" value={`+${result.xp_awarded}`} /></View><AnswerVersion title="60 秒版" text={result.optimized_answers.concise} /><AnswerVersion title="STAR 版" text={result.optimized_answers.star} /></View>}</Card>}{history?.length ? <Card title="最近训练">{history.map((item) => <View key={item.uuid} className="mb-2 flex-row justify-between rounded-xl bg-secondary p-3"><Text className="text-sm text-foreground">{drills?.find((drill) => drill.code === item.drill_code)?.name || item.drill_code}</Text><Text className="font-semibold text-primary">{item.score}/10</Text></View>)}</Card> : null}</View>;
}

function VideoSection() {
  const { data: history, refetch } = useFetch<Analysis[]>("/video/analyses");
  const { data: sessions } = useFetch<PaginatedData<InterviewHistoryItem>>("/interview/history?page=1&page_size=30");
  const [transcript, setTranscript] = useState(""); const [loading, setLoading] = useState(false); const [analysis, setAnalysis] = useState<Analysis | null>(null); const [sessionUuid, setSessionUuid] = useState("");
  async function analyzeAsset(asset: { uri: string; name: string; type: string }) { const form = new FormData(); form.append("file", { uri: asset.uri, name: asset.name, type: asset.type } as unknown as Blob); form.append("transcript", transcript); form.append("session_uuid", sessionUuid); setLoading(true); try { const data = await uploadFile<Analysis>("/video/analyze", form); setAnalysis(data); Burnt.toast({ title: "表达分析完成", preset: "done" }); refetch(); } catch (error) { showError(error); } finally { setLoading(false); } }
  async function pickVideo() { const picked = await DocumentPicker.getDocumentAsync({ type: ["video/*", "audio/*"], copyToCacheDirectory: true }); if (picked.canceled) return; const asset = picked.assets[0]; await analyzeAsset({ uri: asset.uri, name: asset.name, type: asset.mimeType || "video/mp4" }); }
  async function recordVideo() { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { Burnt.toast({ title: "需要摄像头权限", preset: "error" }); return; } const captured = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: 300, quality: 1 }); if (captured.canceled) return; const asset = captured.assets[0]; await analyzeAsset({ uri: asset.uri, name: asset.fileName || `probe-${Date.now()}.mp4`, type: asset.mimeType || "video/mp4" }); }
  const current = analysis || history?.[0];
  return <View className="gap-4"><Card title="录像表达分析"><Text className="text-sm leading-6 text-muted-foreground">选择一份已完成面试后录制，表达分会自动合并进该报告，并可授权给真人教练。</Text><Text className="mb-2 text-xs font-semibold text-muted-foreground">关联面试</Text>{sessions?.items.filter((item) => item.status === "completed").slice(0, 6).map((item) => <TouchableOpacity key={item.session_uuid} onPress={() => setSessionUuid(item.session_uuid)} className={`mb-2 rounded-xl border p-3 ${sessionUuid === item.session_uuid ? "border-primary bg-accent" : "border-border"}`}><Text className="text-sm font-semibold text-foreground">{item.position || "通用岗位"} · {item.final_score || 0} 分</Text></TouchableOpacity>)}<Field value={transcript} onChangeText={setTranscript} placeholder="可选：粘贴转写文本" multiline /><View className="flex-row gap-2"><View className="flex-1"><PrimaryButton label={loading ? "分析中…" : "直接录制"} icon={<Video size={16} color="white" />} onPress={recordVideo} disabled={loading} /></View><View className="flex-1"><PrimaryButton label="选择录像" onPress={pickVideo} disabled={loading} /></View></View></Card>{current && <Card title={`表达表现 ${current.overall_score}/100`}><MetricRow label="语速" value={`${current.delivery_metrics.words_per_minute || 0} 字/分`} /><MetricRow label="填充词" value={`${current.delivery_metrics.filler_count || 0} 次`} /><MetricRow label="重复表达" value={`${current.delivery_metrics.repetition_count || 0} 处`} /><MetricRow label="真实停顿" value={`${current.delivery_metrics.audio_pause_count || 0} 次`} /><MetricRow label="开场沉默" value={`${current.delivery_metrics.opening_silence_sec || 0} 秒`} /><MetricRow label="音量稳定" value={`${current.delivery_metrics.volume_stability || 0}/100`} /><MetricRow label="面部出现" value={current.visual_metrics.available ? `${Math.round(Number(current.visual_metrics.face_presence_ratio || 0) * 100)}%` : "未分析"} /></Card>}</View>;
}

function CoachSection() {
  const { data: history } = useFetch<PaginatedData<InterviewHistoryItem>>("/interview/history?page=1&page_size=50"); const { data: reviews, refetch } = useFetch<Review[]>("/coach/reviews"); const { data: videos } = useFetch<Analysis[]>("/video/analyses"); const sessions = history?.items.filter((item) => item.status === "completed") || []; const [selected, setSelected] = useState(""); const [focus, setFocus] = useState(""); const [videoUuid, setVideoUuid] = useState(""); const [consent, setConsent] = useState(false); const [loading, setLoading] = useState(false);
  async function submit() { if (!selected || (videoUuid && !consent)) return; setLoading(true); try { await fetchAPI("/coach/reviews", { method: "POST", body: JSON.stringify({ session_uuid: selected, focus, video_uuid: videoUuid, consent_video: consent }) }); Burnt.toast({ title: "已提交真人点评", preset: "done" }); setFocus(""); setVideoUuid(""); setConsent(false); refetch(); } catch (error) { showError(error); } finally { setLoading(false); } }
  async function cancel(uuid: string) { try { await fetchAPI(`/coach/reviews/${uuid}`, { method: "DELETE" }); Burnt.toast({ title: "已撤销点评和录像授权", preset: "done" }); refetch(); } catch (error) { showError(error); } }
  return <View className="gap-4"><Card title="选择面试报告">{sessions.map((item) => <TouchableOpacity key={item.session_uuid} onPress={() => { setSelected(item.session_uuid); setVideoUuid(""); setConsent(false); }} className={`mb-2 rounded-xl border p-3 ${selected === item.session_uuid ? "border-primary bg-accent" : "border-border"}`}><Text className="font-semibold text-foreground">{item.position || "通用岗位"} · {item.final_score || 0} 分</Text><Text className="mt-1 text-xs text-muted-foreground">{new Date(item.started_at).toLocaleDateString("zh-CN")}</Text></TouchableOpacity>)}{selected && <><Text className="mb-2 text-xs font-semibold text-muted-foreground">关联录像（可选）</Text>{videos?.filter((item) => item.session_uuid === selected).map((item) => <TouchableOpacity key={item.uuid} onPress={() => { setVideoUuid(item.uuid); setConsent(false); }} className={`mb-2 rounded-xl border p-3 ${videoUuid === item.uuid ? "border-primary bg-accent" : "border-border"}`}><Text className="text-sm text-foreground">表达分 {item.overall_score} · {item.duration_sec || 0} 秒</Text></TouchableOpacity>)}</>}{videoUuid && <TouchableOpacity onPress={() => setConsent((value) => !value)} className="mb-3 flex-row items-start gap-2 rounded-xl bg-accent p-3"><View className={`mt-0.5 h-4 w-4 rounded border ${consent ? "border-primary bg-primary" : "border-border bg-white"}`} /><Text className="flex-1 text-xs leading-5 text-foreground">授权领取任务的教练在有效期内查看这段录像，用于点评。</Text></TouchableOpacity>}<Field value={focus} onChangeText={setFocus} placeholder="希望教练重点点评…" multiline /><PrimaryButton label={loading ? "提交中…" : "提交点评申请"} onPress={submit} disabled={!selected || loading || (!!videoUuid && !consent)} /></Card><Card title="点评进度">{reviews?.map((item) => <View key={item.uuid} className="mb-2 rounded-xl bg-secondary p-3"><View className="flex-row justify-between"><Text className="font-semibold text-foreground">{item.session_uuid.slice(0, 8)}</Text><Text className="text-xs text-primary">{item.status}</Text></View>{item.video ? <Text className="mt-1 text-xs text-primary">已授权录像 · 表达分 {item.video.overall_score || 0}</Text> : null}{item.comments ? <Text className="mt-2 text-sm leading-6 text-foreground">{item.comments}</Text> : <TouchableOpacity onPress={() => cancel(item.uuid)} className="mt-2"><Text className="text-xs text-destructive">取消并撤销授权</Text></TouchableOpacity>}</View>)}</Card></View>;
}

function EnterpriseSection() {
  const { data: orgs, refetch } = useFetch<Org[]>("/enterprise/organizations"); const [name, setName] = useState(""); const [slug, setSlug] = useState("");
  async function create() { if (!name.trim() || !slug.trim()) return; try { await fetchAPI("/enterprise/organizations", { method: "POST", body: JSON.stringify({ name, slug }) }); setName(""); setSlug(""); Burnt.toast({ title: "组织空间已创建", preset: "done" }); refetch(); } catch (error) { showError(error); } }
  return <View className="gap-4"><Card title="组织空间"><Text className="text-sm leading-6 text-muted-foreground">Web 端提供完整成员、题库、Rubric、SSO、数据保留、审计和导出后台。移动端用于查看与快速创建。</Text>{orgs?.map((item) => <View key={item.uuid} className="mt-2 rounded-xl bg-secondary p-3"><Text className="font-semibold text-foreground">{item.name}</Text><Text className="mt-1 text-xs text-muted-foreground">{item.slug} · {item.role}</Text></View>)}</Card><Card title="新建组织"><Field value={name} onChangeText={setName} placeholder="组织名称" /><Field value={slug} onChangeText={setSlug} placeholder="英文标识" /><PrimaryButton label="创建空间" onPress={create} /></Card></View>;
}

function TechnicalSection() {
  const { data: exercises } = useFetch<Exercise[]>("/technical/exercises"); const [selected, setSelected] = useState<Exercise | null>(null); const [content, setContent] = useState(""); const [loading, setLoading] = useState(false); const [score, setScore] = useState<number | null>(null);
  async function evaluate() { if (!selected || !content.trim()) return; setLoading(true); try { const data = await fetchAPI<{ score: number }>("/technical/evaluate", { method: "POST", body: JSON.stringify({ kind: selected.kind, prompt: selected.prompt, content, language: selected.language }) }); setScore(data.score); } catch (error) { showError(error); } finally { setLoading(false); } }
  return <View className="gap-4"><Card title="技术面工具">{exercises?.map((item) => <TouchableOpacity key={item.code} onPress={() => { setSelected(item); setContent(""); setScore(null); }} className={`mb-2 rounded-xl border p-3 ${selected?.code === item.code ? "border-primary bg-accent" : "border-border"}`}><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-xs leading-5 text-muted-foreground">{item.prompt}</Text></TouchableOpacity>)}</Card>{selected && <Card title={selected.title}><Field value={content} onChangeText={setContent} placeholder={selected.kind === "whiteboard" ? "输入白板 JSON" : "输入代码、SQL 或排查方案"} multiline mono /><PrimaryButton label={loading ? "评估中…" : "提交技术面评估"} onPress={evaluate} disabled={loading || !content.trim()} />{score !== null && <View className="items-center rounded-xl bg-accent p-5"><Text className="text-5xl font-bold text-primary">{score}</Text><Text className="mt-1 text-xs text-muted-foreground">技术面得分</Text></View>}</Card>}</View>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <View className="rounded-2xl border border-border bg-white p-5"><Text className="mb-4 text-lg font-bold text-foreground">{title}</Text>{children}</View>; }
function Field({ value, onChangeText, placeholder, multiline = false, mono = false }: { value: string; onChangeText: (text: string) => void; placeholder: string; multiline?: boolean; mono?: boolean }) { return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#a8a29e" multiline={multiline} textAlignVertical={multiline ? "top" : "center"} className={`mb-3 rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground ${multiline ? "min-h-28" : ""} ${mono ? "font-mono" : ""}`} />; }
function PrimaryButton({ label, onPress, disabled = false, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: React.ReactNode }) { return <TouchableOpacity onPress={onPress} disabled={disabled} className={`mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 ${disabled ? "opacity-50" : ""}`}>{icon}{disabled && label.includes("…") ? <ActivityIndicator size="small" color="white" /> : null}<Text className="font-semibold text-white">{label}</Text></TouchableOpacity>; }
function AnswerVersion({ title, text }: { title: string; text: string }) { return <View className="rounded-xl border border-border p-3"><Text className="text-xs font-semibold text-primary">{title}</Text><Text className="mt-2 text-sm leading-6 text-foreground">{text}</Text></View>; }
function MetricBox({ label, value }: { label: string; value: string }) { return <View className="flex-1 items-center rounded-xl bg-secondary p-3"><Text className="text-base font-bold text-primary">{value}</Text><Text className="mt-1 text-[10px] text-muted-foreground">{label}</Text></View>; }
function MetricRow({ label, value }: { label: string; value: string }) { return <View className="flex-row justify-between border-b border-border py-3 last:border-b-0"><Text className="text-sm text-muted-foreground">{label}</Text><Text className="font-semibold text-foreground">{value}</Text></View>; }
function showError(error: unknown) { Burnt.toast({ title: "操作失败", message: error instanceof Error ? error.message : "请稍后重试", preset: "error", haptic: "error" }); }
