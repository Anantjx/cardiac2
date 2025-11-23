import "dotenv/config";
import { RequestHandler } from "express";
import { LabReportAnalysis } from "@shared/api";

/**
 * Attempts to repair common JSON issues in AI-generated JSON
 */
function repairJson(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Remove trailing commas before closing brackets/braces (most common issue)
  // This handles cases like: [1, 2, 3,] or {a: 1, b: 2,}
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing commas between array elements or object properties
  // Pattern: ] or } followed by { or [ without a comma
  repaired = repaired.replace(/([}\]])[\s\n]*([{[])/g, '$1,$2');
  
  // Remove any control characters that might break JSON (preserve newlines and tabs)
  repaired = repaired.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Fix unescaped newlines and tabs in string values
  // This is a simple approach - replace literal newlines/tabs in strings with escaped versions
  // We do this by finding strings and replacing newlines within them
  let inString = false;
  let escaped = false;
  let result = '';
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    const prevChar = i > 0 ? repaired[i - 1] : '';
    
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      result += char;
      continue;
    }
    
    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString) {
      // Replace problematic characters in strings
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * Safely parses JSON with multiple fallback strategies
 */
function safeJsonParse(content: string): LabReportAnalysis | null {
  // Strategy 1: Try direct parse
  try {
    return JSON.parse(content);
  } catch (e: any) {
    const errorMsg = e.message || String(e);
    console.log("Direct parse failed:", errorMsg);
    
    // Log context around the error position if available
    if (errorMsg.includes("position")) {
      const positionMatch = errorMsg.match(/position (\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const start = Math.max(0, position - 200);
        const end = Math.min(content.length, position + 200);
        console.log("Content around error position:", content.substring(start, end));
        console.log("Character at position:", JSON.stringify(content[position]));
      }
    }
  }
  
  // Strategy 2: Try to extract JSON object from text
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      console.log("Extracted JSON parse failed:", errorMsg);
      
      // Strategy 3: Try to repair the extracted JSON
      try {
        const repaired = repairJson(jsonMatch[0]);
        return JSON.parse(repaired);
      } catch (e2: any) {
        const errorMsg2 = e2.message || String(e2);
        console.log("Repaired JSON parse failed:", errorMsg2);
        
        // Log a sample of the repaired JSON for debugging
        if (errorMsg2.includes("position")) {
          const positionMatch = errorMsg2.match(/position (\d+)/);
          if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const repaired = repairJson(jsonMatch[0]);
            const start = Math.max(0, position - 200);
            const end = Math.min(repaired.length, position + 200);
            console.log("Repaired content around error:", repaired.substring(start, end));
          }
        }
      }
    }
  }
  
  return null;
}

