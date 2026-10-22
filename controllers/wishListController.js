const fs = require('fs');
const path = require('path');
const WishList = require('../models/wishlist');
const clientUserModule = require('../models/user');
const Buy = require('../models/buy');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const Tesseract = require('tesseract.js');
const { encode } = require('gpt-3-encoder');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');

exports.saveToWishList = async (req, res) => {
  try {
    const userId = req.user._id;
    let { courses, courseId } = req.body;
    // Normalize input: allow single courseId or array
    if (courseId) {
      courses = [{ courseId }];
    }

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ message: "courses must be a non-empty array" });
    }
    const uniqueCourseIds = [...new Set(courses.map(c => c.courseId.toString()))];
    const courseEntries = uniqueCourseIds.map(courseId => ({
      courseId,
      createdBy: userId
    }));

    let wishList = await WishList.findOne({ userId });

    if (!wishList) {
      wishList = new WishList({ userId, courses: courseEntries });
    } else {
      const existingIds = wishList.courses.map(c => c.courseId.toString());
      const newCourses = courseEntries.filter(c => !existingIds.includes(c.courseId.toString()));
      wishList.courses.push(...newCourses);
    }

    await wishList.save();

    res.status(200).json({ message: "Courses saved to wishlist", data: wishList });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

exports.getWishListByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.query;

    // 🔹 Fetch user earning
    const userData = await clientUserModule.findById(userId).select('earning').lean();
    const userEarning = userData?.earning || 0;

    // 🔹 Get all purchased courses of this user
    const purchasedCourses = await Buy.find({ userId, paymentstatus: true }).select('courseId').lean();
    const purchasedCourseIds = purchasedCourses.map(c => c.courseId.toString());

    const payment = purchasedCourses.length > 0;

    let wishList = await WishList.findOne({ userId }).populate({
      path: 'courses.courseId',
      populate: ['category', 'subcategory', 'subject']
    });

    // 🔹 If no wishlist found
    if (!wishList) {
      if (courseId) {
        return res.status(200).json({ isInWishlist: false, earning: userEarning, payment });
      }
      return res.status(200).json({ data: { courses: [] }, earning: userEarning, payment });
    }

    // 🔹 Remove purchased courses from wishlist
    const beforeLength = wishList.courses.length;
    wishList.courses = wishList.courses.filter(c => {
      if (!c.courseId) return false;
      return !purchasedCourseIds.includes(c.courseId._id.toString());
    });

    // 🔹 Agar wishlist me changes hue to save kare
    if (wishList.courses.length !== beforeLength) {
      await wishList.save();
    }

    let wishListObj = wishList.toObject();

    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

    // 🔹 Convert file paths to full HTTPS URLs
    if (wishListObj.courses && wishListObj.courses.length) {
      wishListObj.courses = wishListObj.courses.map(item => {
        const course = item.courseId;
        if (!course) return item;

        if (course.courseImages) {
          if (Array.isArray(course.courseImages)) {
            course.courseImages = course.courseImages.map(imgPath =>
              fs.existsSync(imgPath) ? `${baseUrl}/uploads/${path.basename(imgPath)}` : imgPath
            );
          } else if (typeof course.courseImages === 'string') {
            if (fs.existsSync(course.courseImages)) {
              course.courseImages = `${baseUrl}/uploads/${path.basename(course.courseImages)}`;
            }
          }
        }

        if (course.ebook && fs.existsSync(course.ebook)) {
          course.ebook = `${baseUrl}/uploads/${path.basename(course.ebook)}`;
        }

        if (course.studyNotes && fs.existsSync(course.studyNotes)) {
          course.studyNotes = `${baseUrl}/uploads/${path.basename(course.studyNotes)}`;
        }

        return item;
      });
    }

    // 🔹 If specific courseId check is requested
    if (courseId) {
      const isInWishlist = wishListObj.courses.some(c => c.courseId?._id.toString() === courseId);
      return res.status(200).json({ isInWishlist, earning: userEarning, payment });
    }

    // 🔹 Return full wishlist
    return res.status(200).json({ data: wishListObj, earning: userEarning, payment });

  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// exports.getWishListByUser = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { courseId } = req.query;

//     // 🔹 Fetch user earning
//     const userData = await clientUserModule.findById(userId).select('earning').lean();
//     const userEarning = userData?.earning || 0;

//     // 🔹 Check if user has purchased any course
//     const hasPurchased = await Buy.exists({ userId, paymentstatus: true });
//     const payment = !!hasPurchased;

//     let wishList = await WishList.findOne({ userId }).populate({
//       path: 'courses.courseId',
//       populate: ['category', 'subcategory', 'subject']
//     }).lean();

