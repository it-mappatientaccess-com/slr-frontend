export const ERROR_MESSAGES = {
  PASSWORD_PROTECTED:
    "This document is password-protected and cannot be processed.",
  CORRUPTED_FILE:
    "This document appears corrupted or contains no readable content.",
  UNSUPPORTED_FILE_TYPE:
    "This file type is not supported. Supported types: PDF, DOCX, PPTX, XLSX, TXT, CSV.",
  AZURE_REQUEST_FAILED:
    "Document processing service returned an error. Please retry.",
  LEGACY_PARSE_FAILED:
    "Failed to extract content from this document. Please retry.",
  EMBEDDING_FAILED:
    "Failed to prepare document for analysis. Please retry.",
  LLM_UPSTREAM_FAILED:
    "The AI service is temporarily unavailable. Please retry.",
  LLM_PROCESSING_FAILED:
    "Analysis failed for this document. Please retry.",
  LLM_SCHEMA_VALIDATION_FAILED:
    "The AI response was malformed. Please retry.",
  LLM_RESPONSE_REFUSED:
    "The AI service declined to process this document.",
};

export const getErrorMessage = (failureCode) => {
  if (!failureCode) {
    return "An unexpected error occurred. Please retry or contact support.";
  }

  return (
    ERROR_MESSAGES[failureCode] ||
    "An unexpected error occurred. Please retry or contact support."
  );
};

export default getErrorMessage;
