"use client";

import { useState } from "react";
import { Copy, Gift, Users } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface InviteInfo {
  code: string;
  reward_description: string;
  total_invited: number;
  total_reward: number;
}

interface InviteRecord {
  invitee_nickname: string;
  reward_given: boolean;
  created_at: string;
}

export default function InvitePage() {
  return (
    <AuthGuard>
      <InviteContent />
    </AuthGuard>
  );
}

function InviteContent() {
  const { data: info } = useFetch<InviteInfo>("/invite/my-code");
  const { data: records } = useFetch<InviteRecord[]>("/invite/records");
  const [redeemCode, setRedeemCode] = useState("");
  const toast = useToast();

  async function redeem() {
    if (!redeemCode.trim()) return;
    try {
      await fetchAPI("/invite/redeem", {
        method: "POST",
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      toast.success("兑换成功");
      setRedeemCode("");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "兑换失败"));
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">邀请好友</h1>

        {info && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <p className="text-sm text-muted-foreground">{info.reward_description}</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded-lg bg-secondary px-4 py-3 text-lg font-mono font-bold tracking-wider">
                {info.code}
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(info.code);
                    toast.success("已复制");
                  } catch {
                    toast.error("复制失败");
                  }
                }}
                className="rounded-lg border border-border p-3 hover:bg-secondary transition-colors"
                title="复制"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>已邀请 <b>{info.total_invited}</b> 人</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-muted-foreground" />
                <span>获得 <b>{info.total_reward}</b> 次面试</span>
              </div>
            </div>
          </div>
        )}

        {/* 兑换码 */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-semibold">兑换邀请码</h2>
          <div className="flex gap-2">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="输入邀请码"
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:border-primary transition-colors"
            />
            <button onClick={redeem} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors">
              兑换
            </button>
          </div>
        </div>

        {/* 邀请记录 */}
        {records && records.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold">邀请记录</h2>
            {records.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <span>{r.invitee_nickname}</span>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("zh-CN")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
