export default function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="desk-card paper-texture p-8">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-end gap-1 mb-6">
          <div className="skeleton skeleton-toolbar" />
        </div>

        {/* Title skeleton */}
        <div className="skeleton skeleton-title mb-6" />

        {/* Body lines skeleton */}
        <div className="space-y-3">
          <div className="skeleton skeleton-line" style={{ width: "100%" }} />
          <div className="skeleton skeleton-line" style={{ width: "95%" }} />
          <div className="skeleton skeleton-line" style={{ width: "98%" }} />
          <div className="skeleton skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton skeleton-line" style={{ width: "92%" }} />
          <div className="skeleton skeleton-line" style={{ width: "85%" }} />
          <div className="skeleton skeleton-line" style={{ width: "96%" }} />
        </div>
      </div>
    </div>
  );
}

