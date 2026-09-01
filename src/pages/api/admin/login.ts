import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();
    const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "alexis-admin-2026";

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Establecer cookie de sesión segura por 7 días
    cookies.set("alexis_admin_session", ADMIN_PASSWORD, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Error al iniciar sesión" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