export const handleAnalyzeLabReport: RequestHandler = async (req, res) => {
  const { fileData, fileName, mimeType, patientName } = req.body ?? {};

  if (!fileData) {
    return res.status(400).json({ error: "Missing file data" });
  }

  // Use Gemini API key from .env
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in environment variables");
    return res.status(500).json({ error: "Gemini API key not configured" });
  }
  
  console.log("Gemini API key found, starting analysis...");

  try {
    // Determine if this is an image or PDF that can use vision API
    const isImage = mimeType?.startsWith("image/");
    const isPdf = mimeType === "application/pdf" || fileName?.endsWith(".pdf");
    
    let analysisResult: LabReportAnalysis;

    const prompt = `Analyze this lab report${patientName ? ` for patient: ${patientName}` : ""}. Extract and summarize:
1. All lab values/levels (name, value, unit, reference range if available)
2. Any abnormal findings
3. Overall summary
4. Risk level (Low/Medium/High/Critical) if cardiac-related
5. Recommendations if any

Respond with a JSON object in this exact format:
{
  "summary": "Brief overall summary of the lab report",
  "levels": [
    {
      "name": "Test name (e.g., Cholesterol, LDL, HDL, Triglycerides, etc.)",
      "value": "The numeric value",
      "unit": "Unit (mg/dL, mmol/L, etc.)",
      "status": "Normal|High|Low|Critical|Unknown",
      "referenceRange": "Normal range if available"
    }
  ],
  "findings": ["Finding 1", "Finding 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "riskLevel": "Low|Medium|High|Critical"
}

Focus on cardiac-related markers like cholesterol, LDL, HDL, triglycerides, blood pressure, ECG findings, troponin, BNP, etc.`;

    if (isImage || isPdf) {
      // Use Gemini Vision API for images and PDFs
      const parts: any[] = [];

      // Add image/PDF data first, then text prompt
      if (isImage) {
        parts.push({
          inline_data: {
            mime_type: mimeType || "image/jpeg",
            data: fileData,
          },
        });
      } else if (isPdf) {
        // Gemini can handle PDFs directly
        parts.push({
          inline_data: {
            mime_type: "application/pdf",
            data: fileData,
          },
        });
      }
      
      // Add text prompt after the image
      parts.push({ text: prompt });

      const requestBody = {
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192, // Increased from 2048 to handle longer lab reports
          responseMimeType: "application/json",
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      // Use gemini-2.5-flash for images (faster and cheaper), gemini-2.5-pro-preview-03-25 for PDFs
      const model = isPdf ? "gemini-2.5-pro-preview-03-25" : "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      console.log(`Calling Gemini API with model: ${model}, mimeType: ${mimeType}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error("Gemini API error:", errorData);
        return res.status(500).json({ 
          error: "Failed to analyze lab report",
          details: errorData.error?.message || errorData.message || errorData.error || errorText
        });
      }

      const data = await response.json();
      
      // Check for API errors in response
      if (data.error) {
        console.error("Gemini API error in response:", data.error);
        return res.status(500).json({ 
          error: "Failed to analyze lab report",
          details: data.error.message || JSON.stringify(data.error)
        });
      }

      // Try multiple ways to extract content from Gemini response
      let content = null;
      
      // Method 1: Standard response format
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        content = data.candidates[0].content.parts[0].text;
      }
      // Method 2: Alternative response format
      else if (data.candidates?.[0]?.text) {
        content = data.candidates[0].text;
      }
      // Method 3: Direct content
      else if (data.content?.parts?.[0]?.text) {
        content = data.content.parts[0].text;
      }
      // Method 4: Check all parts
      else if (data.candidates?.[0]?.content?.parts) {
        for (const part of data.candidates[0].content.parts) {
          if (part.text) {
            content = part.text;
            break;
          }
        }
      }

      if (!content) {
        console.error("No content in Gemini response. Full response:", JSON.stringify(data, null, 2));
        // Check if there's a finish reason that might explain the issue
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== "STOP") {
          return res.status(500).json({ 
            error: "No analysis returned",
            details: `Gemini API response finished with reason: ${finishReason}. This might indicate content filtering or token limits.`
          });
        }
        return res.status(500).json({ 
          error: "No analysis returned",
          details: "Gemini API returned empty response. Please check the server logs for the full response."
        });
      }

      const parsed = safeJsonParse(content);
      if (parsed) {
        analysisResult = parsed;
      } else {
        console.error("Failed to parse JSON after all attempts");
        console.error("Content preview (first 1000 chars):", content.substring(0, 1000));
        // Fallback: create a basic structure from the text
        analysisResult = {
          summary: content.substring(0, 500) || "Lab report analysis completed, but JSON parsing failed.",
          levels: [],
          findings: ["Failed to parse JSON response from AI. Please try again or contact support."],
          riskLevel: "Unknown" as const,
        };
      }
    } else {
      // For text files, use Gemini text API
      let textContent: string;
      try {
        textContent = Buffer.from(fileData, "base64").toString("utf-8");
      } catch {
        textContent = fileData; // Assume it's already text
      }

      const fullPrompt = `${prompt}

Lab report content:
${textContent}`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192, // Increased from 2048 to handle longer lab reports
          responseMimeType: "application/json",
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error("Gemini API error:", errorData);
        return res.status(500).json({ 
          error: "Failed to analyze lab report",
          details: errorData.error?.message || errorData.message || errorData.error || errorText
        });
      }

      const data = await response.json();
      
      // Check for API errors in response
      if (data.error) {
        console.error("Gemini API error in response:", data.error);
        return res.status(500).json({ 
          error: "Failed to analyze lab report",
          details: data.error.message || JSON.stringify(data.error)
        });
      }

      // Try multiple ways to extract content from Gemini response
      let content = null;
      
      // Method 1: Standard response format
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        content = data.candidates[0].content.parts[0].text;
      }
      // Method 2: Alternative response format
      else if (data.candidates?.[0]?.text) {
        content = data.candidates[0].text;
      }
      // Method 3: Direct content
      else if (data.content?.parts?.[0]?.text) {
        content = data.content.parts[0].text;
      }
      // Method 4: Check all parts
      else if (data.candidates?.[0]?.content?.parts) {
        for (const part of data.candidates[0].content.parts) {
          if (part.text) {
            content = part.text;
            break;
          }
        }
      }

      if (!content) {
        console.error("No content in Gemini response. Full response:", JSON.stringify(data, null, 2));
        // Check if there's a finish reason that might explain the issue
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== "STOP") {
          return res.status(500).json({ 
            error: "No analysis returned",
            details: `Gemini API response finished with reason: ${finishReason}. This might indicate content filtering or token limits.`
          });
        }
        return res.status(500).json({ 
          error: "No analysis returned",
          details: "Gemini API returned empty response. Please check the server logs for the full response."
        });
      }

      const parsed = safeJsonParse(content);
      if (parsed) {
        analysisResult = parsed;
      } else {
        console.error("Failed to parse JSON after all attempts");
        console.error("Content preview (first 1000 chars):", content.substring(0, 1000));
        // Fallback: create a basic structure from the text
        analysisResult = {
          summary: content.substring(0, 500) || "Lab report analysis completed, but JSON parsing failed.",
          levels: [],
          findings: ["Failed to parse JSON response from AI. Please try again or contact support."],
          riskLevel: "Unknown" as const,
        };
      }
    }

    // Ensure all required fields exist
    if (!analysisResult.summary) {
      analysisResult.summary = "Lab report analyzed successfully";
    }
    if (!analysisResult.levels) {
      analysisResult.levels = [];
    }
    if (!analysisResult.findings) {
      analysisResult.findings = [];
    }

    res.json(analysisResult);
  } catch (error: any) {
    console.error("Error analyzing lab report:", error);
    let errorMessage = "Unknown error occurred";
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error) {
      errorMessage = JSON.stringify(error);
    }
    res.status(500).json({
      error: "Failed to analyze lab report",
      details: errorMessage,
    });
  }
};
