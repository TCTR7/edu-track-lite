export type TestRole = "operator" | "admin" | "teacher" | "student";

export interface TestAccount {
  username: string;
  password: string;
  fullName: string;
  defaultRedirectPath: string;
}

export const TEST_ACCOUNTS: Record<TestRole, TestAccount> = {
  operator: {
    username: "operator",
    password: "operator123",
    fullName: "System Operator",
    defaultRedirectPath: "/operator/centers",
  },
  admin: {
    username: "admin",
    password: "admin123",
    fullName: "Thầy Nguyễn Minh Trí",
    defaultRedirectPath: "/classes",
  },
  teacher: {
    username: "giaovien1",
    password: "giaovien123",
    fullName: "Cô Trần Thu Hà",
    defaultRedirectPath: "/classes",
  },
  student: {
    username: "nguyenvannam_01",
    password: "nam246",
    fullName: "Nguyễn Văn Nam",
    defaultRedirectPath: "/portal",
  },
};

export const SEEDED_CLASSES = {
  math4: "Toán Lớp 4 - Ca 1",
  english6: "Tiếng Anh Lớp 4 - Ca 2",
};
