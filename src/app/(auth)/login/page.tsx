import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHomeRouteForRole } from "@/lib/jwt";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(getHomeRouteForRole(currentUser.role));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center login-canvas p-4">
      <LoginForm showDemoAccounts={process.env.NODE_ENV !== "production"} />
    </main>
  );
}
