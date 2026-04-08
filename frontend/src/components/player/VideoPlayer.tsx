'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Subtitles, ChevronLeft, ChevronRight,
  SkipBack, SkipForward, PictureInPicture2, Loader2
} from 'lucide-react';

interface VideoSource { url: string; quality: string; type: string; }
interface Subtitle { language: string; label: string; url: string; isDefault?: boolean; }

interface Props {
  sources: VideoSource[];
  subtitles?: Subtitle[];
  title?: string;
  onProgress?: (current: number, duration: number) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  startTime?: number;
}

export function VideoPlayer({ sources, subtitles = [], title, onProgress, onEnded, autoPlay = false, startTime = 0 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout>();

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [quality, setQuality] = useState(sources[0]?.quality || 'auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // ── Load source ─────────────────────────────────────────────────────
  const loadSource = useCallback(async (src: VideoSource) => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (src.type === 'hls' || src.url.includes('.m3u8')) {
      const Hls = (await import('hls.js')).default;
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          startLevel: -1,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hls.loadSource(src.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (startTime > 0) video.currentTime = startTime;
          if (autoPlay) video.play().catch(() => {});
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src.url;
      }
    } else {
      video.src = src.url;
      if (startTime > 0) video.currentTime = startTime;
      if (autoPlay) video.play().catch(() => {});
    }
  }, [autoPlay, startTime]);

  useEffect(() => {
    if (sources.length) loadSource(sources[0]);
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [sources]);

  // ── Video events ─────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlers: Record<string, EventListener> = {
      loadedmetadata: () => { setDuration(video.duration); setLoading(false); },
      timeupdate: () => {
        setCurrentTime(video.currentTime);
        onProgress?.(video.currentTime, video.duration);
        if (video.buffered.length > 0) {
          setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
        }
      },
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      ended: () => { setPlaying(false); onEnded?.(); },
      waiting: () => setLoading(true),
      canplay: () => setLoading(false),
    };

    Object.entries(handlers).forEach(([event, handler]) => video.addEventListener(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) => video.removeEventListener(event, handler));
  }, [onProgress, onEnded]);

  // ── Controls visibility ───────────────────────────────────────────────
  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    if (playing) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play().catch(() => {});
  };

  const seek = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await v.requestPictureInPicture();
    }
  };

  const changeQuality = (src: VideoSource) => {
    const v = videoRef.current;
    if (!v) return;
    const time = v.currentTime;
    loadSource(src).then(() => {
      if (v) v.currentTime = time;
    });
    setQuality(src.quality);
    setShowQualityMenu(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      className="video-container group select-none"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        {subtitles.map(sub => (
          <track key={sub.language} kind="subtitles" src={sub.url} srcLang={sub.language} label={sub.label || sub.language} default={sub.isDefault} />
        ))}
      </video>

      {/* Loading spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-end"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)' }}
          >
            {/* Title */}
            {title && (
              <div className="absolute top-4 left-4 text-white font-medium text-sm drop-shadow-lg truncate max-w-[60%]">
                {title}
              </div>
            )}

            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={seek}
              className="relative h-1 hover:h-2 mx-4 mb-3 transition-all cursor-pointer group/progress"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <div className="absolute top-0 left-0 h-full bg-white/30" style={{ width: `${buffered}%` }} />
              <div className="absolute top-0 left-0 h-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-1 px-4 pb-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="p-2 text-white hover:text-violet-300 transition-colors">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              {/* Skip */}
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="p-2 text-white hover:text-violet-300 transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="p-2 text-white hover:text-violet-300 transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <button onClick={() => setMuted(m => !m)} className="p-2 text-white hover:text-violet-300 transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={e => { const v = parseFloat(e.target.value); setVolume(v); setMuted(v === 0); if (videoRef.current) videoRef.current.volume = v; }}
                  className="w-16 accent-violet-500"
                />
              </div>

              {/* Time */}
              <span className="text-xs text-white/70 ml-2 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              {/* Speed */}
              <div className="relative">
                <button onClick={() => setShowSpeedMenu(s => !s)} className="px-2 py-1 rounded text-xs font-mono text-white hover:bg-white/10 transition-colors">
                  {playbackRate}x
                </button>
                <AnimatePresence>
                  {showSpeedMenu && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute bottom-full right-0 mb-2 glass-dark rounded-lg border border-[rgba(124,58,237,0.3)] overflow-hidden">
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => { if (videoRef.current) videoRef.current.playbackRate = s; setPlaybackRate(s); setShowSpeedMenu(false); }}
                          className={`block w-full px-4 py-1.5 text-xs text-left transition-colors ${s === playbackRate ? 'text-violet-400 bg-violet-500/10' : 'text-white hover:bg-white/5'}`}>
                          {s}x
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quality */}
              {sources.length > 1 && (
                <div className="relative">
                  <button onClick={() => setShowQualityMenu(q => !q)} className="px-2 py-1 rounded text-xs text-white hover:bg-white/10 transition-colors">
                    {quality}
                  </button>
                  <AnimatePresence>
                    {showQualityMenu && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute bottom-full right-0 mb-2 glass-dark rounded-lg border border-[rgba(124,58,237,0.3)] overflow-hidden">
                        {sources.map(src => (
                          <button key={src.quality} onClick={() => changeQuality(src)}
                            className={`block w-full px-4 py-1.5 text-xs text-left transition-colors ${src.quality === quality ? 'text-violet-400 bg-violet-500/10' : 'text-white hover:bg-white/5'}`}>
                            {src.quality}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* PiP */}
              <button onClick={togglePiP} className="p-2 text-white hover:text-violet-300 transition-colors">
                <PictureInPicture2 className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-2 text-white hover:text-violet-300 transition-colors">
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
