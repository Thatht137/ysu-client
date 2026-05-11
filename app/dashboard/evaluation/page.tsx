"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthStore } from "@/lib/auth-store";
import {
  getEvaluationTypes,
  getPendingEvaluations,
  getEvaluationDetail,
  calculateScore,
  submitEvaluation,
} from "@/lib/api";
import type {
  EvaluationType,
  EvaluationTask,
  EvaluationDetail,
  Question,
  EvaluationAnswer,
} from "@/lib/types";
import { ClipboardCheck, AlertTriangle, Sparkles } from "lucide-react";

function isTaskActive(task: EvaluationTask): boolean {
  const now = new Date();
  if (task.start_time) {
    const start = new Date(task.start_time.replace(" ", "T"));
    if (now < start) return false;
  }
  if (task.end_time) {
    const end = new Date(task.end_time.replace(" ", "T"));
    if (now > end) return false;
  }
  return true;
}

function getTaskStatus(task: EvaluationTask): { active: boolean; label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const now = new Date();
  if (task.start_time) {
    const start = new Date(task.start_time.replace(" ", "T"));
    if (now < start) return { active: false, label: `未开始 (${task.start_time})`, variant: "secondary" };
  }
  if (task.end_time) {
    const end = new Date(task.end_time.replace(" ", "T"));
    if (now > end) return { active: false, label: `已结束 (${task.end_time})`, variant: "destructive" };
  }
  return { active: true, label: "进行中", variant: "default" };
}

