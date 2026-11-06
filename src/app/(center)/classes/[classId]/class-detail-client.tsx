"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarCheck2,
  Camera,
  Users,
  Wallet,
} from "lucide-react";
import { cn, formatCurrencyVnd } from "@/lib/utils";
import { TabAttendance } from "./tab-attendance";
import { TabHomework } from "./tab-homework";
import { TabStudents } from "./tab-students";
import { TabTuitionPreview } from "./tab-tuition-preview";
import type {
  CenterStudentCandidate,
  ClassDetailInfo,
  ClassTuitionCycleItem,
  EnrolledStudentItem,
  HomeworkItem,
  PointHistoryItem,
  SessionWithRecords,
} from "./types";

type ActiveTab = "attendance" | "homework" | "students" | "tuition";

export function ClassDetailClient({
  classInfo,
  sessions,
  enrolledStudents,
  centerCandidates,
  pointHistories,
  homeworksList,
  tuitionCyclesList,
  todayStr,
  actorName,
}: {
  classInfo: ClassDetailInfo;
  sessions: SessionWithRecords[];
  enrolledStudents: EnrolledStudentItem[];
  centerCandidates: CenterStudentCandidate[];
  pointHistories: PointHistoryItem[];
  homeworksList: HomeworkItem[];
  tuitionCyclesList: ClassTuitionCycleItem[];
  todayStr: string;
  actorName: string;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("attendance");

  const activeStudentsCount = enrolledStudents.filter(
    (s) => s.status === "ACTIVE"
  ).length;

  const unpaidBillsCount = tuitionCyclesList.reduce(
    (sum, c) => sum + c.records.filter((r) => !r.isPaid).length,
    0
  );

  const tabs: {
    id: ActiveTab;
    label: string;
    icon: typeof CalendarCheck2;
    badge?: number;
  }[] = [
    {
      id: "attendance",
      label: "Điểm danh & +1",
      icon: CalendarCheck2,
    },
    {
      id: "homework",
      label: `BTVN (${homeworksList.length})`,
      icon: Camera,
    },
    {
      id: "students",
      label: `Học sinh (${activeStudentsCount})`,
      icon: Users,
    },
    {
      id: "tuition",
      label: "Kỳ học phí",
      icon: Wallet,
      badge: unpaidBillsCount,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="clay-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/classes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại danh sách Ca học
            </Link>
            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {classInfo.name}
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">
              GV: {classInfo.teacherName} • {classInfo.scheduleSummary} • Học
              phí: {formatCurrencyVnd(classInfo.tuitionPerCycle)}/
              {classInfo.sessionsPerCycle} buổi
            </p>
          </div>

          <div className="rounded-xl bg-brand-50 px-3.5 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase text-brand-700">
              Tiến độ hiện tại
            </p>
            <p className="text-base font-extrabold text-brand-950">
              Kỳ {classInfo.currentCycleNumber} • Buổi{" "}
              {classInfo.currentSessionCount}/{classInfo.sessionsPerCycle}
            </p>
          </div>
        </div>

        {/* 4 Sub-tabs */}
        <div
          role="tablist"
          aria-label="Các phân mục trong Ca học"
          className="clay-tab-track mt-4 grid grid-cols-2 gap-1.5 rounded-xl  p-1 sm:grid-cols-4"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition",
                  active
                    ? "clay-tab-active"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="rounded-full bg-danger px-1.5 py-0.5 text-xs font-bold text-white">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Panel */}
      {activeTab === "attendance" && (
        <TabAttendance
          classInfo={classInfo}
          sessions={sessions}
          todayStr={todayStr}
          activeStudentCount={activeStudentsCount}
          actorName={actorName}
        />
      )}

      {activeTab === "homework" && (
        <TabHomework classId={classInfo.id} homeworksList={homeworksList} />
      )}

      {activeTab === "students" && (
        <TabStudents
          classId={classInfo.id}
          enrolledStudents={enrolledStudents}
          centerCandidates={centerCandidates}
          pointHistories={pointHistories}
          todayStr={todayStr}
        />
      )}

      {activeTab === "tuition" && (
        <TabTuitionPreview
          classId={classInfo.id}
          cycles={tuitionCyclesList}
        />
      )}
    </div>
  );
}
