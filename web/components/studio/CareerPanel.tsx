"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, FileUp, Heart, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

type Resume = {
  uuid: string;
  name: string;
  file_type: string;
  parsed: { skills?: string[]; quantified_achievements?: string[]; completeness?: { score?: number } };
  is_active: boolean;
  created_at: string;
};

type Story = {
  uuid: string;
  title: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  tags: string[];
  is_favorite: boolean;
  quality?: { score: number; issues: string[]; complete: boolean };
};

const EMPTY_STORY = { title: "", situation: "", task: "", action: "", result: "", tags: "", is_favorite: false };

export function CareerPanel() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: resumes, loading: resumesLoading, refetch: refetchResumes } = useFetch<Resume[]>("/career/resumes");
  const { data: stories, loading: storiesLoading, refetch: refetchStories } = useFetch<Story[]>("/career/stories");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_STORY);
  const [recommendQuestion, setRecommendQuestion] = useState("");
  const [recommendations, setRecommendations] = useState<Story[]>([]);

  async function uploadResume(file?: File) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const result = await fetchAPI<Resume & { created_story_count: number }>("/career/resumes?create_stories=true", { method: "POST", body: formData });
      toast.success(`简历解析完成，生成 ${result.created_story_count} 条候选素材`);
      await Promise.all([refetchResumes(), refetchStories()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "简历上传失败"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function activateResume(uuid: string) {
    await fetchAPI(`/career/resumes/${uuid}/activate`, { method: "PUT" });
    toast.success("已设为当前面试简历");
    refetchResumes();
  }

  async function deleteResume(uuid: string) {
    await fetchAPI(`/career/resumes/${uuid}`, { method: "DELETE" });
    toast.success("简历已删除");
    refetchResumes();
  }

  async function saveStory(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetchAPI("/career/stories", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
          metrics: {},
        }),
      });
      setForm(EMPTY_STORY);
      toast.success("STAR 故事已加入证据库");
      refetchStories();
    } catch (error) {
      toast.error(getErrorMessage(error, "保存失败"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteStory(uuid: string) {
    await fetchAPI(`/career/stories/${uuid}`, { method: "DELETE" });
    toast.success("经历素材已删除");
    refetchStories();
  }

  async function recommend() {
    if (recommendQuestion.trim().length < 2) return;
    try {
      const data = await fetchAPI<Story[]>(`/career/stories/recommend?question=${encodeURIComponent(recommendQuestion)}`);
      setRecommendations(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "推荐失败"));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Candidate evidence</p>
            <h2 className="mt-1 text-xl font-bold">简历证据入口</h2>
            <p className="mt-1 text-sm text-muted-foreground">支持 PDF、DOCX、TXT、Markdown，自动识别技能和量化成果。</p>
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={(event) => uploadResume(event.target.files?.[0])} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {uploading ? "解析中" : "上传简历"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {resumesLoading && <p className="text-sm text-muted-foreground">加载简历…</p>}
          {resumes?.map((resume) => (
            <article key={resume.uuid} className={`rounded-xl border p-4 ${resume.is_active ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{resume.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{resume.file_type.toUpperCase()} · 完整度 {resume.parsed.completeness?.score ?? 0}%</p>
                </div>
                {resume.is_active && <span className="rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">当前使用</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(resume.parsed.skills || []).slice(0, 6).map((skill) => <span key={skill} className="rounded-md bg-secondary px-2 py-1 text-xs">{skill}</span>)}
              </div>
              <div className="mt-4 flex gap-2">
                {!resume.is_active && <button onClick={() => activateResume(resume.uuid)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">设为当前</button>}
                <button onClick={() => deleteResume(resume.uuid)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" />删除</button>
              </div>
            </article>
          ))}
          {!resumesLoading && resumes?.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2">还没有简历。上传后，Probe 会把可量化成果转成初始 STAR 素材。</div>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <form onSubmit={saveStory} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">新建 STAR 故事</h2></div>
          <div className="mt-4 space-y-3">
            <Input label="故事标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="例如：会员增长项目" />
            <Textarea label="Situation" value={form.situation} onChange={(value) => setForm({ ...form, situation: value })} placeholder="一句话交代背景，避免铺垫过长" />
            <Textarea label="Task" value={form.task} onChange={(value) => setForm({ ...form, task: value })} placeholder="你的目标和责任是什么？" />
            <Textarea label="Action" value={form.action} onChange={(value) => setForm({ ...form, action: value })} placeholder="突出“我”具体做了什么" />
            <Textarea label="Result" value={form.result} onChange={(value) => setForm({ ...form, result: value })} placeholder="结果如何？尽量量化" />
            <Input label="能力标签" value={form.tags} onChange={(value) => setForm({ ...form, tags: value })} placeholder="影响力，数据分析，跨团队协作" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_favorite} onChange={(event) => setForm({ ...form, is_favorite: event.target.checked })} />设为高频故事</label>
            <button disabled={saving} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "保存中…" : "保存到证据库"}</button>
          </div>
        </form>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">为问题匹配故事</h2></div>
            <div className="mt-3 flex gap-2">
              <input value={recommendQuestion} onChange={(event) => setRecommendQuestion(event.target.value)} placeholder="例如：讲一次你推动跨团队合作的经历" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              <button onClick={recommend} className="rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">推荐</button>
            </div>
            {recommendations.length > 0 && <div className="mt-3 space-y-2">{recommendations.map((story, index) => <div key={story.uuid} className="rounded-lg bg-primary/5 px-3 py-2 text-sm"><span className="mr-2 font-mono text-primary">#{index + 1}</span><strong>{story.title}</strong><span className="ml-2 text-xs text-muted-foreground">质量 {story.quality?.score ?? 0}</span></div>)}</div>}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">故事库存</h2><span className="text-xs text-muted-foreground">{stories?.length ?? 0} 条</span></div>
            <div className="mt-4 max-h-[720px] space-y-3 overflow-auto pr-1">
              {storiesLoading && <p className="text-sm text-muted-foreground">加载素材…</p>}
              {stories?.map((story) => (
                <article key={story.uuid} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{story.title}</p><div className="mt-1 flex flex-wrap gap-1">{story.tags.map((tag) => <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{tag}</span>)}</div></div>
                    <div className="flex items-center gap-2">{story.is_favorite && <Heart className="h-4 w-4 fill-primary text-primary" />}<button onClick={() => deleteStory(story.uuid)} aria-label="删除故事"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button></div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p><b className="text-foreground">A</b> {story.action || "待补充"}</p><p><b className="text-foreground">R</b> {story.result || "待补充"}</p></div>
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold"><CheckCircle2 className={`h-3.5 w-3.5 ${story.quality?.complete ? "text-success" : "text-primary"}`} />故事质量 {story.quality?.score ?? 0}/100</p>
                    {story.quality?.issues?.length ? <p className="mt-1 text-xs text-muted-foreground">{story.quality.issues.join("；")}</p> : null}
                  </div>
                </article>
              ))}
              {!storiesLoading && stories?.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">还没有故事，先写下一个有量化结果的项目。</p>}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>;
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>;
}
