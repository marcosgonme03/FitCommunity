export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-surface-200" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-surface-600 text-sm font-medium">Cargando FitCommunity…</p>
      </div>
    </div>
  );
}
