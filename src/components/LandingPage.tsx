import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
  autoEnter?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, autoEnter = true }) => {
  const [progress, setProgress] = useState(autoEnter ? 0 : 100);

  useEffect(() => {
    if (!autoEnter) return;

    let currentProgress = 0;
    let launchTimer = 0;
    const progressTimer = window.setInterval(() => {
      currentProgress = Math.min(100, currentProgress + 2);
      setProgress(currentProgress);

      if (currentProgress === 100) {
        window.clearInterval(progressTimer);
        launchTimer = window.setTimeout(onEnter, 2240);
      }
    }, 32);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(launchTimer);
    };
  }, [autoEnter, onEnter]);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#07111f] px-6 text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(14,116,144,0.14),transparent_38%),radial-gradient(ellipse_at_16%_12%,rgba(37,99,235,0.12),transparent_32%),radial-gradient(ellipse_at_86%_88%,rgba(13,148,136,0.1),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_76%)]" />
        <div className="absolute left-1/2 top-1/2 h-[min(76vw,34rem)] w-[min(76vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/[0.07] [transform:translate(-50%,-50%)_rotateX(68deg)]" />
        <div className="absolute left-1/2 top-1/2 h-[min(58vw,25rem)] w-[min(58vw,25rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/[0.08] [transform:translate(-50%,-50%)_rotateX(68deg)]" />
        <span className="absolute left-[12%] top-[22%] hidden font-mono text-4xl text-cyan-100/[0.12] sm:block">&lt;&gt;</span>
        <span className="absolute right-[14%] top-[29%] hidden font-mono text-3xl text-blue-100/[0.12] sm:block">{'{ }'}</span>
        <span className="absolute bottom-[25%] left-[18%] hidden font-mono text-xs tracking-[0.35em] text-teal-100/[0.16] sm:block">TOKENS · AST</span>
        <span className="absolute bottom-[20%] right-[16%] hidden font-mono text-xs tracking-[0.35em] text-cyan-100/[0.14] sm:block">SOURCE → OUTPUT</span>
        <span className="absolute right-[27%] top-[17%] hidden font-mono text-sm text-slate-100/[0.1] md:block">01</span>
        <span className="absolute bottom-[33%] left-[11%] hidden font-mono text-sm text-slate-100/[0.1] md:block">TAC</span>
      </div>

      <section className="relative z-10 flex w-full max-w-md flex-col items-center gap-7 text-center sm:gap-8">
        <div className="relative flex h-48 w-48 items-center justify-center [perspective:800px] sm:h-56 sm:w-56">
          <div aria-hidden="true" className="absolute inset-2 rounded-[2.5rem] bg-gradient-to-br from-cyan-300/20 via-blue-500/10 to-teal-300/20 blur-2xl" />
          <div aria-hidden="true" className="absolute inset-3 rotate-[-8deg] rounded-[2.25rem] border border-cyan-100/15 bg-gradient-to-br from-white/[0.07] to-white/[0.015] shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-sm" />
          <div aria-hidden="true" className="absolute inset-7 rotate-[7deg] rounded-[1.8rem] border border-teal-100/10" />
          <img
            src="/logo-icon.png"
            alt="OptiLexis AI robot logo"
            className="relative h-44 w-44 object-contain drop-shadow-[0_16px_32px_rgba(45,212,191,0.24)] sm:h-52 sm:w-52"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight drop-shadow-[0_2px_18px_rgba(34,211,238,0.16)] sm:text-5xl">
          OptiLexis AI
        </h1>
        {autoEnter ? (
          <div className="w-full max-w-md rounded-full border border-white/[0.07] bg-slate-900/70 p-1.5 shadow-[0_12px_44px_rgba(0,0,0,0.3)] backdrop-blur">
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-800/90"
              role="progressbar"
              aria-label="Loading OptiLexis AI"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.35)] transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={onEnter}
            className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/20"
          >
            Enter Workspace
          </button>
        )}
      </section>
      <footer className="absolute inset-x-0 bottom-5 z-10 px-4 text-center text-[11px] tracking-wide text-slate-500/80">
        © {new Date().getFullYear()} OptiLexis AI. All rights reserved.
      </footer>
    </main>
  );
};
