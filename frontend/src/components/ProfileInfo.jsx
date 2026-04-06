export default function ProfileInfo({ user }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow w-64">
      <h2 className="text-xl font-bold mb-2">{user.nickname}</h2>
      <p>Email: {user.email}</p>
      <p>Rating: {user.elo_rating || "N/A"}</p>
    </div>
  );
}
