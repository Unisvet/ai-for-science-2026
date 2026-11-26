import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  ExternalLink,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PanelTop,
  PanelTopClose,
  Printer,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { GLOSSARY_BY_ID, GLOSSARY_TERMS } from '../data/glossaryData';
import { SLIDES_DATA } from '../data/slidesData';
import { DemoExecutionMode, NavView } from '../types/presentation';
import { soundEngine } from '../utils/soundEngine';
import { DeepDiveGlossaryModal } from './DeepDiveGlossaryModal';
import { FormattedText, stripMarkdownLinks } from './FormattedText';
import { SlideWidgetRenderer } from './SlideWidgetRenderer';
import { VisualPanoramaSlideBody } from './VisualPanoramaSlideBody';

// Optional local-only presenter cues loaded exclusively when gitignored
// `web/src/data/speakerNotes.local.ts` exists on the presenter's machine.
// On GitHub / GitHub Pages CI builds this resolves to `{}` with zero notes bundled.
const localNotesModules = import.meta.glob<{ LOCAL_SPEAKER_NOTES?: Record<string, string> }>(
  '../data/speakerNotes.local.ts',
  { eager: true }
);
const LOCAL_NOTES: Record<string, string> =
  Object.values(localNotesModules)[0]?.LOCAL_SPEAKER_NOTES ?? {};
const HAS_LOCAL_NOTES = Object.keys(LOCAL_NOTES).length > 0;

function getInitialSlideIndex(total: number): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.location.hash.replace(/^#/, '').trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= total) {
    return parsed - 1;
  }
  return 0;
}

function parseBulletKicker(bullet: string): { kicker: string | null; body: string } {
  const colonIdx = bullet.indexOf(': ');
  if (colonIdx > 0 && colonIdx <= 48) {
    return {
      kicker: bullet.slice(0, colonIdx),
      body: bullet.slice(colonIdx + 2),
    };
  }
  return { kicker: null, body: bullet };
}

