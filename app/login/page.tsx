"use client";

import { useState, useEffect } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  fetchCaptcha,
  loginStep1,
  requestMFACode,
  submitMFACode,
} from "@/lib/api";

type Step = "credentials" | "mfa";

const REMEMBER_KEY = "ysu-login-remember";

function loadRemembered(): { username: string; password: string } | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveRemembered(username: string, password: string) {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
}

function clearRemembered() {
  localStorage.removeItem(REMEMBER_KEY);
}

export default function LoginPage() {
  const router = useRouter();
  const setCredential = useAuthStore((s) => s.setCredential);
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [tempCredential, setTempCredential] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<"sms" | "cpdaily">("cpdaily");
  const [mfaCode, setMfaCode] = useState("");
  const [mobileHint, setMobileHint] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = loadRemembered();
    if (r) {
      setUsername(r.username);
      setPassword(r.password);
      setRemember(true);
    }
  }, []);

  async function handleCheckCaptcha() {
    if (!username) return;
    try {
      const res = await fetchCaptcha(username);
      setNeedsCaptcha(res.needed);
      if (res.needed && res.image_base64) {
        setCaptchaImage(`data:image/png;base64,${res.image_base64}`);
      }
    } catch {
      setNeedsCaptcha(false);
    }
  }

  async function handleSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t("login.usernamePlaceholder"));
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
        if (remember) {
          saveRemembered(username, password);
        } else {
          clearRemembered();
        }
        toast.success(t("login.submit"));
        router.replace("/dashboard");
        return;
      }

      if (res.needs_mfa && res.credential) {
        setTempCredential(res.credential);
        setStep("mfa");
        toast.info("MFA");
        return;
      }

      toast.error(t("login.passwordLabel"));
    } catch (err) {
      const e = err as Error & { code?: string; status?: number };
      if (e.code === "NEED_CAPTCHA" || e.status === 403) {
        toast.error(t("login.captchaLabel"));
        await handleCheckCaptcha();
      } else if (e.code === "MFA_REQUIRED") {
        toast.info("MFA");
        setStep("mfa");
      } else {
        toast.error(e.message || t("login.submit"));
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
      toast.success(`${t("login.mfaSent")} ${res.mobile_hint}`);
    } catch (err) {
      toast.error((err as Error).message || t("login.mfaRequest"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitMFA(e: React.FormEvent) {
    e.preventDefault();
    if (!tempCredential || !mfaCode) {
      toast.error(t("login.mfaCodePlaceholder"));
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
      if (remember) {
        saveRemembered(username, password);
      } else {
        clearRemembered();
      }
      toast.success(t("login.submit"));
      router.replace("/dashboard");
    } catch (err) {
      toast.error((err as Error).message || t("login.mfaCodeLabel"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
          <CardDescription>
            {step === "credentials"
              ? t("login.usernamePlaceholder")
              : t("login.mfaTitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleSubmitCredentials}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">{t("login.usernameLabel")}</FieldLabel>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("login.usernamePlaceholder")}
                    autoComplete="username"
                    onBlur={handleCheckCaptcha}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">{t("login.passwordLabel")}</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    autoComplete="current-password"
                  />
                </Field>
                {needsCaptcha && captchaImage && (
                  <Field>
                    <FieldLabel htmlFor="captcha">{t("login.captchaLabel")}</FieldLabel>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={captchaImage}
                      alt="captcha"
                      className="rounded-md border cursor-pointer transition-opacity hover:opacity-80"
                      onClick={handleCheckCaptcha}
                    />
                    <Input
                      id="captcha"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value)}
                      placeholder={t("login.captchaPlaceholder")}
                    />
                  </Field>
                )}
                <Field orientation="horizontal">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(c) => setRemember(c === true)}
                  />
                  <FieldLabel htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    {t("login.remember")}
                  </FieldLabel>
                </Field>
                <Button type="submit" disabled={loading}>
                  {loading && <Spinner data-icon="inline-start" />}
                  {loading ? t("login.loggingIn") : t("login.submit")}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={handleSubmitMFA}>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend variant="label">{t("login.mfaMethod")}</FieldLegend>
                  <ToggleGroup
                    type="single"
                    value={mfaMethod}
                    onValueChange={(v) =>
                      v && setMfaMethod(v as "sms" | "cpdaily")
                    }
                    className="justify-start"
                  >
                    <ToggleGroupItem value="cpdaily">{t("login.mfaMethodCpdaily")}</ToggleGroupItem>
                    <ToggleGroupItem value="sms">{t("login.mfaMethodSms")}</ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestMFACode}
                  disabled={loading}
                >
                  {loading && <Spinner data-icon="inline-start" />}
                  {loading ? t("login.mfaRequesting") : t("login.mfaRequest")}
                </Button>
                {mobileHint && (
                  <FieldDescription>
                    {t("login.mfaSent")} {mobileHint}
                  </FieldDescription>
                )}
                <Field>
                  <FieldLabel htmlFor="mfaCode">{t("login.mfaCodeLabel")}</FieldLabel>
                  <Input
                    id="mfaCode"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder={t("login.mfaCodePlaceholder")}
                  />
                </Field>
                <Button type="submit" disabled={loading}>
                  {loading && <Spinner data-icon="inline-start" />}
                  {loading ? t("login.mfaVerifying") : t("login.mfaVerify")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("credentials")}
                >
                  {t("login.back")}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
