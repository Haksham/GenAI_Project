"use client";

import { useState } from "react";

export default function FileUpload({ onDataLoaded }) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/workbooks", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to upload workbook.");
      }

      const payload = await response.json();
      onDataLoaded(payload);
    } catch (err) {
      console.error(err);
      setError(err.message ?? "Failed to upload workbook.");
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  };

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ fontWeight: 600 }}>Upload Excel Workbook</div>
      <label
        htmlFor="excel-upload"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          borderRadius: "9999px",
          background: isUploading ? "#94a3b8" : "#0f172a",
          color: "#f8fafc",
          cursor: isUploading ? "not-allowed" : "pointer",
          fontWeight: 500,
          width: "fit-content",
        }}
      >
        {isUploading ? "Uploading..." : "Choose file"}
      </label>
      <input
        id="excel-upload"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        style={{ display: "none" }}
        disabled={isUploading}
      />
      {fileName && (
        <span style={{ fontSize: "0.9rem", color: "#475569" }}>{fileName}</span>
      )}
      {error && (
        <span style={{ fontSize: "0.9rem", color: "#b91c1c" }}>{error}</span>
      )}
    </section>
  );
}