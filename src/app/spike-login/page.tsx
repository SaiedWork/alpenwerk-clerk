// THROWAWAY spike page: stands in for /legacy/login.
export default function SpikeLogin() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Spike: Demo-Login</h1>
      <form
        method="post"
        action="/spike-login/submit"
        className="mt-4 space-y-2"
      >
        <input
          name="username"
          data-testid="username"
          placeholder="user"
          className="border p-1"
        />
        <input
          name="password"
          data-testid="password"
          type="password"
          placeholder="password"
          className="border p-1"
        />
        <button type="submit" data-testid="submit" className="border px-2 py-1">
          Anmelden
        </button>
      </form>
    </main>
  );
}
