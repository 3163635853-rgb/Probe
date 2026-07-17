"use client";

import { FormEvent, useMemo, useState } from "react";
import { Building2, Download, Plus, ScrollText, Settings2, Users } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

type Org = { uuid: string; name: string; slug: string; role: string; settings: Record<string, unknown> };
type Member = { user_uuid: string; nickname: string; email: string; role: string; status: string };
type Dashboard = { member_count: number; completed_interviews: number; average_score: number; dimensions: Array<{ name: string; average: number }>; trend: Array<{ date: string; interviews: number; average_score: number }>; members: Array<{ user_uuid: string; nickname: string; interviews: number; average_score: number }> };
type Rubric = { uuid: string; name: string; description: string; dimensions: Array<{ name: string; weight: number; description: string }>; pass_score: number };
type Question = { uuid: string; title: string; question: string; dimension: string; difficulty: number };
type Audit = { id: number; actor: string; action: string; target_type?: string; created_at: string };

export function EnterprisePanel() {
  const toast = useToast();
  const { data: organizations, refetch: refetchOrganizations } = useFetch<Org[]>("/enterprise/organizations");
  const [selectedUuid, setSelectedUuid] = useState("");
  const selected = useMemo(() => organizations?.find((item) => item.uuid === selectedUuid) || organizations?.[0] || null, [organizations, selectedUuid]);
  const orgUuid = selected?.uuid || "";
  const { data: members, refetch: refetchMembers } = useFetch<Member[]>(orgUuid ? `/enterprise/organizations/${orgUuid}/members` : null, [orgUuid]);
  const { data: dashboard, refetch: refetchDashboard } = useFetch<Dashboard>(orgUuid ? `/enterprise/organizations/${orgUuid}/dashboard` : null, [orgUuid]);
  const { data: rubrics, refetch: refetchRubrics } = useFetch<Rubric[]>(orgUuid ? `/enterprise/rubrics?organization_uuid=${orgUuid}` : null, [orgUuid]);
  const { data: questions, refetch: refetchQuestions } = useFetch<Question[]>(orgUuid ? `/enterprise/organizations/${orgUuid}/questions` : null, [orgUuid]);
  const { data: audits, refetch: refetchAudits } = useFetch<Audit[]>(orgUuid && ["owner", "admin"].includes(selected?.role || "") ? `/enterprise/organizations/${orgUuid}/audit-logs` : null, [orgUuid]);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", slug: "" });
  const [memberEmail, setMemberEmail] = useState("");
  const [rubricForm, setRubricForm] = useState({ name: "", description: "", dimensions: "逻辑表达:40,岗位能力:35,沟通清晰度:25", pass_score: 70 });
  const [questionForm, setQuestionForm] = useState({ title: "", question: "", dimension: "", difficulty: 3 });
  const [saving, setSaving] = useState("");

  async function createOrg(event: FormEvent) {
    event.preventDefault();
    setCreatingOrg(true);
    try {
      const org = await fetchAPI<Org>("/enterprise/organizations", { method: "POST", body: JSON.stringify(orgForm) });
      setOrgForm({ name: "", slug: "" });
      setSelectedUuid(org.uuid);
      toast.success("组织空间已创建");
      refetchOrganizations();
    } catch (error) { toast.error(getErrorMessage(error, "创建失败")); } finally { setCreatingOrg(false); }
  }

  async function addMember() {
    if (!orgUuid || !memberEmail.trim()) return;
    setSaving("member");
    try {
      await fetchAPI(`/enterprise/organizations/${orgUuid}/members`, { method: "POST", body: JSON.stringify({ email: memberEmail, role: "member" }) });
      setMemberEmail(""); toast.success("成员已加入"); refetchMembers(); refetchAudits();
    } catch (error) { toast.error(getErrorMessage(error, "添加成员失败")); } finally { setSaving(""); }
  }

  async function createRubric() {
    if (!orgUuid || !rubricForm.name.trim()) return;
    const dimensions = rubricForm.dimensions.split(/[，,]/).map((part) => { const [name, weight] = part.split(/[:：]/); return { name: name?.trim(), weight: Number(weight || 0), description: "" }; }).filter((item) => item.name && item.weight > 0);
    setSaving("rubric");
    try {
      await fetchAPI("/enterprise/rubrics", { method: "POST", body: JSON.stringify({ ...rubricForm, dimensions, organization_uuid: orgUuid, is_public: false }) });
      setRubricForm({ ...rubricForm, name: "", description: "" }); toast.success("评分 Rubric 已保存"); refetchRubrics(); refetchAudits();
    } catch (error) { toast.error(getErrorMessage(error, "保存 Rubric 失败")); } finally { setSaving(""); }
  }

  async function createQuestion() {
    if (!orgUuid || !questionForm.title.trim() || !questionForm.question.trim()) return;
    setSaving("question");
    try {
      await fetchAPI(`/enterprise/organizations/${orgUuid}/questions`, { method: "POST", body: JSON.stringify({ ...questionForm, scoring_criteria: "" }) });
      setQuestionForm({ title: "", question: "", dimension: "", difficulty: 3 }); toast.success("组织题目已添加"); refetchQuestions(); refetchAudits();
    } catch (error) { toast.error(getErrorMessage(error, "保存题目失败")); } finally { setSaving(""); }
  }

  async function exportData() {
    if (!orgUuid) return;
    const data = await fetchAPI<Record<string, unknown>>(`/enterprise/organizations/${orgUuid}/export`);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${selected?.slug || "probe-org"}-export.json`; anchor.click(); URL.revokeObjectURL(url);
    toast.success("组织数据已导出"); refetchAudits();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">组织训练空间</h2></div><p className="mt-1 text-sm text-muted-foreground">学校、培训机构和企业可统一题库、评分标准、成员训练与合规设置。</p></div>{organizations?.length ? <select value={selected?.uuid || ""} onChange={(event) => setSelectedUuid(event.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">{organizations.map((org) => <option key={org.uuid} value={org.uuid}>{org.name} · {org.role}</option>)}</select> : null}</div>
        {!organizations?.length && <form onSubmit={createOrg} className="mt-5 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_1fr_auto]"><input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} placeholder="组织名称" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" /><input value={orgForm.slug} onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })} placeholder="英文标识，如 probe-school" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" /><button disabled={creatingOrg} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{creatingOrg ? "创建中" : "创建空间"}</button></form>}
      </section>

      {selected && <>
        <section className="grid gap-3 sm:grid-cols-3"><Stat label="活跃成员" value={dashboard?.member_count ?? 0} /><Stat label="90 天训练" value={dashboard?.completed_interviews ?? 0} /><Stat label="团队均分" value={dashboard?.average_score ?? 0} /></section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card title="成员管理" icon={<Users className="h-4 w-4 text-primary" />}>
            <div className="flex gap-2"><input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="成员注册邮箱" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" /><button onClick={addMember} className="rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary">{saving === "member" ? "添加中" : "添加"}</button></div>
            <div className="mt-3 space-y-2">{members?.map((member) => <div key={member.user_uuid} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"><span><strong>{member.nickname}</strong><span className="ml-2 text-xs text-muted-foreground">{member.email}</span></span><span className="text-xs">{member.role}</span></div>)}</div>
          </Card>

          <Card title="自定义评分 Rubric" icon={<ScrollText className="h-4 w-4 text-primary" />}>
            <input value={rubricForm.name} onChange={(e) => setRubricForm({ ...rubricForm, name: e.target.value })} placeholder="评分标准名称" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <input value={rubricForm.dimensions} onChange={(e) => setRubricForm({ ...rubricForm, dimensions: e.target.value })} placeholder="逻辑表达:40,岗位能力:35" className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <label className="mt-2 block text-xs font-semibold text-muted-foreground">合格线<input type="number" min={0} max={100} value={rubricForm.pass_score} onChange={(e) => setRubricForm({ ...rubricForm, pass_score: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground" /></label>
            <button onClick={createRubric} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><Plus className="h-3.5 w-3.5" />{saving === "rubric" ? "保存中" : "保存 Rubric"}</button>
            <div className="mt-3 space-y-2">{rubrics?.map((rubric) => <div key={rubric.uuid} className="rounded-lg border border-border p-3"><strong className="text-sm">{rubric.name}</strong><p className="mt-1 text-xs text-muted-foreground">合格线 {rubric.pass_score} · {rubric.dimensions.map((item) => `${item.name} ${Math.round(item.weight * 100)}%`).join(" · ")}</p></div>)}</div>
          </Card>

          <Card title="组织题库" icon={<Plus className="h-4 w-4 text-primary" />}>
            <input value={questionForm.title} onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })} placeholder="题目标题" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <textarea value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="面试问题" rows={3} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <div className="mt-2 flex gap-2"><input value={questionForm.dimension} onChange={(e) => setQuestionForm({ ...questionForm, dimension: e.target.value })} placeholder="评分维度" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" /><button onClick={createQuestion} className="rounded-xl border border-border px-3 text-xs font-semibold hover:bg-secondary">{saving === "question" ? "保存中" : "添加"}</button></div>
            <div className="mt-3 space-y-2">{questions?.slice(0, 6).map((question) => <div key={question.uuid} className="rounded-lg bg-secondary px-3 py-2"><p className="text-sm font-semibold">{question.title}</p><p className="mt-1 text-xs text-muted-foreground">{question.dimension || "通用"} · 难度 {question.difficulty}</p></div>)}</div>
          </Card>

          <OrganizationSettingsCard key={selected.uuid} org={selected} onSaved={() => { refetchOrganizations(); refetchAudits(); }} onExport={exportData} />
        </section>

        {dashboard?.trend?.length ? <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h3 className="font-bold">团队能力趋势</h3><div className="mt-4 flex items-end gap-2 overflow-x-auto pb-1">{dashboard.trend.slice(-20).map((item) => <div key={item.date} className="min-w-12 text-center"><div className="mx-auto w-7 rounded-t bg-primary/70" style={{ height: `${Math.max(12, item.average_score)}px` }} /><p className="mt-1 text-[10px] text-muted-foreground">{item.date.slice(5)}</p><p className="text-[10px] font-semibold">{item.average_score}</p></div>)}</div></section> : null}

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h3 className="font-bold">审计日志</h3><button onClick={() => { refetchDashboard(); refetchAudits(); }} className="text-xs text-primary">刷新</button></div><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-muted-foreground"><th className="py-2">时间</th><th>操作者</th><th>动作</th><th>目标</th></tr></thead><tbody>{audits?.slice(0, 20).map((item) => <tr key={item.id} className="border-t border-border"><td className="py-2 pr-4">{new Date(item.created_at).toLocaleString("zh-CN")}</td><td>{item.actor}</td><td>{item.action}</td><td>{item.target_type || "-"}</td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-3xl font-bold">{value}</p></div>; }
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center gap-2">{icon}<h3 className="font-bold">{title}</h3></div>{children}</section>; }


function OrganizationSettingsCard({ org, onSaved, onExport }: { org: Org; onSaved: () => void; onExport: () => void }) {
  const toast = useToast();
  const current = org.settings || {};
  const [settings, setSettings] = useState({
    retention_days: Number(current.retention_days || 365),
    sso_enabled: Boolean(current.sso_enabled),
    sso_provider: String(current.sso_provider || "saml"),
    sso_domain: String(current.sso_domain || ""),
    allow_member_export: Boolean(current.allow_member_export),
  });
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      await fetchAPI(`/enterprise/organizations/${org.uuid}/settings`, { method: "PUT", body: JSON.stringify(settings) });
      toast.success("组织安全设置已更新");
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, "设置更新失败"));
    } finally {
      setSaving(false);
    }
  }

  return <Card title="SSO 与数据保留" icon={<Settings2 className="h-4 w-4 text-primary" />}>
    <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"><span>启用 SSO 配置</span><input type="checkbox" checked={settings.sso_enabled} onChange={(e) => setSettings({ ...settings, sso_enabled: e.target.checked })} /></label>
    <div className="mt-2 grid gap-2 sm:grid-cols-2"><select value={settings.sso_provider} onChange={(e) => setSettings({ ...settings, sso_provider: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2 text-sm"><option value="saml">SAML</option><option value="oidc">OIDC</option></select><input value={settings.sso_domain} onChange={(e) => setSettings({ ...settings, sso_domain: e.target.value })} placeholder="企业邮箱域名" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" /></div>
    <label className="mt-2 block text-xs font-semibold text-muted-foreground">数据保留天数<input type="number" min={30} max={3650} value={settings.retention_days} onChange={(e) => setSettings({ ...settings, retention_days: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground" /></label>
    <div className="mt-3 flex gap-2"><button onClick={saveSettings} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">{saving ? "保存中" : "保存设置"}</button><button onClick={onExport} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"><Download className="h-3.5 w-3.5" />导出数据</button></div>
  </Card>;
}
