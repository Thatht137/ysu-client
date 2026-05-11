"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useAuthStore } from "@/lib/auth-store";
import {
  fetchCaptcha,
  loginStep1,
  requestMFACode,
  submitMFACode,
} from "@/lib/api";

type Step = "credentials" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const setCredential = useAuthStore((s) => s.setCredential);

  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [tempCredential, setTempCredential] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<"sms" | "cpdaily">("cpdaily");
  const [mfaCode, setMfaCode] = useState("");
  const [mobileHint, setMobileHint] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheckCaptcha() {
    if (!username) return;
    try {
      const res = await fetchCaptcha(username);
      setNeedsCaptcha(res.needed);
      if (res.needed && res.image_base64) {
        setCaptchaImage(`data:image/png;base64,${res.image_base64}`);
      }
    } catch {
      // captcha not needed or error, proceed
      setNeedsCaptcha(false);
    }
  }

  async function handleSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("请输入学号和密码");
      return;
    }
    setLoading(true);
    try {
      const res = await loginStep1({
        username,
        password,
        captcha: needsCaptcha ? captcha : undefined,
      });

      if (res.authenticated && res.credential) {
        setCredential(res.credential, username);
        toast.success("登录成功");
        router.replace("/dashboard");
        return;
      }

      if (res.needs_mfa && res.credential) {
        setTempCredential(res.credential);
        setStep("mfa");
        toast.info("需要 MFA 验证");
        return;
      }

      toast.error("登录失败，请检查用户名和密码");
    } catch (err) {
      const e = err as Error & { code?: string; status?: number };
      if (e.code === "NEED_CAPTCHA" || e.status === 403) {
        toast.error("需要验证码，请重新输入");
        await handleCheckCaptcha();
      } else if (e.code === "MFA_REQUIRED") {
        toast.info("需要 MFA 验证");
        setStep("mfa");
      } else {
        toast.error(e.message || "登录失败");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestMFACode() {
    if (!tempCredential) return;
    setLoading(true);
    try {
      const res = await requestMFACode(
        { username, method: mfaMethod },
        tempCredential,
      );
      setMobileHint(res.mobile_hint);
      setMethodCode(res.method_code);
      toast.success(`验证码已发送至 ${res.mobile_hint}`);
    } catch (err) {
      toast.error((err as Error).message || "请求验证码失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitMFA(e: React.FormEvent) {
    e.preventDefault();
    if (!tempCredential || !mfaCode) {
      toast.error("请输入验证码");
      return;
    }
    setLoading(true);
    try {
      const res = await submitMFACode(
        {
          username,
          method: mfaMethod,
          method_code: methodCode,
          code: mfaCode,
        },
        tempCredential,
      );
      setCredential(res.credential, username);
      toast.success("登录成功");
      router.replace("/dashboard");
    } catch (err) {
      toast.error((err as Error).message || "验证码错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>燕山大学教务系统</CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "请输入学号和密码登录"
              : "请输入 MFA 验证码"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleSubmitCredentials} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">学号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入学号"
                  autoComplete="username"
                  onBlur={handleCheckCaptcha}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </div>
              {needsCaptcha && captchaImage && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="captcha">验证码</Label>
                  <img
                    src={captchaImage}
                    alt="captcha"
                    className="rounded-md border"
                    onClick={handleCheckCaptcha}
                  />
                  <Input
                    id="captcha"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    placeholder="请输入验证码"
                  />
                </div>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmitMFA} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>MFA 方式</Label>
                <ToggleGroup
                  type="single"
                  value={mfaMethod}
                  onValueChange={(v) =>
                    v && setMfaMethod(v as "sms" | "cpdaily")
                  }
                  className="justify-start"
                >
                  <ToggleGroupItem value="cpdaily">今日校园</ToggleGroupItem>
                  <ToggleGroupItem value="sms">短信</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestMFACode}
                disabled={loading}
              >
                {loading ? "发送中..." : "获取验证码"}
              </Button>
              {mobileHint && (
                <p className="text-sm text-muted-foreground">
                  验证码将发送至 {mobileHint}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="mfaCode">验证码</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="请输入验证码"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "验证中..." : "验证"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("credentials")}
              >
                返回
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