export default function EvaluationPage() {
  const credential = useAuthStore((s) => s.credential);
  const [types, setTypes] = useState<EvaluationType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [detail, setDetail] = useState<EvaluationDetail | null>(null);
  const [selectedTask, setSelectedTask] = useState<EvaluationTask | null>(null);
  const [answers, setAnswers] = useState<Record<string, EvaluationAnswer>>({});
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const t = await getEvaluationTypes(credential!);
        setTypes(t);
      } catch (err) {
        toast.error((err as Error).message || "加载失败");
      } finally {
        setLoadingTypes(false);
      }
    }
    load();
  }, [credential]);

  async function handleSelectType(code: string) {
    if (!credential) return;
    setSelectedType(code);
    setLoadingTasks(true);
    try {
      const t = await getPendingEvaluations(credential, code);
      setTasks(t);
    } catch (err) {
      toast.error((err as Error).message || "加载失败");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function handleOpenTask(task: EvaluationTask) {
    const status = getTaskStatus(task);
    if (!status.active) {
      toast.error(`该评教${status.label}，无法作答`);
      return;
    }
    if (!credential) return;
    setSelectedTask(task);
    setLoadingDetail(true);
    setDialogOpen(true);
    setAnswers({});
    try {
      const d = await getEvaluationDetail(credential, task.group_no || "", task.eval_type || "", task.sequence);
      setDetail(d);
      // Initialize default answers for all questions
      const initial: Record<string, EvaluationAnswer> = {};
      for (const q of d.questions) {
        initial[q.tmid] = {
          tmid: q.tmid,
          question_type: q.question_type || "",
          option_ids: [],
          text: "",
        };
      }
      setAnswers(initial);
    } catch (err) {
      toast.error((err as Error).message || "加载问卷失败");
      setDialogOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleAnswerChange(q: Question, value: EvaluationAnswer) {
    setAnswers((prev) => ({ ...prev, [q.tmid]: value }));
  }

  function buildAnswers(): EvaluationAnswer[] {
    return Object.values(answers);
  }

  function autoFillMaxScore() {
    if (!detail) return;
    const next: Record<string, EvaluationAnswer> = { ...answers };
    for (const q of detail.questions) {
      if (!q.options.length) continue;
      if (q.question_type === "01") {
        // Single choice: pick option with highest score
        const best = [...q.options].sort((a, b) => b.score - a.score)[0];
        if (best) {
          next[q.tmid] = {
            tmid: q.tmid,
            question_type: q.question_type || "",
            option_ids: [best.wid],
            text: "",
          };
        }
      } else if (q.question_type === "07") {
        // Multiple choice: select all options with positive score, or all if none positive
        const positive = q.options.filter((o) => o.score > 0);
        const toSelect = positive.length > 0 ? positive : q.options;
        next[q.tmid] = {
          tmid: q.tmid,
          question_type: q.question_type || "",
          option_ids: toSelect.map((o) => o.wid),
          text: "",
        };
      }
    }
    // Fill text questions with positive feedback
    for (const q of detail.questions) {
      if (q.question_type !== "01" && q.question_type !== "07") {
        next[q.tmid] = {
          tmid: q.tmid,
          question_type: q.question_type || "",
          option_ids: [],
          text: "优秀",
        };
      }
    }
    setAnswers(next);
    toast.success("已自动填充最高分答案");
  }

  function validateAnswers(): string | null {
    if (!detail) return "问卷未加载";
    for (const q of detail.questions) {
      const ans = answers[q.tmid];
      if (!ans) return `第 ${q.order} 题未作答`;
      if (q.question_type === "01" && (!ans.option_ids || ans.option_ids.length === 0)) {
        return `第 ${q.order} 题（单选）未选择答案`;
      }
      if (q.question_type === "07" && (!ans.option_ids || ans.option_ids.length === 0)) {
        return `第 ${q.order} 题（多选）未选择答案`;
      }
      if (q.question_type !== "01" && q.question_type !== "07" && !ans.text?.trim()) {
        return `第 ${q.order} 题（填空）未填写内容`;
      }
    }
    return null;
  }

  async function handlePreview() {
    const err = validateAnswers();
    if (err) {
      toast.error(err);
      return;
    }
    if (!credential || !selectedTask || !detail) return;
    setSubmitting(true);
    try {
      const res = await calculateScore(credential, {
        group_no: selectedTask.group_no || "",
        wjid: detail.wjid || "",
        eval_type: selectedTask.eval_type || "",
        answers: buildAnswers(),
        teacher_relation_id: selectedTask.teacher_id || "",
        course_name: selectedTask.course_name || "",
        teacher_name: selectedTask.teacher_name || "",
        sequence: selectedTask.sequence,
      });
      setPreviewResult(res);
      setPreviewOpen(true);
    } catch (err) {
      const e = err as Error & { code?: string; status?: number };
      toast.error(e.message || "预检失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    const err = validateAnswers();
    if (err) {
      toast.error(err);
      return;
    }
    if (!credential || !selectedTask || !detail) return;
    setSubmitting(true);
    try {
      await submitEvaluation(credential, {
        group_no: selectedTask.group_no || "",
        wjid: detail.wjid || "",
        eval_type: selectedTask.eval_type || "",
        answers: buildAnswers(),
        teacher_relation_id: selectedTask.teacher_id || "",
        course_name: selectedTask.course_name || "",
        teacher_name: selectedTask.teacher_name || "",
        sequence: selectedTask.sequence,
      });
      toast.success("评教提交成功");
      setDialogOpen(false);
      if (selectedType) {
        handleSelectType(selectedType);
      }
    } catch (err) {
      const e = err as Error & { code?: string; status?: number };
      toast.error(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingTypes) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>学生评教</CardTitle>
          <CardDescription>选择评教类型并完成任务</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <Button
                key={t.code}
                variant={selectedType === t.code ? "default" : "outline"}
                onClick={() => handleSelectType(t.code || "")}
              >
                {t.name}
                {t.count > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {t.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>待评任务</CardTitle>
            <CardDescription>
              {types.find((t) => t.code === selectedType)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <Skeleton className="h-48" />
            ) : tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">暂无待评任务</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tasks.map((task) => {
                  const status = getTaskStatus(task);
                  return (
                    <Card
                      key={task.wid}
                      className={status.active ? "cursor-pointer" : "opacity-60"}
                      onClick={() => handleOpenTask(task)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{task.course_name}</CardTitle>
                            <CardDescription>{task.teacher_name}</CardDescription>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-1 text-sm">
                        <span>学期: {task.term_name}</span>
                        <span>班级: {task.class_name}</span>
                        {task.start_time && <span>开始: {task.start_time}</span>}
                        {task.end_time && <span>结束: {task.end_time}</span>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name || "评教问卷"}</DialogTitle>
            <DialogDescription>
              {selectedTask?.course_name} - {selectedTask?.teacher_name}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={autoFillMaxScore}>
                  <Sparkles className="size-4 mr-1" />
                  自动打满分
                </Button>
              </div>

              {detail?.questions.map((q) => (
                <div key={q.tmid} className="flex flex-col gap-3">
                  <div className="font-medium">
                    {q.order}. {q.text}
                    {q.max_score > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (满分 {q.max_score})
                      </span>
                    )}
                  </div>
                  {q.question_type === "01" && q.options.length > 0 && (
                    <RadioGroup
                      value={answers[q.tmid]?.option_ids?.[0] || ""}
                      onValueChange={(v) =>
                        handleAnswerChange(q, {
                          tmid: q.tmid,
                          question_type: q.question_type || "",
                          option_ids: [v],
                          text: "",
                        })
                      }
                    >
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt) => (
                          <div key={opt.wid} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.wid} id={`${q.tmid}-${opt.wid}`} />
                            <Label htmlFor={`${q.tmid}-${opt.wid}`}>
                              {opt.text}
                              {opt.score > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({opt.score}分)
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                  {q.question_type === "07" && q.options.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt) => {
                        const selected = answers[q.tmid]?.option_ids?.includes(opt.wid) || false;
                        return (
                          <div key={opt.wid} className="flex items-center gap-2">
                            <Checkbox
                              id={`${q.tmid}-${opt.wid}`}
                              checked={selected}
                              onCheckedChange={(checked) => {
                                const current = answers[q.tmid]?.option_ids || [];
                                const next = checked
                                  ? [...current, opt.wid]
                                  : current.filter((id) => id !== opt.wid);
                                handleAnswerChange(q, {
                                  tmid: q.tmid,
                                  question_type: q.question_type || "",
                                  option_ids: next,
                                  text: "",
                                });
                              }}
                            />
                            <Label htmlFor={`${q.tmid}-${opt.wid}`}>
                              {opt.text}
                              {opt.score > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({opt.score}分)
                                </span>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.question_type !== "01" && q.question_type !== "07" && (
                    <Textarea
                      placeholder="请输入答案"
                      value={answers[q.tmid]?.text || ""}
                      onChange={(e) =>
                        handleAnswerChange(q, {
                          tmid: q.tmid,
                          question_type: q.question_type || "",
                          option_ids: [],
                          text: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button variant="secondary" onClick={handlePreview} disabled={submitting || loadingDetail}>
              {submitting ? "预检中..." : "预检答案"}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || loadingDetail}>
              {submitting ? "提交中..." : "提交评教"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>预检结果</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 text-sm">
            {previewResult && Object.entries(previewResult).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