//     // 🔹 If no wishlist found
//     if (!wishList) {
//       if (courseId) {
//         return res.status(200).json({ isInWishlist: false, earning: userEarning, payment });
//       }
//       return res.status(200).json({ data: { courses: [] }, earning: userEarning, payment });
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');
//     // 🔹 Convert file paths to full HTTPS URLs
//     if (wishList.courses && wishList.courses.length) {
//       wishList.courses = wishList.courses.map(item => {
//         const course = item.courseId;
//         if (!course) return item;
//         if (course.courseImages) {
//           if (Array.isArray(course.courseImages)) {
//             course.courseImages = course.courseImages.map(imgPath =>
//               fs.existsSync(imgPath) ? `${baseUrl}/uploads/${path.basename(imgPath)}` : imgPath
//             );
//           } else if (typeof course.courseImages === 'string') {
//             if (fs.existsSync(course.courseImages)) {
//               course.courseImages = `${baseUrl}/uploads/${path.basename(course.courseImages)}`;
//             }
//           }
//         }

//         if (course.ebook && fs.existsSync(course.ebook)) {
//           course.ebook = `${baseUrl}/uploads/${path.basename(course.ebook)}`;
//         }

//         if (course.studyNotes && fs.existsSync(course.studyNotes)) {
//           course.studyNotes = `${baseUrl}/uploads/${path.basename(course.studyNotes)}`;
//         }

//         return item;
//       });
//     }

//     // 🔹 If specific courseId check is requested
//     if (courseId) {
//       const isInWishlist = wishList.courses.some(c => c.courseId?._id.toString() === courseId);
//       return res.status(200).json({ isInWishlist, earning: userEarning, payment });
//     }

//     // 🔹 Return full wishlist
//     return res.status(200).json({ data: wishList, earning: userEarning, payment });

//   } catch (error) {
//     console.error('Error fetching wishlist:', error);
//     return res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };


