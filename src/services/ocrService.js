const vision = require("@google-cloud/vision");
const Tesseract = require("tesseract.js");
const fetch = require("node-fetch").default;

class OCRService {
  constructor() {
    try {
      this.client = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_VISION_KEY_PATH,
      });
      this.useGoogle = true;
    } catch (e) {
      this.useGoogle = false;
    }
  }

  async extractTextFromImage(imageUrl) {
    if (this.useGoogle) {
      try {
        const [result] = await this.client.textDetection(imageUrl);
        const detections = result.textAnnotations;
        if (!detections || detections.length === 0) {
          throw new Error("No text detected in image");
        }
        const fullText = detections[0].description;
        const confidence = this.calculateConfidence(detections);
        return {
          text: fullText,
          confidence: confidence,
          lines: this.extractLines(detections.slice(1)),
        };
      } catch (error) {
        // Fallback to Tesseract
        return this.extractTextWithTesseract(imageUrl);
      }
    } else {
      // Use Tesseract
      return this.extractTextWithTesseract(imageUrl);
    }
  }

  async extractTextWithTesseract(imageUrl) {
    try {
      // Download image to buffer
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      const {
        data: { text, confidence },
      } = await Tesseract.recognize(buffer, "eng");
      return {
        text,
        confidence: confidence ? confidence / 100 : 0.7,
        lines: text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      };
    } catch (error) {
      console.error("Tesseract OCR Error:", error);
      throw new Error("Failed to extract text from image");
    }
  }

  calculateConfidence(detections) {
    if (!detections || detections.length === 0) return 0;
    // Calculate average confidence from bounding box data
    const confidences = detections.slice(1).map(() => 0.85); // Placeholder
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  extractLines(detections) {
    const lines = [];
    const lineGroups = {};
    detections.forEach((detection) => {
      const y = detection.boundingPoly.vertices[0].y;
      const lineKey = Math.round(y / 10) * 10;
      if (!lineGroups[lineKey]) {
        lineGroups[lineKey] = [];
      }
      lineGroups[lineKey].push(detection.description);
    });
    Object.keys(lineGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((key) => {
        lines.push(lineGroups[key].join(" "));
      });
    return lines;
  }
}

module.exports = new OCRService();
