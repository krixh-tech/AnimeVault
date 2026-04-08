"use client";

import { motion } from "framer-motion";
import { Play, Download } from "lucide-react";
import Image from "next/image";

interface Episode {
  id: string;
  number: number;
  title: string;
  thumbnail?: string;
  duration?: string;
}

interface EpisodeCardProps {
  episode: Episode;
  onPlay?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export default function EpisodeCard({
  episode,
  onPlay,
  onDownload,
}: EpisodeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-xl overflow-hidden bg-zinc-900/70 backdrop-blur border border-zinc-800 shadow-lg hover:border-purple-500/40"
    >
      {/* Thumbnail */}
      <div className="relative w-full h-36">
        <Image
          src={episode.thumbnail || "/placeholder.jpg"}
          alt={episode.title}
          fill
          className="object-cover"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
          <button
            onClick={() => onPlay?.(episode.id)}
            className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 transition"
          >
            <Play size={18} />
          </button>

          <button
            onClick={() => onDownload?.(episode.id)}
            className="p-3 rounded-full bg-zinc-700 hover:bg-zinc-600 transition"
          >
            <Download size={18} />
          </button>
        </div>

        {/* Episode number */}
        <div className="absolute top-2 left-2 px-2 py-1 text-xs bg-purple-600 rounded">
          EP {episode.number}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold line-clamp-1">
          {episode.title || `Episode ${episode.number}`}
        </h3>

        {episode.duration && (
          <p className="text-xs text-zinc-400 mt-1">
            {episode.duration}
          </p>
        )}
      </div>
    </motion.div>
  );
}
