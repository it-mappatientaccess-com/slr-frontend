const STATUS_CONFIG = {
  completed: {
    containerClass: "bg-emerald-50 border border-emerald-200 text-emerald-800",
    iconClass: "fas fa-check-circle text-emerald-600",
    title: "Batch completed",
  },
  partially_completed: {
    containerClass: "bg-yellow-50 border border-yellow-200 text-yellow-800",
    iconClass: "fas fa-triangle-exclamation text-yellow-600",
    title: "Batch completed with failures",
  },
  failed: {
    containerClass: "bg-red-50 border border-red-200 text-red-800",
    iconClass: "fas fa-circle-xmark text-red-600",
    title: "Batch failed",
  },
  cancelled: {
    containerClass: "bg-blueGray-50 border border-blueGray-200 text-blueGray-800",
    iconClass: "fas fa-ban text-blueGray-600",
    title: "Batch cancelled",
  },
};

const getSummaryMessage = ({
  status,
  totalFiles,
  succeededCount,
  failedCount,
  processedCount,
}) => {
  if (status === "completed") {
    return `All ${totalFiles} files processed successfully.`;
  }

  if (status === "partially_completed") {
    return `${succeededCount} of ${totalFiles} files processed successfully. ${failedCount} files failed.`;
  }

  if (status === "failed") {
    return "All files failed to process. Check individual file errors below.";
  }

  if (status === "cancelled") {
    return `Extraction was cancelled. ${processedCount} of ${totalFiles} files were processed.`;
  }

  return "";
};

const BatchSummaryBanner = ({
  status,
  totalFiles,
  succeededCount,
  failedCount,
  processedCount,
}) => {
  if (!status || !STATUS_CONFIG[status]) return null;

  const config = STATUS_CONFIG[status];
  const summaryMessage = getSummaryMessage({
    status,
    totalFiles,
    succeededCount,
    failedCount,
    processedCount,
  });

  return (
    <div
      className={`mt-4 rounded px-4 py-3 flex items-start ${config.containerClass}`}
    >
      <i className={`${config.iconClass} mt-1 mr-3 flex-shrink-0`}></i>
      <div>
        <p className="font-semibold">{config.title}</p>
        <p className="text-sm">{summaryMessage}</p>
      </div>
    </div>
  );
};

export default BatchSummaryBanner;
