import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHomeRouteForRole } from "@/lib/jwt";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(getHomeRouteForRole(user.role));
}
