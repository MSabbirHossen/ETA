import React from "react";
import { ETALoader } from "../../../components/brand/ETALoader";

export default function TeacherAnalyticsLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060E1A] text-slate-100">
      <ETALoader
        size="lg"
        theme="dark"
        label="Loading Classroom & Student Insights..."
      />
    </div>
  );
}
