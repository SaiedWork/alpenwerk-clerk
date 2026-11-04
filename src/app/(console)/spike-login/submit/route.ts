// THROWAWAY spike route: fake login, redirects to the welcome page.
export async function POST(request: Request) {
  const form = await request.formData();
  const ok = form.get("username") === "demo" && form.get("password") === "demo";
  return Response.redirect(
    new URL(ok ? "/spike-login/welcome" : "/spike-login", request.url),
    303,
  );
}
