export type AcademicTrend =
  | "IMPROVING"
  | "STEADY"
  | "NEEDS_EFFORT"
  | "INSUFFICIENT_DATA";

export interface AcademicTrendSummary {
  trend: AcademicTrend;
  label: string;
  averageScore: number | null;
}

/**
 * Evaluates student progress trend from chronological test scores (oldest -> newest).
 */
export function evaluateAcademicTrend(
  chronologicalScores: number[]
): AcademicTrendSummary {
  if (chronologicalScores.length === 0) {
    return {
      trend: "INSUFFICIENT_DATA",
      label: "Chưa có bài kiểm tra",
      averageScore: null,
    };
  }

  const sum = chronologicalScores.reduce((a, b) => a + b, 0);
  const averageScore = Math.round((sum / chronologicalScores.length) * 10) / 10;

  if (chronologicalScores.length === 1) {
    const score = chronologicalScores[0];
    if (score >= 8) {
      return { trend: "IMPROVING", label: "Đang tiến bộ", averageScore };
    }
    if (score >= 6) {
      return { trend: "STEADY", label: "Giữ vững", averageScore };
    }
    return { trend: "NEEDS_EFFORT", label: "Cần cố gắng", averageScore };
  }

  const mid = Math.floor(chronologicalScores.length / 2);
  const earlier = chronologicalScores.slice(0, mid);
  const recent = chronologicalScores.slice(mid);

  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const delta = recentAvg - earlierAvg;

  if (recentAvg < 5.5 || delta <= -0.6) {
    return { trend: "NEEDS_EFFORT", label: "Cần cố gắng", averageScore };
  }
  if (delta >= 0.5) {
    return { trend: "IMPROVING", label: "Đang tiến bộ", averageScore };
  }
  return { trend: "STEADY", label: "Giữ vững", averageScore };
}
