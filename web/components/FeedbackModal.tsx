"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { fetchAPI } from "@/lib/api";

interface Props {
  sessionUuid: string;
  onClose: () => void;
}

export function FeedbackModal({ sessionUuid, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await fetchAPI("/feedback", {
        method: "POST",
        body: JSON.stringify({
          session_uuid: sessionUuid,
          rating,
          comment: comment || undefined,
          feedback_type: "interview",
        }),
      });
    } catch {
      // 静默失败，不阻塞跳转
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-card border border-border p-6 shadow-lg space-y-5 animate-fade-in-up [animation-delay:0ms] [animation-fill-mode:forwards]">
        <div className="text-center">
          <h3 className="text-lg font-semibold">面试结束</h3>
          <p className="mt-1 text-sm text-muted-foreground">给这次面试打个分吧</p>
        </div>

        {/* 星星评分 */}
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  n <= (hover || rating)
                    ? "fill-primary text-primary"
                    : "text-border"
                }`}
              />
            </button>
          ))}
        </div>

        {/* 可选评论 */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="有什么想说的？（选填）"
          rows={2}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors"
        />

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            跳过
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {submitting ? "提交中..." : "提交"}
          </button>
        </div>
      </div>
    </div>
  );
}
