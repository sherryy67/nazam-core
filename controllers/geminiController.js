const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendSuccess, sendError } = require('../utils/response');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// @desc    Generate tooltip content for a service
// @route   POST /api/gemini/tooltip
// @access  Public
const generateTooltip = async (req, res, next) => {
  try {
    const { serviceName } = req.body;

    // Validate service name
    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim().length === 0) {
      return sendError(res, 400, 'Service name is required', 'MISSING_SERVICE_NAME');
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return sendError(res, 500, 'Gemini API key is not configured', 'GEMINI_API_KEY_MISSING');
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a prompt for generating tooltip content
    const prompt = `Generate a concise, practical, and encouraging tooltip for a service request form. The service is: "${serviceName.trim()}"

The tooltip should guide users on what details to include when requesting a quotation for this service. Focus on:

- Dimensions or measurements (if applicable)
- Design preferences or style
- Materials or specifications
- Budget range or expectations
- Timeline or urgency
- Special requirements or constraints

Keep it concise (2-3 sentences), practical, and encouraging. Focus on helping users provide helpful information that will result in an accurate quotation.

Format the response as plain text without markdown formatting or bullet points. Make it friendly and easy to understand.`;

    try {
      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const tooltipContent = response.text().trim();

      // Check if we got a valid response
      if (!tooltipContent || tooltipContent.length === 0) {
        return sendError(res, 500, 'Failed to generate tooltip content', 'GEMINI_GENERATION_FAILED');
      }

      sendSuccess(res, 200, 'Tooltip generated successfully', {
        serviceName: serviceName.trim(),
        tooltip: tooltipContent
      });
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      return sendError(res, 500, `Failed to generate tooltip: ${geminiError.message}`, 'GEMINI_API_ERROR');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateTooltip
};

