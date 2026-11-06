"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Check,
  Copy,
  Eye,
  KeyRound,
  Lock,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import {
  addTestScoreAction,
  createAndEnrollStudentAction,
  deleteTestScoreAction,
  enrollExistingStudentAction,
  resetStudentPasswordAction,
  updateStudentEnrollmentProfileAction,
  type CreateStudentState,
} from "@/actions/student-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { cn, formatDateTimeVn, removeVietnameseTones } from "@/lib/utils";
import { evaluateAcademicTrend } from "@/lib/utils/academic-trend";
import type {
  CenterStudentCandidate,
  EnrolledStudentItem,
  PointHistoryItem,
} from "./types";

const initialCreateState: CreateStudentState = {};

export function TabStudents({
  classId,
  enrolledStudents,
  centerCandidates,
  pointHistories,
  todayStr,
}: {
  classId: string;
  enrolledStudents: EnrolledStudentItem[];
  centerCandidates: CenterStudentCandidate[];
  pointHistories: PointHistoryItem[];
  todayStr: string;
}) {
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"new" | "existing">("new");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [createState, createFormAction, isCreating] = useActionState(
    createAndEnrollStudentAction,
    initialCreateState
  );

  const [credentialBanner, setCredentialBanner] = useState<{
    fullName: string;
    username: string;
    plainPassword: string;
    zaloMessage: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Student Profile Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [profileStatus, setProfileStatus] = useState<
    "ACTIVE" | "PAUSED" | "LEFT"
  >("ACTIVE");
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  // Add Test Score Form State
  const [testTitle, setTestTitle] = useState("");
  const [testScore, setTestScore] = useState("");
  const [testDate, setTestDate] = useState(todayStr);

  const [isMutating, startTransition] = useTransition();

  useEffect(() => {
    if (createState.credentials) {
      setAddModalOpen(false);
      setCredentialBanner(createState.credentials);
      router.refresh();
    }
  }, [createState.credentials, router]);

  const selectedStudent =
    enrolledStudents.find((s) => s.studentId === selectedStudentId) ?? null;

  const openProfileModal = (student: EnrolledStudentItem) => {
    setSelectedStudentId(student.studentId);
    setProfileStatus(student.status);
    setPublicNote(student.publicNote ?? "");
    setInternalNote(student.internalNote ?? "");
    setProfileSavedMsg(null);
  };

  const copyZaloText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCandidates = useMemo(() => {
    const q = removeVietnameseTones(candidateSearch).toLowerCase();
    return centerCandidates.filter((c) => {
      if (!q) return true;
      return (
        removeVietnameseTones(c.fullName).toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q)
      );
    });
  }, [candidateSearch, centerCandidates]);

  const activeList = enrolledStudents.filter((s) => s.status === "ACTIVE");
  const inactiveList = enrolledStudents.filter((s) => s.status !== "ACTIVE");

  const getStudentTests = (studentId: string) =>
    pointHistories
      .filter((p) => p.studentId === studentId && p.type === "TEST")
      .sort(
        (a, b) =>
          a.recordedDate.localeCompare(b.recordedDate) ||
          a.createdAt.localeCompare(b.createdAt)
      );

  const getStudentBonuses = (studentId: string) =>
    pointHistories
      .filter((p) => p.studentId === studentId && p.type === "BONUS")
      .slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Danh sách Học sinh trong Ca ({activeList.length} đang học)
          </h2>
          <p className="text-xs text-slate-600">
            Chạm vào tên học sinh để ghi nhận xét, ghi chú nội bộ hoặc nhập điểm
            kiểm tra
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddMode("new");
            setAddModalOpen(true);
          }}
          className="btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          Thêm Học sinh vào Ca
        </button>
      </div>

      {/* Zalo Credentials Copy Banner */}
      {credentialBanner && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">
                Tài khoản của em {credentialBanner.fullName}
              </p>
              <p className="mt-1">
                Username:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {credentialBanner.username}
                </code>{" "}
                • Mật khẩu:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {credentialBanner.plainPassword}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyZaloText(credentialBanner.zaloMessage)}
              className="btn-primary"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Đã copy gửi Zalo
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy thông tin đăng nhập
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Students */}
      <div className="space-y-2.5">
        {activeList.map((student, idx) => {
          const tests = getStudentTests(student.studentId);
          const trend = evaluateAcademicTrend(tests.map((t) => t.score));

          return (
            <button
              key={student.enrollmentId}
              type="button"
              onClick={() => openProfileModal(student)}
              className="flex w-full flex-wrap items-center justify-between gap-3 clay-card p-4 text-left transition hover:border-brand-600"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    #{idx + 1}
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {student.fullName}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                    {student.username}
                  </span>
                </div>
                {student.publicNote && (
                  <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                    Nhận xét: {student.publicNote}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  <Award className="h-3.5 w-3.5 text-amber-600" />+
                  {student.totalBonusPoints}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    trend.trend === "IMPROVING"
                      ? "bg-emerald-100 text-emerald-800"
                      : trend.trend === "NEEDS_EFFORT"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-700"
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {trend.averageScore !== null
                    ? `TB ${trend.averageScore} • ${trend.label}`
                    : trend.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Paused / Left Students */}
      {inactiveList.length > 0 && (
        <div className="space-y-2 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Học sinh Tạm nghỉ / Đã nghỉ ({inactiveList.length})
          </p>
          {inactiveList.map((student) => (
            <button
              key={student.enrollmentId}
              type="button"
              onClick={() => openProfileModal(student)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left opacity-75 hover:opacity-100"
            >
              <span className="text-sm font-semibold text-slate-700">
                {student.fullName} ({student.username})
              </span>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {student.status === "PAUSED" ? "Tạm nghỉ" : "Đã nghỉ hẳn"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Add Student Modal (New vs Existing in Center) */}
      <ModalDialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Thêm Học sinh vào Ca học"
        description="Tạo nhanh học sinh mới hoặc gán học sinh đang học môn khác tại trung tâm."
      >
        <div className="space-y-4">
          <div className="clay-tab-track grid grid-cols-2 gap-1.5 rounded-xl  p-1">
            <button
              type="button"
              onClick={() => setAddMode("new")}
              className={cn(
                "min-h-11 rounded-lg text-xs font-bold transition",
                addMode === "new"
                  ? "clay-tab-active"
                  : "text-slate-600"
              )}
            >
              Tạo học sinh mới
            </button>
            <button
              type="button"
              onClick={() => setAddMode("existing")}
              className={cn(
                "min-h-11 rounded-lg text-xs font-bold transition",
                addMode === "existing"
                  ? "clay-tab-active"
                  : "text-slate-600"
              )}
            >
              Chọn HS sẵn có ({centerCandidates.length})
            </button>
          </div>

          {addMode === "new" ? (
            <form action={createFormAction} className="space-y-4">
              <input type="hidden" name="classId" value={classId} />
              {createState.error && (
                <div
                  role="alert"
                  className="clay-notice clay-notice-danger px-3.5 py-2.5 text-sm"
                >
                  {createState.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="new-student-name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Họ và tên Học sinh *
                </label>
                <input
                  id="new-student-name"
                  name="fullName"
                  type="text"
                  required
                  autoFocus
                  placeholder="VD: Nguyễn Văn Nam"
                  className="clay-input w-full rounded-xl border px-3.5 py-2.5"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Hệ thống sẽ tự động sinh Username không trùng và mật khẩu ngẫu
                  nhiên 6 ký tự an toàn.
                </p>
              </div>

              <div>
                <label
                  htmlFor="new-student-phone"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  SĐT Phụ huynh (Tùy chọn)
                </label>
                <input
                  id="new-student-phone"
                  name="phone"
                  type="tel"
                  placeholder="VD: 0987654321"
                  className="clay-input w-full rounded-xl border px-3.5 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn-soft"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary"
                >
                  {isCreating ? "Đang tạo..." : "Tạo & Lấy thông tin Zalo"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="search"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Tìm tên học sinh đã có tại trung tâm..."
                  className="clay-input w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
                />
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredCandidates.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-600">
                    Không còn học sinh nào chưa tham gia ca học này.
                  </p>
                ) : (
                  filteredCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {cand.fullName}
                        </p>
                        <p className="text-xs text-slate-600">
                          {cand.username}
                          {cand.currentClassNames.length > 0
                            ? ` • Đang học: ${cand.currentClassNames.join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => {
                          startTransition(async () => {
                            await enrollExistingStudentAction(classId, cand.id);
                            setAddModalOpen(false);
                            router.refresh();
                          });
                        }}
                        className="btn-primary"
                      >
                        + Gán vào ca
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* Student Detailed Academic Profile Modal */}
      <ModalDialog
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudentId(null)}
        title={
          selectedStudent
            ? `Hồ sơ Học tập – ${selectedStudent.fullName}`
            : "Hồ sơ Học tập"
        }
        description={
          selectedStudent ? `Username: ${selectedStudent.username}` : undefined
        }
        className="max-w-2xl"
      >
        {selectedStudent && (
          <div className="space-y-5">
            {profileSavedMsg && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800"
              >
                {profileSavedMsg}
              </div>
            )}

            {/* Quick Password Reset Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <span className="text-xs text-slate-600">
                Điểm cộng tích lũy:{" "}
                <strong className="text-amber-800">
                  +{selectedStudent.totalBonusPoints} điểm
                </strong>
              </span>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => {
                  startTransition(async () => {
                    const res = await resetStudentPasswordAction(
                      selectedStudent.studentId
                    );
                    if (
                      res.ok &&
                      res.fullName &&
                      res.username &&
                      res.plainPassword &&
                      res.zaloMessage
                    ) {
                      setCredentialBanner({
                        fullName: res.fullName,
                        username: res.username,
                        plainPassword: res.plainPassword,
                        zaloMessage: res.zaloMessage,
                      });
                      await copyZaloText(res.zaloMessage);
                      setProfileSavedMsg(
                        `Đã cấp lại mật khẩu mới (${res.plainPassword}) và copy sẵn tin nhắn Zalo!`
                      );
                    }
                  });
                }}
                className="btn-soft"
              >
                <KeyRound className="h-3.5 w-3.5 text-brand-700" />
                Reset MK & Copy Zalo
              </button>
            </div>

            {/* Notes & Enrollment Status Form */}
            <div className="space-y-3.5 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Trạng thái theo học tại Ca này
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "ACTIVE", label: "Đang học" },
                      { value: "PAUSED", label: "Tạm nghỉ" },
                      { value: "LEFT", label: "Đã nghỉ hẳn" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-xs font-bold",
                        profileStatus === opt.value
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      <input
                        type="radio"
                        name="studentStatus"
                        value={opt.value}
                        checked={profileStatus === opt.value}
                        onChange={() => setProfileStatus(opt.value)}
                        className="visually-hidden"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-public-note"
                  className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-800"
                >
                  <Eye className="h-4 w-4" />
                  Nhận xét học tập (Phụ huynh nhìn thấy)
                </label>
                <textarea
                  id="student-public-note"
                  value={publicNote}
                  onChange={(e) => setPublicNote(e.target.value)}
                  placeholder="Nhận xét về lực học, ý thức làm bài về nhà..."
                  className="clay-input w-full rounded-xl border border-emerald-200 p-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="student-internal-note"
                  className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-900"
                >
                  <Lock className="h-4 w-4" />
                  Ghi chú nội bộ (Chỉ Admin & Giáo viên thấy – Ẩn với Phụ huynh)
                </label>
                <textarea
                  id="student-internal-note"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Ghi chú riêng: hoàn cảnh gia đình, lưu ý thu học phí..."
                  className="clay-input w-full rounded-xl border border-amber-200 p-3 text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await updateStudentEnrollmentProfileAction({
                        classId,
                        studentId: selectedStudent.studentId,
                        status: profileStatus,
                        publicNote,
                        internalNote,
                      });
                      if (res.ok) {
                        setProfileSavedMsg("Đã lưu hồ sơ và ghi chú học sinh.");
                        router.refresh();
                      }
                    });
                  }}
                  className="btn-primary"
                >
                  Lưu nhận xét & trạng thái
                </button>
              </div>
            </div>

            {/* Test Scores Management */}
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Điểm kiểm tra định kỳ
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const numericScore = Number(testScore);
                  if (!testTitle.trim() || Number.isNaN(numericScore)) return;
                  startTransition(async () => {
                    const res = await addTestScoreAction({
                      classId,
                      studentId: selectedStudent.studentId,
                      title: testTitle,
                      score: numericScore,
                      recordedDate: testDate,
                    });
                    if (res.ok) {
                      setTestTitle("");
                      setTestScore("");
                      router.refresh();
                    }
                  });
                }}
                className="grid gap-2 sm:grid-cols-12"
              >
                <input
                  type="text"
                  required
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Tên bài (VD: Kiểm tra 15p Chương 1)"
                  aria-label="Tên bài kiểm tra"
                  className="clay-input rounded-xl border px-3 py-2 text-sm sm:col-span-5"
                />
                <input
                  type="number"
                  step="0.25"
                  min={0}
                  max={100}
                  required
                  value={testScore}
                  onChange={(e) => setTestScore(e.target.value)}
                  placeholder="Điểm (8.5)"
                  aria-label="Điểm số"
                  className="clay-input rounded-xl border px-3 py-2 text-sm sm:col-span-3"
                />
                <input
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  aria-label="Ngày kiểm tra"
                  className="clay-input rounded-xl border px-3 py-2 text-sm sm:col-span-3"
                />
                <button
                  type="submit"
                  disabled={isMutating}
                  aria-label="Thêm điểm kiểm tra"
                  className="btn-primary sm:col-span-1"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </form>

              {getStudentTests(selectedStudent.studentId).length === 0 ? (
                <p className="py-2 text-xs text-slate-600">
                  Chưa có điểm bài kiểm tra nào.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {getStudentTests(selectedStudent.studentId)
                    .slice()
                    .reverse()
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {t.title} –{" "}
                            <span className="text-brand-700">{t.score} điểm</span>{" "}
                            <span className="text-xs font-normal text-slate-600">
                              ({t.recordedDate})
                            </span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Thực hiện bởi: {t.createdByName} –{" "}
                            {formatDateTimeVn(t.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Xóa điểm ${t.title}`}
                          onClick={() => {
                            startTransition(async () => {
                              await deleteTestScoreAction({
                                pointId: t.id,
                                classId,
                              });
                              router.refresh();
                            });
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Recent Bonus History */}
            {getStudentBonuses(selectedStudent.studentId).length > 0 && (
              <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Lịch sử cộng điểm khuyến khích gần đây
                </h3>
                {getStudentBonuses(selectedStudent.studentId).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs text-slate-600"
                  >
                    <span>
                      <strong>
                        {b.score > 0 ? `+${b.score}` : b.score} điểm:
                      </strong>{" "}
                      {b.title}
                    </span>
                    <span className="text-slate-600">
                      {b.createdByName} ({b.recordedDate})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
