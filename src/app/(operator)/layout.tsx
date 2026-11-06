import { requireAuth } from "@/lib/auth";
import { OperatorShell } from "@/components/layout/operator-shell";

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth(["OPERATOR"]);
  return <OperatorShell fullName={user.fullName}>{children}</OperatorShell>;
}
