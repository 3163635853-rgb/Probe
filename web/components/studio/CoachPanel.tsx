"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenCheck, Clock3, Loader2, MessageSquareText, Star } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useFetch } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import type { InterviewHistoryItem, PaginatedData } from "@/lib/types";

type Review = { uuid: string; session_uuid: string; status: "pending" | "claimed" | "completed"; focus: string; rating?: number; comments: string; annotations: Array<{ round?: number; comment?: string }>; created_at: string; completed_at?: string; video?: { uuid: string; duration_sec?: number; overall_score?: number; media_url: string } | null; video_consent: boolean };
type VideoOption = { uuid: string; session_uuid?: string; duration_sec?: number; overall_score?: number; created_at: string };

export function CoachPanel() {
  const toast = useToast();
  const { data: history } = useFetch<PaginatedData<InterviewHistoryItem>>("/interview/history?page=1&page_size=50");
  const { data: reviews, refetch } = useFetch<Review[]>("/coach/reviews");
  const { data: videos } = useFetch<VideoOption[]>("/video/analyses");
  const completed = history?.items.filter((item) => item.status === "completed") || [];
  const [sessionUuid, setSessionUuid] = useState("");
  const [focus, setFocus] = useState("");
  const [videoUuid, setVideoUuid] = useState("");
  const [consentVideo, setConsentVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!sessionUuid) return;
    setSubmitting(true);
    try {
      await fetchAPI("/coach/reviews", { method: "POST", body: JSON.stringify({ session_uuid: sessionUuid, focus, video_uuid: videoUuid, consent_video: consentVideo }) });
      toast.success("已提交真人教练点评");
      setFocus(""); setVideoUuid(""); setConsentVideo(false); refetch();
    } catch (error) { toast.error(getErrorMessage(error, "提交失败")); } finally { setSubmitting(false); }
  }

  async function cancelReview(uuid: string) {
    try { await fetchAPI(`/coach/reviews/${uuid}`, { method: "DELETE" }); toast.success("点评已取消，录像访问已撤销"); refetch(); } catch (error) { toast.error(getErrorMessage(error, "取消失败")); }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">提交真人点评</h2></div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">把完整报告与关联录像交给行业教练。AI 负责高频训练，真人聚焦更细的判断和策略。</p>
          <label className="mt-5 block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">选择已完成面试</span><select value={sessionUuid} onChange={(event) => setSessionUuid(event.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">请选择</option>{completed.map((item) => <option key={item.session_uuid} value={item.session_uuid}>{item.position || "通用岗位"} · {item.final_score ?? 0} 分 · {new Date(item.started_at).toLocaleDateString("zh-CN")}</option>)}</select></label>
          <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">关联录像（可选）</span><select value={videoUuid} onChange={(event) => { setVideoUuid(event.target.value); setConsentVideo(false); }} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">不提交录像</option>{videos?.filter((item) => item.session_uuid === sessionUuid).map((item) => <option key={item.uuid} value={item.uuid}>表达分 {item.overall_score ?? 0} · {item.duration_sec ?? 0} 秒</option>)}</select></label>
          {videoUuid && <label className="mt-3 flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs leading-5"><input type="checkbox" checked={consentVideo} onChange={(event) => setConsentVideo(event.target.checked)} className="mt-1" /><span>我授权领取本次任务的教练在有效期内查看该录像，用于点评；访问会被记录，可通过取消点评终止后续访问。</span></label>}
          <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">希望教练重点看什么</span><textarea value={focus} onChange={(event) => setFocus(event.target.value)} rows={6} placeholder="例如：请重点看我的项目叙述是否有说服力，以及回答是否显得过于执行层。" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
          <button onClick={submit} disabled={!sessionUuid || submitting || (!!videoUuid && !consentVideo)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "提交中" : "提交点评申请"}</button>
          {completed.length === 0 && <p className="mt-3 text-xs text-muted-foreground">还没有可提交的面试。<Link href="/interview/setup" className="ml-1 text-primary">先完成一次训练</Link></p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">点评进度</h2></div>
          <div className="mt-5 space-y-3">
            {reviews?.map((review) => <article key={review.uuid} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">面试 {review.session_uuid.slice(0, 8)}</p><p className="mt-1 text-xs text-muted-foreground">{review.focus || "未指定重点"}</p>{review.video && <p className="mt-1 text-xs text-primary">已授权录像 · 表达分 {review.video.overall_score ?? 0}</p>}</div><Status status={review.status} /></div>{review.status === "completed" ? <div className="mt-4 border-t border-border pt-4"><p className="flex items-center gap-1.5 text-sm font-semibold"><Star className="h-4 w-4 fill-primary text-primary" />教练评分 {review.rating}/10</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{review.comments}</p>{review.annotations.length > 0 && <div className="mt-3 space-y-2">{review.annotations.map((item, index) => <p key={index} className="rounded-lg bg-secondary px-3 py-2 text-xs">{item.round ? `第 ${item.round} 题：` : ""}{item.comment}</p>)}</div>}<Link href={`/interview/${review.session_uuid}/report`} className="mt-3 inline-block text-xs font-semibold text-primary">回到报告复练 →</Link></div> : <div className="mt-3 flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />提交于 {new Date(review.created_at).toLocaleString("zh-CN")}</p><button onClick={() => cancelReview(review.uuid)} className="text-xs text-destructive">取消并撤销授权</button></div>}</article>)}
            {reviews?.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">暂无点评申请。</p>}
          </div>
        </div>
      </section>
      <CoachQueue />
    </div>
  );
}

type QueueReview = Review & { candidate: { uuid: string; nickname: string }; score?: number };

function CoachQueue() {
  const toast = useToast();
  const { data: queue, refetch } = useFetch<QueueReview[]>("/coach/queue");
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comments: string }>>({});
  if (!queue) return null;
  async function claim(uuid: string) { try { await fetchAPI(`/coach/reviews/${uuid}/claim`, { method: "POST" }); toast.success("已领取点评任务"); refetch(); } catch (error) { toast.error(getErrorMessage(error, "领取失败")); } }
  async function submit(item: QueueReview) { const draft = drafts[item.uuid] || { rating: 7, comments: "" }; if (draft.comments.trim().length < 10) { toast.warning("点评内容至少 10 个字"); return; } try { await fetchAPI(`/coach/reviews/${item.uuid}`, { method: "PUT", body: JSON.stringify({ rating: draft.rating, comments: draft.comments, annotations: [] }) }); toast.success("点评已提交"); refetch(); } catch (error) { toast.error(getErrorMessage(error, "提交点评失败")); } }
  function mediaUrl(path: string) { const token = getToken(); const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api"; const origin = apiBase.startsWith("http") ? new URL(apiBase).origin : ""; return `${origin}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`; }
  return <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold">教练工作台</h2><p className="mt-1 text-sm text-muted-foreground">仅拥有教练或管理员权限的账号可见。</p><div className="mt-4 space-y-4">{queue.map((item) => { const draft = drafts[item.uuid] || { rating: 7, comments: "" }; return <article key={item.uuid} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between"><div><strong>{item.candidate.nickname}</strong><p className="text-xs text-muted-foreground">面试分 {item.score ?? 0} · {item.focus || "综合点评"}</p></div><button onClick={() => claim(item.uuid)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary">领取</button></div>{item.video && <video src={mediaUrl(item.video.media_url)} controls className="mt-3 aspect-video w-full rounded-xl bg-black object-contain" />}<div className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr_auto]"><input type="number" min={1} max={10} value={draft.rating} onChange={(event) => setDrafts({ ...drafts, [item.uuid]: { ...draft, rating: Number(event.target.value) } })} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" /><textarea value={draft.comments} onChange={(event) => setDrafts({ ...drafts, [item.uuid]: { ...draft, comments: event.target.value } })} placeholder="给出具体、可执行的点评" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" /><button onClick={() => submit(item)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">提交</button></div></article>; })}{queue.length === 0 && <p className="text-sm text-muted-foreground">当前没有待点评任务。</p>}</div></section>;
}

function Status({ status }: { status: Review["status"] }) {
  const map = { pending: ["待领取", "bg-primary/10 text-primary"], claimed: ["点评中", "bg-sky-500/10 text-sky-600"], completed: ["已完成", "bg-success/10 text-success"] } as const;
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[status][1]}`}>{map[status][0]}</span>;
}
