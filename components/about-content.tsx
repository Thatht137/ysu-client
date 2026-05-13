"use client";

import { Code, CircleFadingArrowUp, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  APP_VERSION,
  APP_BUILD,
  APP_COPYRIGHT,
  APP_LICENSE,
  APP_REPO,
  APP_OPEN_SOURCE,
  APP_PEOPLE,
} from "@/lib/version";

export function AboutContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2 pb-1">
          <div className="size-24 overflow-hidden rounded-3xl shadow-sm ring-1 ring-border">
            <img
              src="/icon.svg"
              alt="App icon"
              width={96}
              height={96}
              className="size-full dark:invert"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold">{t("app.name")}</h2>
            <span className="font-mono text-xs text-muted-foreground">
              v{APP_VERSION} · {APP_BUILD}
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <a
            href={APP_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-3 transition-colors active:bg-muted/60"
          >
            <Code className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm">Youwenqwq/ysu-client</span>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
          </a>

          <Separator />

          <button
            type="button"
            disabled
            className="flex items-center gap-3 py-3 text-muted-foreground transition-colors"
          >
            <CircleFadingArrowUp className="size-5 shrink-0" />
            <span className="flex-1 text-left text-sm">{t("about.checkUpdate")}</span>
            <span className="text-xs text-muted-foreground">{t("about.version")} {APP_VERSION}</span>
          </button>

          <Separator />

          <Accordion type="single" collapsible>
            <AccordionItem value="openSource">
              <AccordionTrigger className="py-3 text-sm hover:no-underline">
                {t("about.openSource")}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-2">
                  {APP_OPEN_SOURCE.map((c) => (
                    <li key={c.name}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        {c.name}
                        <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          <div className="flex flex-col gap-2 py-3">
            <h3 className="text-sm font-medium">{t("about.credits")}</h3>
            <ul className="flex flex-col gap-2">
              {APP_PEOPLE.map((c) => (
                <li key={c.name}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    {c.name}
                    <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 pt-4 text-center text-xs leading-relaxed text-muted-foreground">
        <p>{t("about.disclaimerText")}</p>
        <p>
          <span>{APP_LICENSE}</span>
          <span className="mx-1.5">·</span>
          <span>{APP_COPYRIGHT}</span>
        </p>
      </div>
    </div>
  );
}
