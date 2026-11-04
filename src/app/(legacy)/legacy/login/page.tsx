import { loginAction } from "@/legacy/actions";
import { t } from "@/lib/i18n-de";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const s = t.legacy.login;
  return (
    <div className="content">
      <h1>{s.title}</h1>
      {error ? (
        <p className="error" data-testid="login-error">
          {s.failed}
        </p>
      ) : null}
      <form action={loginAction}>
        <table className="form">
          <tbody>
            <tr>
              <th>
                <label htmlFor="username">{s.username}</label>
              </th>
              <td>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  data-testid="login-username"
                />
              </td>
            </tr>
            <tr>
              <th>
                <label htmlFor="password">{s.password}</label>
              </th>
              <td>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  data-testid="login-password"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="actions">
          <button type="submit" data-testid="login-submit">
            {s.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