exports.removeFromWishList = async (req, res) => {
  try {
    const userId = req.user._id; 
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required in URL' });
    }

    const wishList = await WishList.findOne({ userId });

    if (!wishList) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const originalLength = wishList.courses.length;

    wishList.courses = wishList.courses.filter(
      item => item.courseId.toString() !== courseId
    );

    if (wishList.courses.length === originalLength) {
      return res.status(404).json({ message: 'Course not found in wishlist' });
    }

    await wishList.save();

    return res.status(200).json({
      message: 'Course removed from wishlist',
      data: wishList
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.askAI = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "question is required in body" });
    }

    // ✅ Step 1: Web search (DuckDuckGo API)
    const searchResponse = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`
    );

    const searchSummary =
      searchResponse.data?.AbstractText ||
      (searchResponse.data?.RelatedTopics?.[0]?.Text ?? "") ||
      searchResponse.data?.Heading ||
      "No live info found.";

    // ✅ Step 2: Build prompt with fallback
    const userPrompt =
      searchSummary === "No live info found"
        ? `Question: ${question}\n\nNo live info found from the web. Answer from your knowledge.`
        : `Question: ${question}\n\nLatest info from web: ${searchSummary}\n\nAnswer clearly with the current name.`;

    // ✅ Step 3: Call OpenAI (gpt-4o-mini)
    const OPENAI_API_KEY_ASK = process.env.OPENAI_API_KEY_ASK;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300, // fixed param
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY_ASK}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiText =
      response.data?.choices?.[0]?.message?.content?.trim() ||
      "AI could not generate a response.";

    return res.status(200).json({ answer: aiText });
  } catch (error) {
    console.error("Error:", error?.response?.data || error.message);
    return res.status(500).json({
      message: "Server error while generating AI response",
      error: error?.response?.data || error.message,
    });
  }
};

 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});



// Helper: chunk text
function chunkTextByTokens(text, maxTokens = 1500) {
  const words = text.split(/\s+/);
  let chunks = [];
  let current = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = word.length;
    if (currentTokens + wordTokens > maxTokens) {
      chunks.push(current.join(" "));
      current = [];
      currentTokens = 0;
    }
    current.push(word);
    currentTokens += wordTokens;
  }

  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

// Helper: sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper for OpenAI API
async function callOpenAIWithRetry(prompt, retries = 5, delayMs = 30000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        max_output_tokens: 4000,
      });

      const aiOutput =
        response.output && response.output[0]?.content[0]?.text
          ? response.output[0].content[0].text
          : "";

      return aiOutput;
    } catch (err) {
      if (err.status === 429 && attempt < retries) {
        console.log(
          `Rate limit hit, retrying in ${delayMs / 1000}s... attempt ${attempt}`
        );
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries reached for OpenAI API.");
}

// Robust parser to convert raw AI output to topicQuestions
function convertToTopicQuestions(rawText) {
  const topicQuestions = [];
  const questionBlocks = rawText.split(/\n(?=\d+\.)/).filter(Boolean);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i].trim();

    // Extract question text
    const firstOptionIndex = block.search(/\([A-E]\)/);
    const questionText =
      firstOptionIndex !== -1
        ? block.substring(0, firstOptionIndex).replace(/^\d+\.\s*/, "").trim()
        : block.replace(/^\d+\.\s*/, "").trim();

    // Initialize options
    const options = ["", "", "", "", ""];
    let answer = "";

    // Match all options (A-E)
    const optionRegex = /\(([A-E])\)\s*([^\(\)]+?)(?=\s*\([A-E]\)|$)/g;
    let match;
    while ((match = optionRegex.exec(block)) !== null) {
      const letter = match[1];
      let text = match[2].trim();

      const idx = letter.charCodeAt(0) - 65; // A=0, B=1, ...
      options[idx] = text;

      // 👉 अगर option के end पर "(A)" "(B)" "(C)" "(D)" है तो वही answer बने
      const inlineAnswer = text.match(/\(([A-E])\)$/);
      if (inlineAnswer) {
        const ansLetter = inlineAnswer[1].toUpperCase();
        answer = `option${ansLetter.charCodeAt(0) - 64}`;
        options[idx] = text.replace(/\(([A-E])\)$/, "").trim();
      }
    }

    // 👉 नया step: check last answer marker (block ke end me likha hota hai)
    const lastAnswerMatch = block.match(/\(([A-E])\)\s*$/);
    if (lastAnswerMatch) {
      const ansLetter = lastAnswerMatch[1].toUpperCase();
      answer = `option${ansLetter.charCodeAt(0) - 64}`;
    }

    topicQuestions.push({
      _id: uuidv4(),
      question: questionText,
      questionImage: "",
      option1: options[0],
      option1Image: "",
      option2: options[1],
      option2Image: "",
      option3: options[2],
      option3Image: "",
      option4: options[3],
      option4Image: "",
      option5: options[4],
      option5Image: "",
      answer,
    });
  }

  return topicQuestions;
}

// File text extractor (PDF, DOCX, IMAGE)
async function extractTextFromFile(filePath, mimetype) {
  if (mimetype === "application/pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text.trim();
  }

  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  }

  if (mimetype.startsWith("image/")) {
    const result = await Tesseract.recognize(filePath, "eng+hin");
    return result.data.text.trim();
  }

  throw new Error("Unsupported file type");
}

// Main controller
exports.extractFromPDF = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "File is required." });

  const filePath = req.file.path;
  const mimetype = req.file.mimetype;

  try {
    const extractedText = await extractTextFromFile(filePath, mimetype);

    if (!extractedText) {
      fs.unlinkSync(filePath);
      return res
        .status(422)
        .json({ error: "No text found in file (maybe scanned, need OCR)." });
    }

    // Chunk large text
    const chunks = chunkTextByTokens(extractedText, 7000);
    let topicQuestions = [];

    for (let i = 0; i < chunks.length; i++) {
      const prompt = `
You are given raw text extracted from a question paper.
Tasks:
1. Return text as-is (preserve numbering, options A-E, etc.)
2. Correct OCR spelling mistakes (Hindi/English)
3. Highlight the correct answer by putting it in parentheses at the end of the correct option, e.g., (A), (B), etc.
4. Output only questions with options (no extra headings).

