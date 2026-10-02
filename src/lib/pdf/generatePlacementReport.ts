import jsPDF from "jspdf";
import { computePlacementReadiness } from "@/components/report/PlacementBenchmarkCard";

interface ReportData {
  sessionId: string;
  candidateName?: string;
  dateStr?: string;
  track?: string;
  topic?: string;
  overallScore: number | null;
  fluencyScore: number | null;
  contentScore: number | null;
  structureScore: number | null;
  voiceScore: number | null;
  wpm?: number;
  totalWords?: number;
  fillerCount?: number;
}

export function generatePlacementReportPDF(data: ReportData): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Background Header Bar (Dark slate)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 32, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GD BUDDY · CANDIDATE PLACEMENT DOSSIER", margin, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("OFFICIAL PLACEMENT PREPARATION EVALUATION REPORT", margin, 22);
  doc.text(`VERIFICATION ID: ${data.sessionId.slice(0, 16).toUpperCase()}`, margin, 27);

  // Metadata Panel
  let y = 42;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CANDIDATE / SESSION:", margin + 4, y + 7);
  doc.text("EVALUATION TRACK:", margin + 4, y + 14);
  doc.text("EVALUATION TOPIC:", margin + 4, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(data.candidateName || `Candidate (${data.sessionId.slice(0, 8)})`, margin + 45, y + 7);
  doc.text(String(data.track || "GENERAL PLACEMENT").toUpperCase(), margin + 45, y + 14);
  const topicShort = (data.topic || "Placement Group Discussion Simulation").slice(0, 75);
  doc.text(topicShort, margin + 45, y + 20);

  // Overall Score & Readiness Tier
  y += 32;
  const readiness = computePlacementReadiness(data.overallScore);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  const scoreText = data.overallScore !== null ? `${data.overallScore}%` : "N/A";
  doc.text(scoreText, margin + 8, y + 18);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("OVERALL PLACEMENT SCORE", margin + 8, y + 26);

  // Readiness Badge right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(readiness.band, margin + 65, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(readiness.percentileText, margin + 65, y + 18);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(readiness.description.slice(0, 85), margin + 65, y + 25);

  // 4 Pillar Breakdown
  y += 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("EVALUATION MATRIX BY PILLAR", margin, y);

  y += 6;
  const pillars = [
    { label: "Structure & Framework Logic", score: data.structureScore, benchmark: ">= 70% Target" },
    { label: "Content Depth & Factuality", score: data.contentScore, benchmark: ">= 68% Target" },
    { label: "Speech Cadence (WPM Fluency)", score: data.fluencyScore, benchmark: "130-160 WPM Target" },
    { label: "Delivery & Low Filler Rate", score: data.voiceScore, benchmark: "< 2% Filler Rate" }
  ];

  pillars.forEach((p, idx) => {
    const py = y + idx * 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, py, contentWidth, 13, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(p.label, margin + 4, py + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Benchmark: ${p.benchmark}`, margin + 85, py + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(p.score !== null ? `${p.score}%` : "N/A", contentWidth + margin - 15, py + 8);
  });

  // Actionable Placement Recommendation
  y += 72;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("RECOMMENDED 14-DAY DRILL REMEDIATION", margin, y);

  y += 6;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text("CAMPUS TPO / TRAINER DIRECTIVE:", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(69, 10, 10);
  const recText = (data.overallScore || 0) >= 75
    ? "Candidate exhibits strong readiness for corporate GD drives. Focus on Day 12-14 Consulting mock rounds to practice hypothesis-driven problem statements."
    : "Candidate needs structured improvement in argumentation flow. Prescribe Bootcamp Phase 2 (Days 4-7: PEEL model & handling aggressive turn-takers).";
  doc.text(recText, margin + 4, y + 13, { maxWidth: contentWidth - 8 });

  // Footer Verification Stamp
  y = 275;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by GD Buddy AI Placement Simulator · Valid for Placement Cells & Corporate Assessments", margin, y + 5);
  doc.text(`Evaluated: ${new Date().toLocaleDateString("en-IN")}`, contentWidth + margin - 35, y + 5);

  doc.save(`GD-Buddy-Placement-Dossier-${data.sessionId.slice(0, 8)}.pdf`);
}
