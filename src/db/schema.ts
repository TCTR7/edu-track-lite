import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "OPERATOR",
  "ADMIN",
  "TEACHER",
  "STUDENT",
]);

export const classStatusEnum = pgEnum("class_status", ["ACTIVE", "ARCHIVED"]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "ACTIVE",
  "PAUSED",
  "LEFT",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT_EXCUSED",
  "ABSENT_UNEXCUSED",
]);

export const pointTypeEnum = pgEnum("point_type", ["BONUS", "TEST"]);

export const tuitionCycleStatusEnum = pgEnum("tuition_cycle_status", [
  "OPEN",
  "COMPLETED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "TRANSFER",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "COLLECT_TUITION",
  "REVERT_TUITION",
  "ADJUST_TUITION",
  "ADD_BONUS_POINT",
  "ADD_TEST_SCORE",
  "UPDATE_TEST_SCORE",
  "DELETE_TEST_SCORE",
  "UPDATE_PUBLIC_NOTE",
  "UPDATE_INTERNAL_NOTE",
  "CREATE_ATTENDANCE_SESSION",
  "UPDATE_ATTENDANCE",
  "UPDATE_STUDENT_STATUS",
  "RESET_STUDENT_PASSWORD",
]);

export interface ScheduleSlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  startTime: string; // "17:30"
  endTime: string; // "19:00"
}

// 1. centers
export const centers = pgTable("centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  bankBin: text("bank_bin"),
  bankAccountNo: text("bank_account_no"),
  bankAccountName: text("bank_account_name"),
  roundingUnit: integer("rounding_unit").default(1000).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. users
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id").references(() => centers.id, {
      onDelete: "cascade",
    }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("users_center_role_idx").on(table.centerId, table.role)]
);

// 3. classes
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gradeLevel: text("grade_level").notNull(), // "1".."12" | "OTHER"
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id),
    scheduleJson: jsonb("schedule_json").$type<ScheduleSlot[]>().notNull(),
    tuitionPerCycle: integer("tuition_per_cycle").notNull(),
    sessionsPerCycle: integer("sessions_per_cycle").notNull(),
    deductionPerSession: integer("deduction_per_session").notNull(),
    currentCycleNumber: integer("current_cycle_number").default(1).notNull(),
    currentSessionCount: integer("current_session_count").default(0).notNull(),
    status: classStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("classes_center_status_idx").on(table.centerId, table.status),
    index("classes_teacher_idx").on(table.teacherId),
  ]
);

// 4. class_students
export const classStudents = pgTable(
  "class_students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").default("ACTIVE").notNull(),
    publicNote: text("public_note"),
    internalNote: text("internal_note"),
    totalBonusPoints: integer("total_bonus_points").default(0).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("class_students_unique_idx").on(table.classId, table.studentId),
    index("class_students_student_idx").on(table.studentId),
  ]
);

// 5. attendance_sessions
export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    cycleNumber: integer("cycle_number").notNull(),
    sessionNumberInCycle: integer("session_number_in_cycle").notNull(),
    sessionDate: date("session_date").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("attendance_sessions_class_cycle_idx").on(
      table.classId,
      table.cycleNumber
    ),
    index("attendance_sessions_class_date_idx").on(
      table.classId,
      table.sessionDate
    ),
  ]
);

// 6. attendance_records
export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").default("PRESENT").notNull(),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_records_unique_idx").on(
      table.sessionId,
      table.studentId
    ),
    index("attendance_records_student_idx").on(table.studentId),
  ]
);

// 7. point_histories
export const pointHistories = pgTable(
  "point_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: pointTypeEnum("type").notNull(),
    title: text("title").notNull(),
    score: doublePrecision("score").notNull(),
    recordedDate: date("recorded_date").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("point_histories_class_student_idx").on(
      table.classId,
      table.studentId
    ),
  ]
);

// 8. homeworks
export const homeworks = pgTable(
  "homeworks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    imageUrlsJson: jsonb("image_urls_json").$type<string[]>().notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("homeworks_class_idx").on(table.classId)]
);

// 9. tuition_cycles
export const tuitionCycles = pgTable(
  "tuition_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    cycleNumber: integer("cycle_number").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: tuitionCycleStatusEnum("status").default("OPEN").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tuition_cycles_class_cycle_idx").on(
      table.classId,
      table.cycleNumber
    ),
    index("tuition_cycles_status_idx").on(table.status),
  ]
);

// 10. tuition_records
export const tuitionRecords = pgTable(
  "tuition_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tuitionCycleId: uuid("tuition_cycle_id")
      .notNull()
      .references(() => tuitionCycles.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    billableSessions: integer("billable_sessions").notNull(),
    excusedAbsentCount: integer("excused_absent_count").default(0).notNull(),
    unexcusedAbsentCount: integer("unexcused_absent_count")
      .default(0)
      .notNull(),
    baseAmount: integer("base_amount").notNull(),
    deductedAmount: integer("deducted_amount").default(0).notNull(),
    adjustmentAmount: integer("adjustment_amount").default(0).notNull(),
    adjustmentNote: text("adjustment_note"),
    finalAmount: integer("final_amount").notNull(),
    isPaid: boolean("is_paid").default(false).notNull(),
    paymentMethod: paymentMethodEnum("payment_method"),
    collectedByUserId: uuid("collected_by_user_id").references(() => users.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("tuition_records_cycle_student_idx").on(
      table.tuitionCycleId,
      table.studentId
    ),
    index("tuition_records_paid_idx").on(table.isPaid, table.paidAt),
  ]
);

// 11. documents
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id, { onDelete: "cascade" }),
    gradeLevel: text("grade_level").notNull(),
    title: text("title").notNull(),
    fileUrl: text("file_url").notNull(),
    fileKey: text("file_key").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").default(0).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("documents_center_grade_idx").on(table.centerId, table.gradeLevel),
  ]
);

// 12. audit_logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    actionType: auditActionEnum("action_type").notNull(),
    targetStudentId: uuid("target_student_id").references(() => users.id),
    classId: uuid("class_id").references(() => classes.id, {
      onDelete: "set null",
    }),
    detailsJson: jsonb("details_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_center_created_idx").on(table.centerId, table.createdAt),
    index("audit_logs_actor_idx").on(table.actorUserId),
  ]
);

// Relations
export const centersRelations = relations(centers, ({ many }) => ({
  users: many(users),
  classes: many(classes),
  documents: many(documents),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  center: one(centers, {
    fields: [users.centerId],
    references: [centers.id],
  }),
  teachingClasses: many(classes),
  enrollments: many(classStudents),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  center: one(centers, {
    fields: [classes.centerId],
    references: [centers.id],
  }),
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
  enrollments: many(classStudents),
  attendanceSessions: many(attendanceSessions),
  homeworks: many(homeworks),
  tuitionCycles: many(tuitionCycles),
}));

export const classStudentsRelations = relations(classStudents, ({ one }) => ({
  classItem: one(classes, {
    fields: [classStudents.classId],
    references: [classes.id],
  }),
  student: one(users, {
    fields: [classStudents.studentId],
    references: [users.id],
  }),
}));
