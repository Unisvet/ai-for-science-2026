import React from 'react';
import { BookOpen, ExternalLink, Sparkles, Terminal, X } from 'lucide-react';
import { GLOSSARY_BY_ID, GLOSSARY_TERMS, GlossaryTerm } from '../data/glossaryData';

function accentStyles(accent: GlossaryTerm['accent']): {
  badge: string;
  border: string;
  title: string;
  pillActive: string;
} {
  switch (accent) {
    case 'cyan':
      return {
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
        border: 'border-cyan-500/40',
        title: 'text-cyan-300',
        pillActive: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60',
      };
    case 'emerald':
      return {
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
        border: 'border-emerald-500/40',
        title: 'text-emerald-300',
        pillActive: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60',
      };
    case 'purple':
      return {
        badge: 'bg-purple-500/15 text-purple-300 border-purple-400/40',
        border: 'border-purple-500/40',
        title: 'text-purple-300',
        pillActive: 'bg-purple-500/25 text-purple-200 border-purple-400/60',
      };
    case 'amber':
      return {
        badge: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
        border: 'border-amber-500/40',
        title: 'text-amber-300',
        pillActive: 'bg-amber-500/25 text-amber-200 border-amber-400/60',
      };
  }
}

export const DeepDiveGlossaryModal: React.FC<{
  termId: string | null;
  onSelectTerm: (id: string) => void;
  onClose: () => void;
}> = ({ termId, onSelectTerm, onClose }) => {
  if (!termId) return null;
  const term = GLOSSARY_BY_ID[termId] ?? GLOSSARY_TERMS[0];
  const styles = accentStyles(term.accent);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Deep Dive: ${term.term}`}
    >
      <div
        className={`w-full max-w-4xl rounded-3xl bg-[#090f20] border ${styles.border} shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Term Switcher Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800/90 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {GLOSSARY_TERMS.map((item) => {
              const isActive = item.id === term.id;
              const itemStyles = accentStyles(item.accent);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTerm(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition ${
                    isActive
                      ? itemStyles.pillActive
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            <X className="w-4 h-4" /> Close (Esc)
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-5">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${styles.badge}`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Concept Deep-Dive
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2.5 leading-tight">
              {term.term}
            </h3>
            <p className={`text-sm sm:text-base font-mono mt-1 ${styles.title}`}>{term.tagline}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plain English */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 sm:p-5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
                In Plain English
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                {term.plainEnglish}
              </p>
            </div>

            {/* Magical Analogy */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-950/45 via-slate-900/90 to-cyan-950/35 border border-purple-400/35 p-4 sm:p-5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Mental Model: {term.magicalAnalogyTitle}
              </div>
              <p className="text-sm sm:text-base text-purple-50/95 leading-relaxed">
                {term.magicalAnalogy}
              </p>
            </div>
          </div>

          {/* How It Fits */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 sm:p-5">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 mb-2.5">
              How It Powers Our End-to-End Pipeline
            </div>
            <ul className="space-y-2">
              {term.howItFits.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-200">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Code / CLI */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Practical Pattern
              </span>
              <a
                href={term.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 underline decoration-cyan-400/45 underline-offset-2"
              >
                {term.docLabel} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <pre className="text-xs sm:text-sm font-mono text-emerald-200 overflow-x-auto leading-relaxed">
              <code>{term.codeOrCli}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
