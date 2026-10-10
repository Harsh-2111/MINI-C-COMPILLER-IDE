import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

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
        launchTimer = window.setTimeout(onEnter, 2240);
      }
    }, 32);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(launchTimer);
    };
  }, [onEnter]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#07111f] px-6 text-slate-100">
      <section className="flex w-full max-w-md flex-col items-center gap-7 text-center">
        <img
          src="/logo-icon.png"
          alt="OptiLexis AI robot logo"
          className="h-32 w-32 rounded-3xl object-contain drop-shadow-[0_0_32px_rgba(45,212,191,0.2)] sm:h-40 sm:w-40"
        />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">OptiLexis AI</h1>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-label="Loading OptiLexis AI"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>
    </main>
  );
};
