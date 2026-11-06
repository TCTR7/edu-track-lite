export interface ClassDetailInfo {
  id: string;
  name: string;
  gradeLevel: string;
  teacherName: string;
  scheduleSummary: string;
  tuitionPerCycle: number;
  sessionsPerCycle: number;
  deductionPerSession: number;
  currentCycleNumber: number;
  currentSessionCount: number;
}

export interface AttendanceRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  studentUsername: string;
  totalBonusPoints: number;
  status: "PRESENT" | "ABSENT_EXCUSED" | "ABSENT_UNEXCUSED";
  updatedByName: string;
  updatedAt: string;
}

export interface SessionWithRecords {
  id: string;
  cycleNumber: number;
  sessionNumberInCycle: number;
  sessionDate: string;
  createdByName: string;
  createdAt: string;
  records: AttendanceRecordItem[];
}

export interface PointHistoryItem {
  id: string;
  studentId: string;
  type: "BONUS" | "TEST";
  title: string;
  score: number;
  recordedDate: string;
  createdByName: string;
  createdAt: string;
}

export interface EnrolledStudentItem {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  username: string;
  phone: string | null;
  status: "ACTIVE" | "PAUSED" | "LEFT";
  publicNote: string | null;
  internalNote: string | null;
  totalBonusPoints: number;
  joinedAt: string;
}

export interface CenterStudentCandidate {
  id: string;
  fullName: string;
  username: string;
  currentClassNames: string[];
}

export interface HomeworkItem {
  id: string;
  title: string;
  imageUrls: string[];
  createdByName: string;
  createdAt: string;
}

export interface ClassTuitionCycleItem {
  id: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  status: "OPEN" | "COMPLETED";
  records: {
    id: string;
    studentName: string;
    billableSessions: number;
    excusedAbsentCount: number;
    unexcusedAbsentCount: number;
    finalAmount: number;
    isPaid: boolean;
    paymentMethod: "CASH" | "TRANSFER" | null;
    collectedByName: string | null;
    paidAt: string | null;
  }[];
}
