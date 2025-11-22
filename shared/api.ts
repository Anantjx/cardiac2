/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Lab report analysis response type
 */
export interface LabReportLevel {
  name: string;
  value: string;
  unit?: string;
  status: "Normal" | "High" | "Low" | "Critical" | "Unknown";
  referenceRange?: string;
}

export interface LabReportAnalysis {
  summary: string;
  levels: LabReportLevel[];
  findings: string[];
  recommendations?: string[];
  riskLevel?: "Low" | "Medium" | "High" | "Critical";
}