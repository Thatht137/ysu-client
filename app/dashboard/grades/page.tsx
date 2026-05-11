"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { getGrades } from "@/lib/api";
import type { Grade } from "@/lib/types";
import { Search } from "lucide-react";

export default function GradesPage() {
  const credential = useAuthStore((s) => s.credential);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const ALL_TERM = "__all__";
  const [term, setTerm] = useState(ALL_TERM);
  const [courseName, setCourseName] = useState("");

  const terms = Array.from(new Set(grades.map((g) => g.term).filter(Boolean))).sort();

  useEffect(() => {
    if (!credential) return;
    async function load() {
      try {
        const g = await getGrades(credential!);
        setGrades(g);
      } catch (err) {
        toast.error((err as Error).message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [credential]);

  async function handleSearch() {
    if (!credential) return;
    setLoading(true);
    try {
      const g = await getGrades(credential, {
        term: term === ALL_TERM ? undefined : term,
        course_name: courseName || undefined,
      });
      setGrades(g);
    } catch (err) {
      toast.error((err as Error).message || "查询失败");
    } finally {
      setLoading(false);
    }
  }

  const filtered = grades.filter((g) => {
    if (term !== ALL_TERM && g.term !== term) return false;
    return true;
  });

  if (loading && grades.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>成绩查询</CardTitle>
          <CardDescription>查看各学期课程成绩与绩点</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">学期</label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="全部学期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TERM}>全部学期</SelectItem>
                  {terms.map((t) => (
                    <SelectItem key={t} value={t!}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">课程名</label>
              <Input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="搜索课程..."
                className="w-48"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="size-4" />
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学期</TableHead>
                  <TableHead>课程名</TableHead>
                  <TableHead>课程号</TableHead>
                  <TableHead>成绩</TableHead>
                  <TableHead>绩点</TableHead>
                  <TableHead>学分</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      暂无成绩数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{g.term}</TableCell>
                      <TableCell className="font-medium">{g.course_name}</TableCell>
                      <TableCell>{g.course_code}</TableCell>
                      <TableCell>{g.score}</TableCell>
                      <TableCell>{g.grade_point}</TableCell>
                      <TableCell>{g.credit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{g.course_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {g.is_pass ? (
                          <Badge variant="default">通过</Badge>
                        ) : (
                          <Badge variant="destructive">未通过</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
