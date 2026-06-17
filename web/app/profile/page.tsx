"use client";

import { useState, useRef } from "react";
import { User, Camera } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { fetchAPI } from "@/lib/api";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await fetchAPI("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      await refreshUser();
      toast.success("资料已更新");
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片不能超过 5MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/file/upload?type=avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("probe_token")}` },
        body: formData,
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);

      await fetchAPI("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ avatar: json.data.url }),
      });
      await refreshUser();
      toast.success("头像已更新");
    } catch (e: any) {
      toast.error(e.message || "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-md px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">个人资料</h1>

        {/* 头像 */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-primary-foreground" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
            }}
          />
          <p className="text-xs text-muted-foreground">点击更换头像</p>
        </div>

        {/* 昵称 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-lg border border-input bg-card px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* 信息展示 */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">邮箱</span>
            <span>{user?.uuid ? "已绑定" : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">会员</span>
            <span>{user?.membership_type === "free" ? "免费版" : user?.membership_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">面试次数</span>
            <span>{user?.total_interviews || 0} 次</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">注册时间</span>
            <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString("zh-CN") : "—"}</span>
          </div>
        </div>

        {/* 保存 */}
        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim()}
          className="w-full rounded-full bg-primary py-3 text-primary-foreground font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </main>
  );
}
