export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded mb-4" />
      <div className="h-8 w-64 bg-white/10 rounded mb-2" />
      <div className="h-4 w-48 bg-white/10 rounded mb-8" />
      <div className="h-3 w-full bg-white/5 rounded mb-2" />
      <div className="h-3 w-3/4 bg-white/5 rounded mb-2" />
      <div className="h-3 w-5/6 bg-white/5 rounded mb-6" />
      <div className="h-40 w-full bg-white/5 rounded-2xl mb-6" />
      <div className="flex gap-3">
        <div className="h-10 w-24 bg-white/10 rounded-xl" />
        <div className="h-10 w-24 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}
