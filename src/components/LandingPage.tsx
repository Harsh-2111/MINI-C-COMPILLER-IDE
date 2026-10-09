import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Braces,
  Check,
  Code2,
  GitFork,
  Layers3,
  Play,
  Sparkles,
  Terminal,
  Workflow,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const loadingMessages = [
  'Warming up the compiler...',
  'Preparing your workspace...',
  'Loading the visual pipeline...',
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [progress, setProgress] = useState(0);
  const ready = progress === 100;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 2));
    }, 32);
    return () => window.clearInterval(timer);
  }, []);

  const messageIndex = Math.min(
    loadingMessages.length - 1,
    Math.floor(progress / 36)
  );

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_14%,rgba(37,99,235,0.2),transparent_38%),radial-gradient(ellipse_at_88%_68%,rgba(13,148,136,0.13),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-950/30">
            <Braces className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">ByteBloom</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Visual Compiler Studio
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          Your compiler workspace, reimagined
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-14 px-6 pb-14 pt-8 sm:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:pb-20 lg:pt-4">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            From source code to insight
          </div>

          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.5rem]">
            See the story
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-teal-200 bg-clip-text text-transparent">
              inside your code.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            ByteBloom turns every compile into a visual journey. Explore tokens,
            syntax trees, symbols, intermediate code, optimizations—and the
            program’s result—in one welcoming workspace.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onEnter}
              disabled={!ready}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-950/50 transition hover:-translate-y-0.5 hover:bg-blue-400 disabled:cursor-wait disabled:opacity-70"
            >
              {ready ? (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Open the compiler
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Getting things ready
                </>
              )}
            </button>
            <span className="text-xs text-slate-500">
              A hands-on compiler lab, right in your browser
            </span>
          </div>

          <div className="mt-12 max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-blue-300">
                  <Workflow className="h-3.5 w-3.5" />
                </span>
                {ready ? 'Workspace ready' : loadingMessages[messageIndex]}
              </span>
              <span className="font-mono tabular-nums text-slate-500">{progress}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label="Preparing ByteBloom workspace"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Learn by seeing
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Compile and run
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> No setup required
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-blue-500/15 via-transparent to-teal-400/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1424]/95 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 font-mono text-[11px] text-slate-500">main.c</span>
              </div>
              <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                ready
              </span>
            </div>

            <div className="grid grid-cols-[1fr_0.82fr]">
              <div className="border-r border-white/[0.08] p-5 font-mono text-xs leading-7 sm:p-6 sm:text-[13px]">
                <div><span className="text-slate-600">1</span><span className="ml-4 text-purple-300">int</span> <span className="text-blue-200">main</span><span className="text-slate-300">() {'{'}</span></div>
                <div><span className="text-slate-600">2</span><span className="ml-4 text-purple-300">int</span> <span className="text-cyan-200">x</span> <span className="text-slate-400">=</span> <span className="text-amber-200">10</span><span className="text-slate-400">;</span></div>
                <div><span className="text-slate-600">3</span><span className="ml-4 text-purple-300">int</span> <span className="text-cyan-200">y</span> <span className="text-slate-400">=</span> <span className="text-amber-200">20</span><span className="text-slate-400">;</span></div>
                <div><span className="text-slate-600">4</span><span className="ml-4 text-purple-300">return</span> <span className="text-cyan-200">x</span> <span className="text-slate-300">+</span> <span className="text-cyan-200">y</span><span className="text-slate-400">;</span></div>
                <div><span className="text-slate-600">5</span><span className="ml-4 text-slate-300">{'}'}</span></div>
              </div>

              <div className="flex flex-col justify-center gap-3 p-4 sm:p-5">
                <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Terminal className="h-3.5 w-3.5" /> Program output
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                  <div className="text-[10px] text-emerald-200/60">return value</div>
                  <div className="mt-1 font-mono text-3xl font-semibold text-emerald-300">30</div>
                </div>
                <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Code2 className="h-3.5 w-3.5 text-blue-300" /> Lexical analysis
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <GitFork className="h-3.5 w-3.5 text-violet-300" /> AST visualization
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Layers3 className="h-3.5 w-3.5 text-teal-300" /> TAC &amp; optimization
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[10px] text-slate-500">
              <span>5 stages. One clear view.</span>
              <span className="font-mono">ByteBloom Studio</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-300 shadow-xl sm:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
              <Layers3 className="h-3.5 w-3.5" />
            </span>
            From source to result
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pb-6 text-[10px] text-slate-600 sm:px-10">
        <span>BYTEBLOOM · VISUAL COMPILER STUDIO</span>
        <span>Built for curiosity and clear thinking.</span>
      </footer>
    </main>
  );
};
