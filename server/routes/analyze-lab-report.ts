import "dotenv/config";
import { RequestHandler } from "express";
import { LabReportAnalysis } from "@shared/api";

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

      try {
        analysisResult = JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create a basic structure from the text
          analysisResult = {
            summary: content,
            levels: [],
            findings: [content],
            riskLevel: "Unknown",
          };
        }
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

      try {
        analysisResult = JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          analysisResult = {
            summary: content,
            levels: [],
            findings: [content],
            riskLevel: "Unknown",
          };
        }
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
