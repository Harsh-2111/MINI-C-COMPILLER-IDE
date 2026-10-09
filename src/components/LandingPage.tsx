import React, { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  GitFork,
  Layers3,
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

  useEffect(() => {
    let currentProgress = 0;
    let launchTimer = 0;
    const progressTimer = window.setInterval(() => {
      currentProgress = Math.min(100, currentProgress + 2);
      setProgress(currentProgress);

      if (currentProgress === 100) {
        window.clearInterval(progressTimer);
        launchTimer = window.setTimeout(onEnter, 240);
      }
    }, 32);
    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(launchTimer);
    };
  }, [onEnter]);

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
          <div className="h-11 w-11 overflow-hidden rounded-xl border border-amber-200/25 bg-amber-100/10 shadow-lg shadow-amber-950/20">
            <img src="/logo-icon.png" alt="" className="h-full w-full object-contain p-0.5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">OptiLexis AI</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Visual Compiler &amp; Mini-IDE
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

          <div className="relative mb-3 flex w-full max-w-md items-center justify-center sm:justify-start">
            <div className="absolute inset-x-[12%] inset-y-[18%] rounded-full bg-amber-200/25 blur-3xl" />
            <img
              src="/logo.png"
              alt="OptiLexis AI — Visual Compiler and Mini-IDE"
              className="relative h-auto w-full drop-shadow-[0_0_24px_rgba(253,230,138,0.16)]"
            />
          </div>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            OptiLexis AI turns every compile into a visual journey. Explore tokens,
            syntax trees, symbols, intermediate code, optimizations—and the
            program’s result—in one welcoming workspace.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <span className="text-xs text-slate-500">
              A hands-on compiler lab, opening in your browser
            </span>
          </div>

          <div className="mt-12 max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-blue-300">
                  <Workflow className="h-3.5 w-3.5" />
                </span>
                {progress === 100 ? 'Opening your workspace...' : loadingMessages[messageIndex]}
              </span>
              <span className="font-mono tabular-nums text-slate-500">{progress}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label="Preparing OptiLexis AI workspace"
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
              <span className="font-mono">OptiLexis AI Studio</span>
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
        <span>OPTILEXIS AI · VISUAL COMPILER &amp; MINI-IDE</span>
        <span>Built for curiosity and clear thinking.</span>
      </footer>
    </main>
  );
};
