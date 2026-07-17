"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { TrainingStudio } from "@/components/studio/TrainingStudio";

export default function StudioPage() {
  return (
    <AuthGuard>
      <TrainingStudio />
    </AuthGuard>
  );
}
