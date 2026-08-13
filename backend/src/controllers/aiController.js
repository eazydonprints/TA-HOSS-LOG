const {
  askTAHOSS,
  checkAIHealth,
} = require("../services/aiService");

// =========================================================
// CHAT
// =========================================================

const chat = async (req, res) => {
  try {
    const {
      message,
      history = [],
    } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "AI message is required.",
      });
    }

    const result = await askTAHOSS({
      message,
      history,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "TA-HOSS AI response generated.",
      data: result,
    });
  } catch (error) {
    console.error(
      "TA-HOSS AI CHAT ERROR:",
      {
        status: error?.status,
        statusCode: error?.statusCode,
        code: error?.code,
        message: error?.message,
      }
    );

    // -----------------------------------------------------
    // Validation errors
    // -----------------------------------------------------

    if (
      error?.message === "AI message is required." ||
      error?.message === "AI message cannot be empty." ||
      error?.message?.includes("AI message is too long")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // -----------------------------------------------------
    // AI provider errors
    // -----------------------------------------------------

    if (error?.isAIProviderError) {
      return res.status(
        error.statusCode || 502
      ).json({
        success: false,
        message: error.message,
      });
    }

    // -----------------------------------------------------
    // Unexpected server error
    // -----------------------------------------------------

    return res.status(500).json({
      success: false,
      message:
        "Unable to process TA-HOSS AI request.",
    });
  }
};

// =========================================================
// HEALTH
// =========================================================

const health = async (req, res) => {
  try {
    const result =
      await checkAIHealth();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "TA-HOSS AI HEALTH ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "AI service health check failed.",
    });
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  chat,
  health,
};