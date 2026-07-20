import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Check, ChevronRight } from "lucide-react-native";
import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import type {
  Industry,
  Position,
  InterviewMode,
  Difficulty,
  StartInterviewRequest,
  StartInterviewResponse,
} from "@/lib/types";

type Step = "industry" | "position" | "mode" | "difficulty" | "context" | "jd";
const STEPS: Step[] = ["industry", "position", "mode", "difficulty", "context", "jd"];
type ResumeOption = { uuid: string; name: string; is_active: boolean };
type CareerPresets = { stages: { code: string; name: string; focus: string }[]; interviewer_roles: string[] };
type OrganizationOption = { uuid: string; name: string; role: string };
type RubricOption = { uuid: string; name: string; pass_score: number };

export default function SetupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("industry");
  const [form, setForm] = useState<Partial<StartInterviewRequest>>({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: industries } = useFetch<Industry[]>("/config/industries");
  const { data: positions } = useFetch<Position[]>(
    form.industry_id
      ? `/config/positions?industry_id=${form.industry_id}`
      : null,
    [form.industry_id]
  );
  const { data: modes } = useFetch<InterviewMode[]>(
    selectedCategory ? `/config/modes?category=${selectedCategory}` : "/config/modes",
    [selectedCategory]
  );
  const { data: difficulties } = useFetch<Difficulty[]>("/config/difficulties");
  const { data: resumes } = useFetch<ResumeOption[]>("/career/resumes");
  const { data: careerPresets } = useFetch<CareerPresets>("/career/presets");
  const { data: organizations } = useFetch<OrganizationOption[]>("/enterprise/organizations");
  const { data: rubrics } = useFetch<RubricOption[]>(form.organization_uuid ? `/enterprise/rubrics?organization_uuid=${form.organization_uuid}` : "/enterprise/rubrics", [form.organization_uuid]);

  const currentIndex = STEPS.indexOf(step);

  function goBack() {
    if (currentIndex === 0) {
      router.back();
    } else {
      setStep(STEPS[currentIndex - 1]);
    }
  }

  async function handleStart() {
    if (!form.industry_id || !form.position_id || !form.mode || !form.difficulty)
      return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetchAPI<StartInterviewResponse>("/interview/start", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.replace(`/interview/${res.session_uuid}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Top Bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={goBack} className="p-2">
          <ArrowLeft size={20} color="#1c1917" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold text-foreground">
          面试配置
        </Text>
        <View className="w-10" />
      </View>

      {/* Step Indicator */}
      <View className="flex-row items-center px-6 mb-4">
        {STEPS.map((s, i) => (
          <View key={s} className="flex-row items-center flex-1">
            <View
              className={`h-6 w-6 items-center justify-center rounded-full ${
                i < currentIndex
                  ? "bg-primary"
                  : i === currentIndex
                    ? "bg-primary"
                    : "bg-muted"
              }`}
            >
              {i < currentIndex ? (
                <Check size={12} color="#fff" />
              ) : (
                <Text
                  className={`text-xs font-bold ${
                    i === currentIndex ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            {i < STEPS.length - 1 && (
              <View
                className={`flex-1 h-0.5 mx-1 ${
                  i < currentIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </View>
        ))}
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={step}
            from={{ opacity: 0, translateX: 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -20 }}
            transition={{ type: "timing", duration: 250 }}
          >
            {step === "industry" && (
              <OptionList
                title="选择行业"
                subtitle="你想模拟哪个行业的面试？"
                items={industries?.map((i) => ({ id: i.id, label: i.name, desc: i.description })) || []}
                onSelect={(id) => {
                  setForm({ ...form, industry_id: id as number });
                  setStep("position");
                }}
              />
            )}
            {step === "position" && (
              <OptionList
                title="选择岗位"
                subtitle="具体面试什么职位？"
                items={positions?.map((p) => ({ id: p.id, label: p.name, desc: `${p.category} · ${p.level}` })) || []}
                onSelect={(id) => {
                  const pos = positions?.find((p) => p.id === id);
                  setForm({ ...form, position_id: id as number });
                  setSelectedCategory(pos?.category || "");
                  setStep("mode");
                }}
              />
            )}
            {step === "mode" && (
              <OptionList
                title="面试模式"
                subtitle="选择面试类型"
                items={modes?.map((m) => ({ id: m.code, label: m.name, desc: m.description })) || []}
                onSelect={(id) => {
                  setForm({ ...form, mode: id as string });
                  setStep("difficulty");
                }}
              />
            )}
            {step === "difficulty" && (
              <OptionList
                title="难度等级"
                subtitle="选择面试难度"
                items={difficulties?.map((d) => ({ id: d.level, label: d.name, desc: d.description })) || []}
                onSelect={(id) => {
                  setForm({ ...form, difficulty: id as number });
                  setStep("context");
                }}
              />
            )}
            {step === "context" && (
              <View className="gap-4">
                <View><Text className="text-lg font-bold text-foreground">定制面试语境</Text><Text className="mt-1 text-sm text-muted-foreground">让同一道题匹配你的简历、目标公司和当前轮次。</Text></View>
                <TextInput value={form.company_name || ""} onChangeText={(text) => setForm({ ...form, company_name: text })} placeholder="目标公司（可选）" placeholderTextColor="#a8a29e" className="rounded-xl border border-input bg-white p-4 text-base text-foreground" />
                <TextInput value={form.training_focus || ""} onChangeText={(text) => setForm({ ...form, training_focus: text })} placeholder="本次训练重点，如：抗压追问" placeholderTextColor="#a8a29e" className="rounded-xl border border-input bg-white p-4 text-base text-foreground" />
                <Text className="text-xs font-semibold text-muted-foreground">使用简历</Text>
                <View className="flex-row flex-wrap gap-2"><TouchableOpacity onPress={() => setForm({ ...form, resume_uuid: undefined })} className={`rounded-full px-3 py-2 ${!form.resume_uuid ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${!form.resume_uuid ? "text-white" : "text-foreground"}`}>不使用</Text></TouchableOpacity>{resumes?.map((item) => <TouchableOpacity key={item.uuid} onPress={() => setForm({ ...form, resume_uuid: item.uuid })} className={`rounded-full px-3 py-2 ${form.resume_uuid === item.uuid ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${form.resume_uuid === item.uuid ? "text-white" : "text-foreground"}`}>{item.name}</Text></TouchableOpacity>)}</View>
                <Text className="text-xs font-semibold text-muted-foreground">训练归属</Text>
                <View className="flex-row flex-wrap gap-2"><TouchableOpacity onPress={() => setForm({ ...form, organization_uuid: undefined, rubric_uuid: undefined })} className={`rounded-full px-3 py-2 ${!form.organization_uuid ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${!form.organization_uuid ? "text-white" : "text-foreground"}`}>个人训练</Text></TouchableOpacity>{organizations?.map((item) => <TouchableOpacity key={item.uuid} onPress={() => setForm({ ...form, organization_uuid: item.uuid, rubric_uuid: undefined })} className={`rounded-full px-3 py-2 ${form.organization_uuid === item.uuid ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${form.organization_uuid === item.uuid ? "text-white" : "text-foreground"}`}>{item.name}</Text></TouchableOpacity>)}</View>
                <Text className="text-xs font-semibold text-muted-foreground">评分标准</Text>
                <View className="flex-row flex-wrap gap-2"><TouchableOpacity onPress={() => setForm({ ...form, rubric_uuid: undefined })} className={`rounded-full px-3 py-2 ${!form.rubric_uuid ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${!form.rubric_uuid ? "text-white" : "text-foreground"}`}>默认</Text></TouchableOpacity>{rubrics?.map((item) => <TouchableOpacity key={item.uuid} onPress={() => setForm({ ...form, rubric_uuid: item.uuid })} className={`rounded-full px-3 py-2 ${form.rubric_uuid === item.uuid ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${form.rubric_uuid === item.uuid ? "text-white" : "text-foreground"}`}>{item.name} · {item.pass_score}</Text></TouchableOpacity>)}</View>
                <Text className="text-xs font-semibold text-muted-foreground">面试轮次</Text>
                <View className="flex-row flex-wrap gap-2">{careerPresets?.stages.map((item) => <TouchableOpacity key={item.code} onPress={() => setForm({ ...form, interview_stage: item.code })} className={`rounded-full px-3 py-2 ${form.interview_stage === item.code ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${form.interview_stage === item.code ? "text-white" : "text-foreground"}`}>{item.name}</Text></TouchableOpacity>)}</View>
                <Text className="text-xs font-semibold text-muted-foreground">面试官角色</Text>
                <View className="flex-row flex-wrap gap-2">{careerPresets?.interviewer_roles.map((item) => <TouchableOpacity key={item} onPress={() => setForm({ ...form, interviewer_role: item })} className={`rounded-full px-3 py-2 ${form.interviewer_role === item ? "bg-primary" : "bg-secondary"}`}><Text className={`text-xs font-semibold ${form.interviewer_role === item ? "text-white" : "text-foreground"}`}>{item}</Text></TouchableOpacity>)}</View>
                <TouchableOpacity onPress={() => setStep("jd")} className="rounded-xl bg-primary py-4"><Text className="text-center font-semibold text-white">继续</Text></TouchableOpacity>
              </View>
            )}
            {step === "jd" && (
              <View className="gap-4">
                <View>
                  <Text className="text-lg font-bold text-foreground">
                    补充 JD
                  </Text>
                  <Text className="text-sm text-muted-foreground mt-1">
                    可选，粘贴职位描述让面试更有针对性
                  </Text>
                </View>
                <TextInput
                  className="h-36 rounded-xl border border-input bg-white p-4 text-base text-foreground"
                  placeholder="粘贴职位描述..."
                  placeholderTextColor="#a8a29e"
                  value={form.jd_text || ""}
                  onChangeText={(t) => setForm({ ...form, jd_text: t })}
                  multiline
                  textAlignVertical="top"
                />
                {error ? (
                  <Text className="text-sm text-destructive">{error}</Text>
                ) : null}
                <TouchableOpacity
                  onPress={handleStart}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#f59e0b", "#d97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="h-14 items-center justify-center rounded-xl"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-base font-bold text-white">
                        开始面试
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </MotiView>
        </AnimatePresence>
      </ScrollView>
    </SafeAreaView>
  );
}

function OptionList({
  title,
  subtitle,
  items,
  onSelect,
}: {
  title: string;
  subtitle: string;
  items: { id: string | number; label: string; desc?: string }[];
  onSelect: (id: string | number) => void;
}) {
  return (
    <View className="gap-4">
      <View>
        <Text className="text-lg font-bold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground mt-1">{subtitle}</Text>
      </View>
      <View className="gap-2">
        {items.map((item, index) => (
          <MotiView
            key={item.id}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 200, delay: index * 50 }}
          >
            <TouchableOpacity
              className="flex-row items-center rounded-xl border border-border bg-white p-4 active:bg-secondary"
              onPress={() => onSelect(item.id)}
              activeOpacity={0.8}
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {item.label}
                </Text>
                {item.desc && (
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {item.desc}
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color="#a8a29e" />
            </TouchableOpacity>
          </MotiView>
        ))}
      </View>
    </View>
  );
}
