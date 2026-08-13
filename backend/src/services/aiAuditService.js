const AIAuditLog = require("../models/AIAuditLog");

const sanitizeArguments = (args = {}) => {
  const blocked = new Set([
    "password",
    "token",
    "jwt",
    "authorization",
    "apiKey",
    "api_key",
    "templateReference",
    "photoPublicId",
    "qrToken",
  ]);

  const safe = {};

  for (const [key, value] of Object.entries(args)) {
    if (!blocked.has(key)) {
      safe[key] = value;
    }
  }

  return safe;
};

const logAIQuery = async ({
  user,
  role,
  question,
  source,
  operation = null,
  arguments: args = {},
  success,
  errorType = null,
}) => {
  try {
    await AIAuditLog.create({
      user: user?._id || user?.id || null,
      role: role || null,
      question: String(question).slice(0, 2000),
      source,
      operation,
      arguments: sanitizeArguments(args),
      success,
      errorType,
    });
  } catch (error) {
    // Audit failure must never crash the AI request.
    console.error(
      "AI audit logging failed:",
      error.message
    );
  }
};

module.exports = {
  logAIQuery,
};