Text:
${chunks[i]}
`;

      const aiOutput = await callOpenAIWithRetry(prompt);
      const chunkQuestions = convertToTopicQuestions(aiOutput);

      topicQuestions.push(...chunkQuestions);

      if (i < chunks.length - 1) await sleep(25000);
    }

    fs.unlinkSync(filePath);

    return res.status(200).json({
      ok: true,
      topicQuestions,
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Error extracting file:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};







// // Helper: chunk text
// function chunkTextByTokens(text, maxTokens = 1500) {
//   const words = text.split(/\s+/);
//   let chunks = [];
//   let current = [];
//   let currentTokens = 0;

//   for (const word of words) {
//     const wordTokens = word.length;
//     if (currentTokens + wordTokens > maxTokens) {
//       chunks.push(current.join(" "));
//       current = [];
//       currentTokens = 0;
//     }
//     current.push(word);
//     currentTokens += wordTokens;
//   }

//   if (current.length > 0) chunks.push(current.join(" "));
//   return chunks;
// }

// // Helper: sleep
// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // Retry wrapper for OpenAI API
// async function callOpenAIWithRetry(prompt, retries = 5, delayMs = 30000) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const response = await openai.responses.create({
//         model: "gpt-4o-mini",
//         input: prompt,
//         max_output_tokens: 4000,
//       });

//       const aiOutput =
//         response.output && response.output[0]?.content[0]?.text
//           ? response.output[0].content[0].text
//           : "";

//       return aiOutput;
//     } catch (err) {
//       if (err.status === 429 && attempt < retries) {
//         console.log(
//           `Rate limit hit, retrying in ${delayMs / 1000}s... attempt ${attempt}`
//         );
//         await sleep(delayMs);
//       } else {
//         throw err;
//       }
//     }
//   }
//   throw new Error("Max retries reached for OpenAI API.");
// }

// // Robust parser to convert raw AI output to topicQuestions
// function convertToTopicQuestions(rawText) {
//   const topicQuestions = [];
//   const questionBlocks = rawText.split(/\n(?=\d+\.)/).filter(Boolean);

//   for (let i = 0; i < questionBlocks.length; i++) {
//     const block = questionBlocks[i].trim();

//     // Extract question text
//     const firstOptionIndex = block.search(/\([A-E]\)/);
//     const questionText =
//       firstOptionIndex !== -1
//         ? block.substring(0, firstOptionIndex).replace(/^\d+\.\s*/, "").trim()
//         : block.replace(/^\d+\.\s*/, "").trim();

//     // Initialize options
//     const options = ["", "", "", "", ""];
//     let answer = "";

//     // Match all options (A-E)
//     const optionRegex = /\(([A-E])\)\s*([^\(\)]+?)(?=\s*\([A-E]\)|$)/g;
//     let match;
//     while ((match = optionRegex.exec(block)) !== null) {
//       const letter = match[1];
//       let text = match[2].trim();

//       const idx = letter.charCodeAt(0) - 65; // A=0, B=1, ...
//       options[idx] = text;

//       // 👉 अगर option के end पर "(A)" "(B)" "(C)" "(D)" है तो वही answer बने
//       const inlineAnswer = text.match(/\(([A-E])\)$/);
//       if (inlineAnswer) {
//         const ansLetter = inlineAnswer[1].toUpperCase();
//         answer = `option${ansLetter.charCodeAt(0) - 64}`; // A=option1, B=option2...
//         options[idx] = text.replace(/\(([A-E])\)$/, "").trim();
//       }
//     }

//     // 👉 नया step: check last answer marker (block ke end me likha hota hai)
//     const lastAnswerMatch = block.match(/\(([A-E])\)\s*$/);
//     if (lastAnswerMatch) {
//       const ansLetter = lastAnswerMatch[1].toUpperCase();
//       answer = `option${ansLetter.charCodeAt(0) - 64}`;
//     }

//     topicQuestions.push({
//       _id: uuidv4(),
//       question: questionText,
//       questionImage: "",
//       option1: options[0],
//       option1Image: "",
//       option2: options[1],
//       option2Image: "",
//       option3: options[2],
//       option3Image: "",
//       option4: options[3],
//       option4Image: "",
//       option5: options[4],
//       option5Image: "",
//       answer,
//     });
//   }

//   return topicQuestions;
// }

// // Main controller
// exports.extractFromPDF = async (req, res) => {
//   if (!req.file)
//     return res.status(400).json({ error: "PDF file is required." });

//   const filePath = req.file.path;

//   try {
//     const dataBuffer = fs.readFileSync(filePath);
//     const pdfData = await pdfParse(dataBuffer);
//     const extractedText = pdfData.text.trim();

//     if (!extractedText) {
//       fs.unlinkSync(filePath);
//       return res
//         .status(422)
//         .json({ error: "No text found in PDF (maybe scanned, need OCR)." });
//     }

//     // Chunk large PDFs
//     const chunks = chunkTextByTokens(extractedText, 7000);
//     let topicQuestions = [];

//     for (let i = 0; i < chunks.length; i++) {
//       const prompt = `
// You are given raw text extracted from a PDF question paper.
// Tasks:
// 1. Return text as-is (preserve numbering, options A-E, etc.)
// 2. Correct OCR spelling mistakes (Hindi/English)
// 3. Highlight the correct answer by putting it in parentheses at the end of the correct option, e.g., (A), (B), etc.
// 4. Output only questions with options (no extra headings).

// PDF Text:
// ${chunks[i]}
// `;

//       const aiOutput = await callOpenAIWithRetry(prompt);
//       const chunkQuestions = convertToTopicQuestions(aiOutput);

//       topicQuestions.push(...chunkQuestions);

//       if (i < chunks.length - 1) await sleep(25000);
//     }

//     fs.unlinkSync(filePath);

//     return res.status(200).json({
//       ok: true,
//       topicQuestions,
//     });
//   } catch (err) {
//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     console.error("Error extracting PDF:", err);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };