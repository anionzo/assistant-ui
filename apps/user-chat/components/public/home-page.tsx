"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Mic2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { buttonVariants } from "@/components/ui/button";
import { useBranding } from "@/hooks/use-branding";
import { useT } from "@idx/i18n";
import type { LegalDisplayConfig, ResolvedLegalHome } from "@/lib/server/public-legal";
import { cn } from "@/lib/utils";

const featureIcons = [MessageSquareText, Mic2, ShieldCheck] as const;

export function HomePage({
  home,
  display,
}: {
  home: ResolvedLegalHome;
  display: LegalDisplayConfig;
}) {
  const { branding } = useBranding();
  const t = useT();

  return (
    <PublicSiteShell display={display}>
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafb_100%)]">
        <div className="mx-auto grid min-h-[calc(100dvh-62px)] w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>{home.eyebrow}</span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              {branding.appName}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">{branding.tagline}</p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{home.description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/chat"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 w-full gap-2 bg-slate-950 px-5 text-white shadow-sm shadow-slate-900/10 hover:bg-slate-800 sm:w-auto",
                )}
              >
                {t("home.ctaChat")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {display.showHomeCtaRegister ? (
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 w-full border-slate-300 bg-white px-5 text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto",
                  )}
                >
                  {t("home.ctaRegister")}
                </Link>
              ) : null}
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-600" aria-hidden="true" />
                <span>{t("home.signalSources")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-600" aria-hidden="true" />
                <span>{t("home.signalVoice")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-600" aria-hidden="true" />
                <span>{t("home.signalSync")}</span>
              </div>
            </div>
          </div>

          <div className="relative lg:pl-2">
            <div className="absolute -inset-4 rounded-[2rem] border border-slate-200 bg-white/40 shadow-[0_28px_80px_rgba(15,23,42,0.08)]" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-teal-500" />
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {t("home.mockStatus")}
                </div>
              </div>

              <div className="grid min-h-[440px] bg-white lg:grid-cols-[150px_1fr]">
                <aside className="hidden border-r border-slate-200 bg-slate-50/80 p-3 lg:block">
                  <div className="mb-4 h-8 rounded-lg bg-slate-900" />
                  <div className="space-y-2">
                    {["Admissions", "Forms", "Policy"].map((item, index) => (
                      <div
                        key={item}
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs font-medium",
                          index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                        )}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="flex flex-col">
                  <div className="border-b border-slate-200 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase text-teal-700">{t("home.mockEyebrow")}</p>
                        <h2 className="mt-1 text-base font-semibold text-slate-950">{t("home.mockTitle")}</h2>
                      </div>
                      <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                        {t("home.mockReady")}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 p-4">
                    <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
                      {t("home.mockUserMessage")}
                    </div>
                    <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white">
                      {t("home.mockAssistantMessage")}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <FileText className="size-3.5 text-blue-600" aria-hidden="true" />
                          {t("home.mockSources")}
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-2 rounded-full bg-slate-300" />
                          <div className="h-2 w-4/5 rounded-full bg-slate-200" />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <BrainCircuit className="size-3.5 text-teal-600" aria-hidden="true" />
                          {t("home.mockPipeline")}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="h-2 flex-1 rounded-full bg-teal-500" />
                          <span className="h-2 flex-1 rounded-full bg-blue-500" />
                          <span className="h-2 flex-1 rounded-full bg-amber-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 p-4">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <LockKeyhole className="size-4 text-slate-400" aria-hidden="true" />
                      <div className="h-2 flex-1 rounded-full bg-slate-200" />
                      <div className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white">
                        {t("voice.sendMessage")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {display.showHomeFeatures && home.features.length > 0 ? (
        <section className="bg-[#f7fafb]">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-medium text-teal-700">{t("home.featuresEyebrow")}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                  {t("home.featuresTitle")}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600">{t("home.featuresDescription")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {home.features.map((feature, index) => {
                const Icon = featureIcons[index] ?? MessageSquareText;
                return (
                  <article
                    key={feature.title}
                    className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-950/8"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors group-hover:border-teal-200 group-hover:bg-teal-50 group-hover:text-teal-700">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-slate-950">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-slate-950">{t("home.bottomTitle")}</p>
            <p className="mt-1 text-sm text-slate-600">{t("home.bottomBody")}</p>
          </div>
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 w-full gap-2 border-slate-300 bg-white px-4 text-slate-800 hover:bg-slate-50 sm:w-auto",
            )}
          >
            {t("home.ctaChat")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
