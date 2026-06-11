"use client";

import { useEffect, useState } from "react";
import { Trophy, Lock } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { fetchAPI } from "@/lib/api";

interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
  achieved_at: string | null;
}

export default function AchievementsPage() {
  return (
    <AuthGuard>
      <AchievementsContent />
    </AuthGuard>
  );
}

function AchievementsContent() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI<Achievement[]>("/achievement/list")
      .then(setAchievements)
      .finally(() => setLoading(false));
  }, []);

  const unlocked = achievements.filter((a) => a.achieved).length;

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">成就</h1>
          <span className="text-sm text-muted-foreground">
            已解锁 {unlocked}/{achievements.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((a) => (
            <div
              key={a.code}
              className={`rounded-xl border p-5 flex items-start gap-4 transition-colors ${a.achieved ? "border-primary/30 bg-card" : "border-border bg-card opacity-50"}`}
            >
              <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${a.achieved ? "bg-primary/10" : "bg-secondary"}`}>
                {a.achieved ? (
                  <Trophy className="w-6 h-6 text-primary" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
                {a.achieved && a.achieved_at && (
                  <p className="text-xs text-primary mt-1">
                    {new Date(a.achieved_at).toLocaleDateString("zh-CN")} 达成
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
