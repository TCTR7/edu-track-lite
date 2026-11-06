import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { centers, classes, classStudents, users } from "./schema";
import { hashPassword } from "../lib/password";

async function seed() {
  console.log("🌱 Đang khởi tạo dữ liệu mẫu cho EduTrack Lite...");

  // 1. Tạo tài khoản Operator mặc định
  const operatorPass = await hashPassword("operator123");
  let [operator] = await db
    .select()
    .from(users)
    .where(eq(users.username, "operator"))
    .limit(1);

  if (!operator) {
    [operator] = await db
      .insert(users)
      .values({
        username: "operator",
        passwordHash: operatorPass,
        fullName: "Quản trị Hệ thống (Operator)",
        role: "OPERATOR",
        isActive: true,
      })
      .returning();
    console.log("  ✓ Đã tạo Operator: operator / operator123");
  }

  // 2. Tạo Trung tâm mẫu
  let [demoCenter] = await db
    .select()
    .from(centers)
    .where(eq(centers.name, "Trung Tâm Bồi Dưỡng Minh Trí"))
    .limit(1);

  if (!demoCenter) {
    [demoCenter] = await db
      .insert(centers)
      .values({
        name: "Trung Tâm Bồi Dưỡng Minh Trí",
        phone: "0909123456",
        bankBin: "970436", // Vietcombank
        bankAccountNo: "0071001234567",
        bankAccountName: "NGUYEN MINH TRI",
        roundingUnit: 1000,
        isActive: true,
      })
      .returning();
    console.log("  ✓ Đã tạo Trung tâm mẫu:", demoCenter.name);
  }

  // 3. Tạo Admin mẫu (Chủ trung tâm kiêm Giáo viên)
  const adminPass = await hashPassword("admin123");
  let [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (!adminUser) {
    [adminUser] = await db
      .insert(users)
      .values({
        centerId: demoCenter.id,
        username: "admin",
        passwordHash: adminPass,
        fullName: "Thầy Nguyễn Minh Trí (Admin)",
        phone: "0909123456",
        role: "ADMIN",
        isActive: true,
      })
      .returning();
    console.log("  ✓ Đã tạo Admin: admin / admin123");
  }

  // 4. Tạo Giáo viên mẫu
  const teacherPass = await hashPassword("giaovien123");
  let [teacherUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, "giaovien1"))
    .limit(1);

  if (!teacherUser) {
    [teacherUser] = await db
      .insert(users)
      .values({
        centerId: demoCenter.id,
        username: "giaovien1",
        passwordHash: teacherPass,
        fullName: "Cô Trần Thu Hà",
        phone: "0912345678",
        role: "TEACHER",
        isActive: true,
      })
      .returning();
    console.log("  ✓ Đã tạo Giáo viên: giaovien1 / giaovien123");
  }

  // 5. Tạo 2 Ca học mẫu
  const existingClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.centerId, demoCenter.id));

  let mathClassId: string;
  let englishClassId: string;

  if (existingClasses.length === 0) {
    const [mathClass] = await db
      .insert(classes)
      .values({
        centerId: demoCenter.id,
        name: "Toán Lớp 4 - Ca 1",
        gradeLevel: "4",
        teacherId: teacherUser.id,
        scheduleJson: [
          { dayOfWeek: 2, startTime: "17:30", endTime: "19:00" },
          { dayOfWeek: 5, startTime: "17:30", endTime: "19:00" },
        ],
        tuitionPerCycle: 800000,
        sessionsPerCycle: 16,
        deductionPerSession: 50000,
        currentCycleNumber: 1,
        currentSessionCount: 3,
        status: "ACTIVE",
      })
      .returning();

    const [englishClass] = await db
      .insert(classes)
      .values({
        centerId: demoCenter.id,
        name: "Tiếng Anh Lớp 4 - Ca 2",
        gradeLevel: "4",
        teacherId: adminUser.id,
        scheduleJson: [
          { dayOfWeek: 3, startTime: "18:00", endTime: "19:30" },
          { dayOfWeek: 6, startTime: "18:00", endTime: "19:30" },
        ],
        tuitionPerCycle: 960000,
        sessionsPerCycle: 12,
        deductionPerSession: 80000,
        currentCycleNumber: 1,
        currentSessionCount: 5,
        status: "ACTIVE",
      })
      .returning();

    mathClassId = mathClass.id;
    englishClassId = englishClass.id;
    console.log("  ✓ Đã tạo 2 Ca học mẫu: Toán Lớp 4 & Tiếng Anh Lớp 4");
  } else {
    mathClassId = existingClasses[0].id;
    englishClassId = existingClasses[1]?.id ?? existingClasses[0].id;
  }

  // 6. Tạo Học sinh mẫu học cả 2 môn (dùng chung 1 tài khoản)
  const studentPass = await hashPassword("nam246");
  let [studentUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, "nguyenvannam_01"))
    .limit(1);

  if (!studentUser) {
    [studentUser] = await db
      .insert(users)
      .values({
        centerId: demoCenter.id,
        username: "nguyenvannam_01",
        passwordHash: studentPass,
        fullName: "Nguyễn Văn Nam",
        role: "STUDENT",
        isActive: true,
      })
      .returning();

    await db.insert(classStudents).values([
      {
        classId: mathClassId,
        studentId: studentUser.id,
        status: "ACTIVE",
        publicNote: "Con tiếp thu nhanh phần phân số, tích cực phát biểu trên lớp.",
        internalNote: "Mẹ bé hay chuyển khoản vào ngày 5 hàng tháng.",
        totalBonusPoints: 4,
      },
      {
        classId: englishClassId,
        studentId: studentUser.id,
        status: "ACTIVE",
        publicNote: "Phát âm tốt, cần luyện viết từ vựng đều đặn hơn.",
        totalBonusPoints: 2,
      },
    ]);

    console.log("  ✓ Đã tạo Học sinh mẫu (học 2 môn): nguyenvannam_01 / nam246");
  }

  console.log("\n✅ Khởi tạo dữ liệu mẫu hoàn tất!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Lỗi khi seed dữ liệu:", err);
  process.exit(1);
});
