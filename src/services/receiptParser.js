class ReceiptParser {
  constructor() {
    this.patterns = {
      total: [
        /-\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i, // For negative amounts like "- $205.00"
        /total[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /amount[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /sum[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /total amount[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /amount sent[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /total amount sent[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      ],
      date: [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
        /(\w{3}\s+\d{1,2},?\s+\d{4})/i,
        /(\w{3}\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+[AP]M)/i,
      ],
      merchant: [
        /^([A-Z\s&]{3,})/m,
        /thank you for shopping at\s*([^\\n]+)/i,
        /from\s*([^\\n]+)/i,
        /to\s*([^\\n]+)/i,
        /bank transfer to\s*([^\\n]+)/i,
      ],
      items: /(.+?)\s+\$?(\d+\.?\d*)/g,
      receiptNumber: [
        /reference\s*id\s*([a-f0-9]+)/i, // For Maya reference IDs
        /ref(?:erence)?\s*no\.?\s*([A-Z0-9]+)/i,
        /trace\s*id\s*(\d+)/i,
        /ref\s*no\.?\s*(\d+)/i,
      ],
    };

    this.categoryRules = this.loadCategoryRules();
  }

  parseReceipt(ocrText, lines) {
    console.log("Parsing receipt with lines:", lines);

    const result = {
      amount: this.extractAmount(ocrText, lines),
      date: this.extractDate(ocrText, lines),
      merchant: this.extractMerchant(lines),
      items: this.extractItems(ocrText),
      category: null,
      receiptNumber: this.extractReceiptNumber(ocrText, lines),
    };

    // Determine category based on merchant and items
    result.category = this.categorizeTransaction(result.merchant, result.items);

    console.log("Parsed result:", result);
    return result;
  }

  extractAmount(text, lines) {
    console.log("Extracting amount from lines:", lines);

    // Regex to match amounts with various currency symbols and commas
    const amountRegex =
      /(?:[$£₱€#])?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/;

    for (const line of lines) {
      console.log("Checking line for amount:", line);

      // Skip lines that are likely not amounts
      if (
        line.match(/\+?\d+\s*[a-zA-Z]/) || // Phone numbers
        line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) || // Dates
        line.match(/ref\s*no/i) || // Reference numbers
        line.match(/reference\s*id/i) || // Reference IDs
        line.match(/^\d+$/) // Account numbers
      ) {
        console.log("Skipping line as it's not an amount:", line);
        continue;
      }

      // Look for negative amounts first (common in transfers)
      const negativeMatch = line.match(
        /-\s*[$£₱€#]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/
      );
      if (negativeMatch) {
        const amount = parseFloat(negativeMatch[1].replace(/,/g, ""));
        console.log("Found negative amount:", amount, "from line:", line);
        return amount;
      }

      // Look for amount with currency symbol or prefix
      const match = line.match(amountRegex);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        console.log("Found amount:", amount, "from line:", line);
        return amount;
      }

      // Then look for other amount patterns
      for (const pattern of this.patterns.total) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));
          console.log("Found amount:", amount, "from line:", line);
          return amount;
        }
      }
    }

    console.log("No amount found");
    return null;
  }

  extractDate(text, lines) {
    // First try to find date in lines
    for (const line of lines) {
      for (const pattern of this.patterns.date) {
        const match = line.match(pattern);
        if (match) {
          return new Date(match[1]);
        }
      }
    }

    // Fallback to text patterns
    for (const pattern of this.patterns.date) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[1]);
      }
    }

    return new Date();
  }

  extractMerchant(lines) {
    // Look for merchant in first few lines
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && line.length < 50) {
        return line.trim();
      }
    }
    return "Unknown Merchant";
  }

  extractItems(text) {
    const items = [];
    let match;

    // Skip lines that are likely not items
    const skipPatterns = [
      /\+?\d+\s*[a-zA-Z]/, // Phone numbers
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // Dates
      /ref\s*no/i, // Reference numbers
      /reference\s*id/i, // Reference IDs
      /amount/i, // Amount lines
      /total/i, // Total lines
      /^\d+$/, // Account numbers
      /bank transfer/i, // Bank transfer lines
      /source/i, // Source lines
      /destination/i, // Destination lines
      /purpose/i, // Purpose lines
      /transaction/i, // Transaction lines
    ];

    const lines = text.split("\n");
    for (const line of lines) {
      // Skip lines that match skip patterns
      if (skipPatterns.some((pattern) => pattern.test(line))) {
        continue;
      }

      // Try to match item pattern
      const itemMatch = line.match(
        /(.+?)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
      );
      if (itemMatch) {
        items.push({
          name: itemMatch[1].trim(),
          price: parseFloat(itemMatch[2].replace(/,/g, "")),
        });
      }
    }

    return items;
  }

  extractReceiptNumber(text, lines) {
    console.log("Extracting receipt number from lines:", lines);

    // First try to find receipt number in lines
    for (const line of lines) {
      console.log("Checking line for receipt number:", line);

      // Look for Maya reference ID
      const refIdMatch = line.match(/reference\s*id\s*([a-f0-9]+)/i);
      if (refIdMatch) {
        const refNumber = refIdMatch[1];
        console.log("Found Maya reference ID:", refNumber);
        return refNumber;
      }

      // Look for reference number with spaces
      const spacedRefMatch = line.match(
        /ref\s*no\.?\s*(\d{4}\s*\d{3}\s*\d{6})/i
      );
      if (spacedRefMatch) {
        const refNumber = spacedRefMatch[1].replace(/\s+/g, "");
        console.log("Found spaced reference number:", refNumber);
        return refNumber;
      }

      // Look for reference number with datetime
      const refWithDateMatch = line.match(
        /ref\s*no\.?\s*(\d+)(?:\s+[A-Za-z]+\s+\d+,\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)?/i
      );
      if (refWithDateMatch) {
        const refNumber = refWithDateMatch[1];
        console.log("Found reference number with date:", refNumber);
        return refNumber;
      }

      // Look for simple reference number
      const simpleRefMatch = line.match(/ref\s*no\.?\s*(\d+)/i);
      if (simpleRefMatch) {
        const refNumber = simpleRefMatch[1];
        console.log("Found simple reference number:", refNumber);
        return refNumber;
      }
    }

    // Fallback to text patterns
    for (const pattern of this.patterns.receiptNumber) {
      const match = text.match(pattern);
      if (match) {
        const refNumber = match[1].replace(/\s+/g, "");
        console.log("Found reference number in text:", refNumber);
        return refNumber;
      }
    }

    console.log("No receipt number found");
    return null;
  }

  categorizeTransaction(merchant, items) {
    const merchantLower = merchant.toLowerCase();

    // Check merchant-based rules
    for (const [category, keywords] of Object.entries(
      this.categoryRules.merchants
    )) {
      if (keywords.some((keyword) => merchantLower.includes(keyword))) {
        return category;
      }
    }

    // Check item-based rules
    const itemNames = items.map((item) => item.name.toLowerCase()).join(" ");
    for (const [category, keywords] of Object.entries(
      this.categoryRules.items
    )) {
      if (keywords.some((keyword) => itemNames.includes(keyword))) {
        return category;
      }
    }

    return "Other";
  }

  loadCategoryRules() {
    return {
      merchants: {
        Groceries: ["walmart", "target", "safeway", "kroger", "whole foods"],
        Gas: ["shell", "exxon", "chevron", "bp", "mobil"],
        Dining: ["restaurant", "cafe", "pizza", "subway", "mcdonald"],
        Shopping: ["amazon", "best buy", "macy", "nike", "apple store"],
        Transport: ["uber", "lyft", "taxi", "metro", "bus"],
        Banking: ["bank", "gcash", "gotyme", "transfer"],
      },
      items: {
        Groceries: ["milk", "bread", "eggs", "vegetables", "fruit"],
        Dining: ["burger", "pizza", "coffee", "drink", "meal"],
        Gas: ["gasoline", "fuel", "diesel"],
        Healthcare: ["pharmacy", "medicine", "prescription"],
      },
    };
  }
}

module.exports = new ReceiptParser();
