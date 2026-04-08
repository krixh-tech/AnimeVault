export const EpisodeCard = ({ episode }: any) => {
  return (
    <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800 hover:border-purple-500 transition">
      <h3 className="text-sm font-semibold">
        Episode {episode?.number}
      </h3>
      <p className="text-xs text-zinc-400">
        {episode?.title}
      </p>
    </div>
  );
};
