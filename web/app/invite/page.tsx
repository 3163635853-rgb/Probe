"use client";

import { useEffect, useState } from "react";
import { Copy, Gift, Users } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { fetchAPI } from "@/lib/api";

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
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [redeemCode, setRedeemCode] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchAPI<InviteInfo>("/invite/my-code").then(setInfo);
    fetchAPI<InviteRecord[]>("/invite/records").then(setRecords);
  }, []);

  async function redeem() {
    if (!redeemCode.trim()) return;
    try {
      await fetchAPI("/coupon/redeem", {
        method: "POST",
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      setMsg("兑换成功");
      setRedeemCode("");
    } catch (e: any) {
      setMsg(e.message || "兑换失败");
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
                onClick={() => { navigator.clipboard.writeText(info.code); }}
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
          {msg && <p className="text-sm text-primary">{msg}</p>}
        </div>

        {/* 邀请记录 */}
        {records.length > 0 && (
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
