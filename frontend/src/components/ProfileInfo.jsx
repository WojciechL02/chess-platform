export default function ProfileInfo({ user }) {
  return (
    <div className="flex items-center gap-5">
      <div
        className="w-14 h-14 flex items-center justify-center"
        style={{
          backgroundColor: "var(--surface-sunk)",
          border: "1px solid var(--border)",
          borderRadius: "2px",
        }}
      >
        <span
          className="serif text-2xl"
          style={{ color: "var(--ink)" }}
        >
          {(user.nickname?.charAt(0) || "?").toUpperCase()}
        </span>
      </div>
      <div>
        <h2 className="serif text-2xl leading-tight" style={{ color: "var(--ink)" }}>
          {user.nickname}
        </h2>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="ed-eyebrow">Rating</span>
          <span
            className="text-base"
            style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}
          >
            {user.elo_rating ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
