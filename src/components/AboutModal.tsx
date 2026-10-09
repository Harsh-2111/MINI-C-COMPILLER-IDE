import React from 'react';
import { Info, X, Cpu, ArrowRight, Users, GitFork } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const pipelineStages = [
    { name: 'Lexer', desc: 'Token stream scanning & regex pattern matching' },
    { name: 'Parser', desc: 'Grammar analysis & hierarchical AST construction' },
    { name: 'Semantic Analyzer', desc: 'Symbol resolution, scope tracking & type validation' },
    { name: 'TAC Generator', desc: 'Linear three-address code quad emission' },
    { name: 'Optimizer', desc: 'Constant folding & dead code elimination passes' },
  ];

  const team = [
    { name: 'Nishtha Ghatiya', role: 'Compiler Design & Grammar Specification' },
    { name: 'Harsh Savalia', role: 'Intermediate Code Generation & Optimization' },
    { name: 'Tisha Chandnani', role: 'Semantic Analysis & Visual IDE Integration' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                About ByteBloom
              </h3>
              <p className="text-[11px] text-slate-500">Compiler Visualizer &amp; Mini-IDE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-slate-700 dark:text-slate-300">
          {/* Overview */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5 text-xs">
              Overview
            </h4>
            <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
              ByteBloom is an interactive compilation pipeline inspector and mini-IDE for custom C-like languages. It exposes every internal compiler transformation stage in real time, from raw source characters to optimized intermediate representations.
            </p>
          </div>

          {/* Compilation Pipeline Flow */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-xs">
              Compiler Pipeline Architecture
            </h4>
            <div className="space-y-1.5">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={stage.name}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {stage.name}
                    </span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {stage.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 font-semibold text-slate-900 dark:text-slate-100 text-xs">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Project Team</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11.5px]">
                    {member.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {member.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
