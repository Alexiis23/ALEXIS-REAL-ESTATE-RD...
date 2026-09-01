// src/middleware.ts
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;
  const path = url.pathname;

  const isAdminRoute = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";
  const isAuthApi = path.startsWith("/api/admin/");

  // Proteger cualquier ruta /admin excepto el formulario de login y los endpoints de auth
  if (isAdminRoute && !isLoginPage && !isAuthApi) {
    const sessionCookie = cookies.get("alexis_admin_session")?.value;
    const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "alexis-admin-2026";

    // Si no tiene la cookie o el token es inválido, redirigir al login guardando la ruta previa
    if (!sessionCookie || sessionCookie !== ADMIN_PASSWORD) {
      return redirect(`/admin/login?redirect=${encodeURIComponent(path)}`);
    }
  }

  return next();
});