export const SlideDeckView: React.FC<{
  demoMode: DemoExecutionMode;
  onToggleDemoMode: () => void;
  onOpenPdfView: () => void;
  onSelectView: (v: NavView) => void;
  cinemaMode: boolean;
  onToggleCinemaMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}> = ({
  demoMode,
  onToggleDemoMode,
  onOpenPdfView,
  onSelectView,
  cinemaMode,
  onToggleCinemaMode,
  soundEnabled,
  onToggleSound,
}) => {
  const total = SLIDES_DATA.length;
  const [slideIdx, setSlideIdx] = useState<number>(() => getInitialSlideIndex(total));
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showOverview, setShowOverview] = useState<boolean>(false);
  const [activeGlossaryTermId, setActiveGlossaryTermId] = useState<string | null>(null);
  const [mediaTab, setMediaTab] = useState<'widget' | 'illustration'>('widget');
  const [activeEpochIdx, setActiveEpochIdx] = useState<number | null>(null);
  const [oscIdle, setOscIdle] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [stageScale, setStageScale] = useState<number>(1);
  const idleTimerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  const slide = SLIDES_DATA[slideIdx];
  const progressPct = ((slideIdx + 1) / total) * 100;

  // Responsive desktop viewport auto-fit: keeps 100% native scale when content
  // fits, and smoothly scales down only if a short screen or dense widget would
  // otherwise overflow — guaranteeing zero vertical scrolling in Cinema Stage Mode.
  useLayoutEffect(() => {
    const computeFit = () => {
      if (typeof window === 'undefined' || window.innerWidth < 1024) {
        setStageScale(1);
        return;
      }
      const vp = viewportRef.current;
      const content = contentRef.current;
      if (!vp || !content) return;

      const availableH = vp.clientHeight;
      const naturalH = content.scrollHeight;
      if (availableH > 0 && naturalH > availableH + 2) {
        const nextScale = Math.max(0.68, Math.min(1, availableH / naturalH));
        setStageScale((prev) => (Math.abs(prev - nextScale) > 0.004 ? nextScale : prev));
      } else {
        setStageScale(1);
      }
    };

    computeFit();
    const rafId = window.requestAnimationFrame(computeFit);

    const observer = new ResizeObserver(() => {
      computeFit();
    });
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener('resize', computeFit);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', computeFit);
    };
  }, [slideIdx, mediaTab, cinemaMode, isFullscreen, activeEpochIdx]);

  // Sync URL #1 .. #N hash like Marp / Bespoke decks
  useEffect(() => {
    const targetHash = `#${slideIdx + 1}`;
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [slideIdx]);

  useEffect(() => {
    setActiveEpochIdx(null);
  }, [slideIdx]);

  // Play the Lyria 3.5 orchestral overture on Slide 1 whenever Stage Audio Cues are enabled
  useEffect(() => {
    if (soundEnabled && slideIdx === 0) {
      soundEngine.startSlide1Overture();
    } else {
      soundEngine.stopSlide1Overture();
    }
    return () => {
      soundEngine.stopSlide1Overture();
    };
  }, [soundEnabled, slideIdx]);

  useEffect(() => {
    const onHashChange = () => {
      const idx = getInitialSlideIndex(total);
      setSlideIdx(idx);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [total]);

  // Reset media tab to illustration if a slide has one & widget isn't a live demo
  useEffect(() => {
    if (slide.illustration && !slide.widget.startsWith('demo-')) {
      setMediaTab('illustration');
    } else {
      setMediaTab('widget');
    }
  }, [slideIdx, slide.illustration, slide.widget]);

  // Auto-fade floating OSC bar after inactivity in Cinema/Fullscreen mode
  const wakeOsc = useCallback(() => {
    setOscIdle(false);
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    if (cinemaMode) {
      idleTimerRef.current = window.setTimeout(() => {
        setOscIdle(true);
      }, 3200);
    }
  }, [cinemaMode]);

  useEffect(() => {
    wakeOsc();
    window.addEventListener('mousemove', wakeOsc);
    window.addEventListener('keydown', wakeOsc);
    return () => {
      window.removeEventListener('mousemove', wakeOsc);
      window.removeEventListener('keydown', wakeOsc);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [wakeOsc]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const goNext = useCallback(() => {
    setSlideIdx((prev) => {
      if (prev < total - 1) {
        soundEngine.playSlideTransition('next');
        return prev + 1;
      }
      return prev;
    });
  }, [total]);

  const goPrev = useCallback(() => {
    setSlideIdx((prev) => {
      if (prev > 0) {
        soundEngine.playSlideTransition('prev');
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          if (activeGlossaryTermId) setActiveGlossaryTermId(null);
          else if (showOverview) setShowOverview(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (activeGlossaryTermId) setActiveGlossaryTermId(null);
        else if (showOverview) setShowOverview(false);
        else if (showNotes) setShowNotes(false);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === 'd') {
        setActiveGlossaryTermId((prev) =>
          prev ? null : (slide.deepDiveTerms?.[0] ?? GLOSSARY_TERMS[0].id)
        );
      } else if (e.key.toLowerCase() === 'n' && HAS_LOCAL_NOTES) {
        setShowNotes((s) => !s);
      } else if (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 'g') {
        setShowOverview((s) => !s);
      } else if (e.key.toLowerCase() === 'i' && slide.illustration && slide.layout !== 'visual-panorama') {
        setMediaTab((t) => (t === 'illustration' ? 'widget' : 'illustration'));
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (slide.layout === 'visual-panorama' && slide.panoramaEpochs) {
        if (e.key === '0') {
          setActiveEpochIdx(null);
        } else if (/^[1-9]$/.test(e.key)) {
          const idx = Number.parseInt(e.key, 10) - 1;
          if (idx < slide.panoramaEpochs.length) {
            setActiveEpochIdx((prev) => (prev === idx ? null : idx));
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeGlossaryTermId, goNext, goPrev, showNotes, showOverview, slide.deepDiveTerms, slide.illustration, slide.layout, slide.panoramaEpochs, toggleFullscreen]);

  const metricBadgeStyle = (accent: 'cyan' | 'emerald' | 'purple' | 'amber') => {
    switch (accent) {
      case 'cyan':
        return 'border-cyan-500/35 bg-cyan-950/25 text-cyan-200';
      case 'emerald':
        return 'border-emerald-500/35 bg-emerald-950/25 text-emerald-200';
      case 'purple':
        return 'border-purple-500/35 bg-purple-950/25 text-purple-200';
      case 'amber':
        return 'border-amber-500/35 bg-amber-950/25 text-amber-200';
    }
  };

  const kickerColorClass = (idx: number) => {
    if (idx === 0) return 'text-cyan-300';
    if (idx === 1) return 'text-amber-300';
    if (idx === 2) return 'text-emerald-300';
    return 'text-purple-300';
  };

  const narrativeChars =
    stripMarkdownLinks(slide.keyTakeaway).length +
    slide.bullets.reduce((acc, b) => acc + stripMarkdownLinks(b).length, 0);
  const isConciseSlide = narrativeChars < 530 && slide.bullets.length <= 3;
  const isDenseSlide = slide.bullets.length >= 4 || narrativeChars > 660;

  return (
    <div
      className={`relative w-full flex-1 flex flex-col justify-between overflow-x-hidden lg:h-full lg:min-h-0 lg:overflow-hidden ${
        cinemaMode ? 'min-h-screen' : 'min-h-[calc(100vh-3.25rem)]'
      }`}
    >
      {/* Top 3px Full-Screen-Width Progress Bar */}
      <div className="h-[3px] w-full bg-slate-900/90 shrink-0">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(34,211,238,0.65)]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Viewport-Locked Stage Container (Auto-Fits on Desktop, Scrolls Gracefully on Mobile) */}
      <div ref={viewportRef} className="relative w-full flex-1 min-h-0 lg:overflow-hidden flex flex-col">
        {/* Full-Screen-Width 16:9 Stage Section */}
        <section
          ref={contentRef}
          style={
            stageScale < 0.999
              ? {
                  transform: `scale(${stageScale})`,
                  transformOrigin: 'top center',
                }
              : undefined
          }
          className="relative w-full shrink-0 min-h-full flex flex-col justify-between px-5 sm:px-7 lg:px-10 xl:px-12 pt-3 lg:pt-3.5 pb-14 lg:pb-14"
        >
          {/* Full-Width Slide Header (100% width across both columns) */}
          <header className="w-full border-b border-slate-700/45 pb-2.5 mb-3 xl:mb-3.5 shrink-0">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="shrink-0 px-3 py-0.5 rounded-full text-[11px] sm:text-xs xl:text-[13px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-400/35">
                  {slide.act}
                </span>
                <span className="text-sm sm:text-base xl:text-lg 2xl:text-[1.12rem] font-semibold text-cyan-200/95 truncate min-w-0">
                  <FormattedText text={slide.subtitle} />
                </span>
              </div>

              {/* Floating-style Top-Right Date / Time / Pagination Badges */}
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                <button
                  type="button"
                  onClick={() => setActiveGlossaryTermId(slide.deepDiveTerms?.[0] ?? GLOSSARY_TERMS[0].id)}
                  title="Open Concept Deep-Dive Glossary (Shortcut: D)"
                  className="no-print inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/50 hover:bg-purple-400 hover:text-slate-950 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Deep-Dive Terms (D)</span>
                </button>
                <a
                  href="https://gdgaiforscience.github.io/devfest-program/#svetlana-meissner"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="GDG Australia Workshop"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-slate-900/90 text-slate-100 border border-cyan-400/45 hover:border-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 shadow transition"
                >
                  <span>GDG Australia</span>
                  <ExternalLink className="w-3 h-3 text-cyan-300" />
                </a>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-900/85 text-slate-200 border border-slate-700/80">
                  <Clock className="w-3 h-3 text-purple-400" />
                  {slide.timeRange}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-slate-950 text-cyan-300 border border-slate-800">
                  {String(slide.number).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </span>
              </div>
            </div>

            <h1 className="w-full text-2xl sm:text-3xl lg:text-[2.05rem] xl:text-[2.35rem] 2xl:text-[2.65rem] font-extrabold tracking-tight text-white leading-[1.08]">
              {slide.title}
            </h1>
          </header>

          {/* Slide Body: Full-Width Panoramic Image Showcase OR Universal 2-Column Split */}
          {slide.layout === 'visual-panorama' ? (
            <VisualPanoramaSlideBody
              slide={slide}
              activeEpochIdx={activeEpochIdx}
              onSelectEpoch={setActiveEpochIdx}
            />
          ) : (
          <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1.88fr)] gap-4 lg:gap-5 xl:gap-6 items-stretch min-h-0">
            {/* Left Narrative Column (~37.3% balanced width for compact wrapping & crisp legibility) */}
            <div className="flex flex-col justify-between gap-2.5 xl:gap-3 min-w-0 min-h-0">
              <div className="flex-1 flex flex-col gap-2.5 xl:gap-3 min-h-0">
                {/* Core Architectural Thesis Callout */}
                <div
                  className={`shrink-0 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-cyan-950/25 border border-cyan-500/40 shadow-lg flex flex-col justify-center ${
                    slide.number === 1
                      ? 'px-4 py-3 xl:px-4.5 xl:py-3.5'
                      : 'px-3.5 py-2.5 sm:px-4 sm:py-3'
                  }`}
                >
                  <div className="text-[11px] sm:text-xs xl:text-[13px] font-mono font-bold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" /> Core Architectural Thesis
                  </div>
                  <p
                    className={`whitespace-pre-line font-normal tracking-[-0.01em] ${
                      slide.number === 1
                        ? 'text-base sm:text-lg lg:text-[1.12rem] xl:text-[1.24rem] 2xl:text-[1.36rem] text-white leading-[1.38] xl:leading-[1.42]'
                        : isDenseSlide
                          ? 'text-sm sm:text-[0.95rem] lg:text-[0.98rem] xl:text-[1.06rem] 2xl:text-[1.14rem] text-slate-50 leading-[1.36] xl:leading-[1.4]'
                          : isConciseSlide
                            ? 'text-base sm:text-lg lg:text-[1.1rem] xl:text-[1.22rem] 2xl:text-[1.32rem] text-white leading-[1.4] xl:leading-[1.45]'
                            : 'text-sm sm:text-base lg:text-[1.04rem] xl:text-[1.14rem] 2xl:text-[1.24rem] text-slate-50 leading-[1.38] xl:leading-[1.42]'
                    }`}
                  >
                    <FormattedText text={slide.keyTakeaway} />
                  </p>
                </div>

                {/* Clean Non-Slop Typographic Stack (.points-stack) */}
                <div className={`flex-1 flex flex-col min-h-0 ${isDenseSlide ? 'gap-2' : 'gap-2.5'}`}>
                  {slide.bullets.map((b, i) => {
                    const { kicker, body } = parseBulletKicker(b);
                    const bodyLines = body.split('\n').filter(Boolean);
                    const isMultiLine = bodyLines.length > 1;
                    const isQuoteHighlight = i === 3;
                    const bulletImage = slide.bulletImages?.[i];
                    return (
                      <div
                        key={b}
                        className={`flex-1 flex ${
                          bulletImage ? 'flex-row items-center gap-3' : 'flex-col justify-center'
                        } rounded-xl border transition ${
                          isDenseSlide || slide.number === 1 ? 'px-3.5 py-2 xl:px-4 xl:py-2.5' : 'px-3.5 py-2.5 xl:px-4 xl:py-3'
                        } ${
                          isQuoteHighlight
                            ? 'bg-gradient-to-r from-purple-950/40 via-slate-900/70 to-emerald-950/30 border-purple-400/35 hover:border-purple-300/55'
                            : 'bg-white/[0.04] hover:bg-white/[0.065] border-white/[0.1]'
                        }`}
                      >
                        <div className={bulletImage ? 'flex-1 min-w-0 flex flex-col justify-center' : 'contents'}>
                          {kicker ? (
                            <>
                              <span
                                className={`block font-mono font-semibold uppercase tracking-wider mb-1 text-[11px] sm:text-xs xl:text-[13px] ${kickerColorClass(i)}`}
                              >
                                {kicker}
                              </span>
                              {isMultiLine ? (
                                <ul className="space-y-1">
                                  {bodyLines.map((line) => (
                                    <li
                                      key={line}
                                      className="flex items-start gap-2 text-sm sm:text-[0.95rem] lg:text-[0.96rem] xl:text-[1.04rem] 2xl:text-[1.12rem] font-normal text-slate-100 leading-snug"
                                    >
                                      <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 bg-current ${kickerColorClass(i)}`} />
                                      <span>
                                        <FormattedText text={line} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p
                                  className={`font-normal leading-[1.38] xl:leading-[1.42] ${
                                    isQuoteHighlight
                                      ? 'text-sm lg:text-[0.92rem] xl:text-[1.0rem] 2xl:text-[1.08rem] text-purple-50'
                                      : isDenseSlide
                                        ? 'text-sm lg:text-[0.92rem] xl:text-[1.0rem] 2xl:text-[1.06rem] text-slate-100'
                                        : isConciseSlide
                                          ? 'text-sm sm:text-base lg:text-[1.02rem] xl:text-[1.1rem] 2xl:text-[1.18rem] text-slate-100'
                                          : 'text-sm sm:text-base lg:text-[0.96rem] xl:text-[1.05rem] 2xl:text-[1.12rem] text-slate-100'
                                  }`}
                                >
                                  <FormattedText text={body} />
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`font-mono text-sm font-semibold mt-0.5 shrink-0 ${kickerColorClass(i)}`}
                              >
                                0{i + 1}
                              </span>
                              <p
                                className={`font-normal leading-[1.38] xl:leading-[1.42] ${
                                  isConciseSlide
                                    ? 'text-sm sm:text-base lg:text-[1.02rem] xl:text-[1.1rem] 2xl:text-[1.18rem] text-slate-100'
                                    : 'text-sm sm:text-base lg:text-[0.96rem] xl:text-[1.05rem] 2xl:text-[1.12rem] text-slate-100'
                                }`}
                              >
                                <FormattedText text={body} />
                              </p>
                            </div>
                          )}
                        </div>
                        {bulletImage && (
                          <img
                            src={bulletImage.src}
                            alt={bulletImage.alt}
                            className="h-16 sm:h-20 xl:h-24 w-auto max-w-[4.5rem] object-contain rounded-md border border-white/15 bg-slate-950/60 shadow-lg shadow-black/50 shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Deep-Dive Term Buttons + Metrics + Optional Slide 1 Speaker Badge */}
              <div className="space-y-2 shrink-0">
                {slide.deepDiveTerms && slide.deepDiveTerms.length > 0 && (
                  <div className="no-print flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mr-0.5">
                      Explain:
                    </span>
                    {slide.deepDiveTerms.map((termId) => {
                      const term = GLOSSARY_BY_ID[termId];
                      if (!term) return null;
                      return (
                        <button
                          key={term.id}
                          type="button"
                          onClick={() => setActiveGlossaryTermId(term.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-900/90 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/35 hover:border-cyan-300 transition shadow-sm"
                        >
                          <BookOpen className="w-3 h-3 text-cyan-300 shrink-0" />
                          <span>{term.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {slide.metrics && (
                  <div className="grid grid-cols-3 gap-2">
                    {slide.metrics.map((m) =>
                      m.href ? (
                        <a
                          key={m.label}
                          href={m.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open ${m.href}`}
                          className={`block rounded-xl border px-2.5 py-1.5 xl:px-3 xl:py-2 transition hover:brightness-125 hover:border-white/40 ${metricBadgeStyle(m.accent)}`}
                        >
                          <div className="text-[11px] xl:text-xs font-mono opacity-95 truncate">
                            {m.label}
                          </div>
                          <div className="text-xs sm:text-[13px] xl:text-sm 2xl:text-[15px] font-extrabold font-mono tracking-tight leading-tight mt-0.5 underline decoration-current/45 underline-offset-2 truncate">
                            {m.value}
                          </div>
                        </a>
                      ) : m.glossaryTermId ? (
                        <button
                          key={m.label}
                          type="button"
                          onClick={() => setActiveGlossaryTermId(m.glossaryTermId!)}
                          title={`Explain ${m.value}`}
                          className={`text-left rounded-xl border px-2.5 py-1.5 xl:px-3 xl:py-2 transition hover:brightness-125 hover:border-white/40 cursor-pointer ${metricBadgeStyle(m.accent)}`}
                        >
                          <div className="text-[11px] xl:text-xs font-mono opacity-95 truncate flex items-center justify-between gap-1">
                            <span className="truncate">{m.label}</span>
                            <BookOpen className="w-3 h-3 shrink-0 opacity-80" />
                          </div>
                          <div className="text-xs sm:text-[13px] xl:text-sm 2xl:text-[15px] font-extrabold font-mono tracking-tight leading-tight mt-0.5 underline decoration-current/45 underline-offset-2 truncate">
                            {m.value}
                          </div>
                        </button>
                      ) : (
                        <div
                          key={m.label}
                          className={`rounded-xl border px-2.5 py-1.5 xl:px-3 xl:py-2 ${metricBadgeStyle(m.accent)}`}
                        >
                          <div className="text-[11px] xl:text-xs font-mono opacity-95 truncate">
                            {m.label}
                          </div>
                          <div className="text-xs sm:text-[13px] xl:text-sm 2xl:text-[15px] font-extrabold font-mono tracking-tight leading-tight mt-0.5 truncate">
                            {m.value}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {slide.number === 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/90 border border-cyan-400/35 px-3.5 py-2 shadow-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center shrink-0">
                        SM
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm xl:text-[15px] font-extrabold text-white leading-tight truncate">
                          Svetlana Meissner
                        </div>
                        <div className="text-[11px] xl:text-xs font-mono text-cyan-300 truncate">
                          AI Researcher &amp; Architect • Wireless Systems, BTU Cottbus
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] xl:text-xs font-mono font-semibold text-emerald-300 shrink-0">
                      50-Min Workshop • GDG Australia
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Media / Interactive Demo / Illustration Column (~62.7% Golden Ratio) */}
            <div className="flex flex-col min-h-[340px] lg:min-h-0 min-w-0">
              {slide.illustration && (
                <div className="flex items-center justify-end gap-1.5 mb-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMediaTab('illustration')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold border transition ${
                      mediaTab === 'illustration'
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Illustration (I)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaTab('widget')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold border transition ${
                      mediaTab === 'widget'
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Interactive View (I)
                  </button>
                </div>
              )}

              <div className="flex-1 flex flex-col justify-center min-h-0 w-full">
                {slide.illustration && mediaTab === 'illustration' ? (
                  <figure className="relative w-full h-full max-h-full my-auto flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[#060911] shadow-[0_18px_42px_rgba(0,0,0,0.55)]">
                    <img
                      src={slide.illustration.src}
                      alt={slide.illustration.alt}
                      className={`w-full h-full ${
                        slide.illustration.fit === 'contain' ? 'object-contain p-3' : 'object-cover'
                      }`}
                    />
                    {slide.illustration.caption && (
                      <figcaption className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 text-xs xl:text-sm font-mono text-slate-100">
                        {slide.illustration.caption}
                      </figcaption>
                    )}
                  </figure>
                ) : (
                  <SlideWidgetRenderer
                    widget={slide.widget}
                    mode={demoMode}
                    onToggleMode={onToggleDemoMode}
                  />
                )}
              </div>
            </div>
          </div>
          )}

          {/* Subtle "...made with Antigravity" Bottom-Right Signature */}
          <div className="pointer-events-none hidden md:inline-flex items-center gap-1.5 absolute bottom-3.5 right-7 lg:right-12 font-mono text-[11px] text-slate-400">
            <span>...made with</span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <strong className="text-cyan-400 font-bold">Antigravity</strong>
          </div>
        </section>
      </div>

      {/* Local-Only Floating Speaker Notes Drawer (rendered only when local notes file exists) */}
      {HAS_LOCAL_NOTES && showNotes && LOCAL_NOTES[slide.id] && (
        <div className="no-print fixed bottom-20 left-6 right-6 lg:left-14 lg:right-14 z-30 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-amber-500/45 p-5 text-sm sm:text-base xl:text-lg text-amber-100 font-mono leading-relaxed shadow-2xl flex items-start justify-between gap-4">
          <div>
            <strong className="text-amber-300 uppercase mr-2">
              [Local Speaker Cue • Slide {slide.number} • {slide.timeRange}]:
            </strong>
            <FormattedText text={LOCAL_NOTES[slide.id]} />
          </div>
          <button
            type="button"
            onClick={() => setShowNotes(false)}
            className="p-1 rounded-lg text-amber-300 hover:bg-amber-500/20 shrink-0"
            title="Close Speaker Notes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bespoke/Marp-Inspired Floating On-Screen Controls (OSC) at Bottom-Center */}
      <div
        onMouseEnter={() => setOscIdle(false)}
        className={`no-print fixed bottom-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-[0_10px_30px_rgba(0,0,0,0.65)] transition-opacity duration-300 ${
          oscIdle && cinemaMode ? 'opacity-15 hover:opacity-100' : 'opacity-95 hover:opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={slideIdx === 0}
          title="Previous Slide (←)"
          className="p-1.5 rounded-full text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowOverview((s) => !s)}
          title="Open Slide Overview Grid (Shortcut: O)"
          className="px-3 py-1 rounded-full text-xs font-mono font-bold text-slate-100 hover:bg-slate-800/90 transition min-w-[84px] text-center"
        >
          {slide.number} / {total}
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={slideIdx === total - 1}
          title="Next Slide (→ or Space)"
          className="p-1.5 rounded-full bg-cyan-400/20 text-cyan-200 hover:bg-cyan-400 hover:text-slate-950 disabled:opacity-30 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="h-4 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => setShowOverview((s) => !s)}
          title="Slide Overview Grid (O)"
          className={`p-1.5 rounded-full transition ${
            showOverview ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {HAS_LOCAL_NOTES && (
          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            title="Toggle Local Presenter Notes (N)"
            className={`p-1.5 rounded-full transition ${
              showNotes ? 'bg-amber-500/25 text-amber-200' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSound}
          title="Toggle Stage Audio Cues (M)"
          className={`p-1.5 rounded-full transition ${
            soundEnabled ? 'bg-purple-500/25 text-purple-200' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {cinemaMode && (
          <button
            type="button"
            onClick={() => onSelectView('demos')}
            title="Switch to Demos Lab"
            className="p-1.5 rounded-full text-slate-300 hover:bg-slate-800 transition"
          >
            <FlaskConical className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPdfView}
          title="16:9 Organizer PDF View (P)"
          className="p-1.5 rounded-full text-slate-300 hover:bg-slate-800 transition"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleCinemaMode}
          title="Toggle Top Bar / Cinema Stage Mode (C)"
          className={`p-1.5 rounded-full transition ${
            cinemaMode ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {cinemaMode ? <PanelTop className="w-4 h-4" /> : <PanelTopClose className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          title="Toggle Browser Fullscreen (F)"
          className="p-1.5 rounded-full text-slate-300 hover:bg-slate-800 transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Full-Screen Slide Overview Grid Modal (Marp 'O' key style) */}
      {showOverview && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-xl overflow-y-auto p-6 sm:p-10">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-cyan-300">
                Slide Deck Overview • {total} Widescreen Slides
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                Jump to Any Slide (Press <kbd className="px-2 py-0.5 rounded bg-slate-800 text-xs">O</kbd> or{' '}
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-xs">Esc</kbd> to Close)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowOverview(false)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SLIDES_DATA.map((s, idx) => {
              const active = idx === slideIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playSlideTransition(idx >= slideIdx ? 'next' : 'prev');
                    setSlideIdx(idx);
                    setShowOverview(false);
                  }}
                  className={`text-left rounded-2xl overflow-hidden border transition flex flex-col justify-between ${
                    active
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.25)]'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  {s.illustration && (
                    <div className="w-full aspect-video bg-slate-950 overflow-hidden border-b border-slate-800/80">
                      <img
                        src={s.illustration.src}
                        alt={s.illustration.alt}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-bold">
                          #{String(s.number).padStart(2, '0')}
                        </span>
                        <span className="text-slate-300">{s.timeRange}</span>
                      </div>
                      <div className="text-base font-extrabold text-white line-clamp-2 leading-snug">
                        {s.title}
                      </div>
                      <div className="text-xs text-slate-300 line-clamp-1 mt-1">{s.subtitle}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800/80">
                      <span className="text-emerald-300 truncate">{s.act}</span>
                      <span className="text-purple-300 shrink-0 ml-1">
                        {s.layout === 'visual-panorama'
                          ? '🖼 Full Panorama'
                          : s.illustration
                            ? '🖼 + Interactive'
                            : s.widget}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <DeepDiveGlossaryModal
        termId={activeGlossaryTermId}
        onSelectTerm={setActiveGlossaryTermId}
        onClose={() => setActiveGlossaryTermId(null)}
      />
    </div>
  );
};
