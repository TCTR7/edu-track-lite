import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { centers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { CenterSettingsForm } from "./settings-form";

export default async function CenterSettingsPage() {
  const admin = await requireAuth(["ADMIN"]);

  const [center] = await db
    .select()
    .from(centers)
    .where(eq(centers.id, admin.centerId!))
    .limit(1);

  if (!center) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Cài đặt Trung tâm & VietQR
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Thiết lập thông tin hiển thị và tài khoản ngân hàng tự động sinh mã QR
          học phí
        </p>
      </div>

      <CenterSettingsForm
        initialData={{
          name: center.name,
          phone: center.phone,
          bankBin: center.bankBin,
          bankAccountNo: center.bankAccountNo,
          bankAccountName: center.bankAccountName,
          roundingUnit: center.roundingUnit,
        }}
      />
    </div>
  );
}
