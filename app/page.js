"use client";

import { useCallback, useState } from "react";
import FileUpload from "./components/FileUpload";
import ChatBox from "./components/ChatBox";

export default function Home() {
  const [workbook, setWorkbook] = useState(null);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Upload an Excel workbook to begin." },
  ]);

  const handleDataLoaded = useCallback(
    ({ workbookId, fileName, sheetNames }) => {
      setWorkbook({ id: workbookId, fileName, sheetNames });
      setMessages([
        {
          role: "bot",
          text: `Loaded ${sheetNames.length} sheet(s) from ${fileName}. Ask for the rows you need.`,
        },
      ]);
    },
    []
  );

  const handleQuery = useCallback(
    async (query) => {
      setMessages((prev) => [...prev, { role: "user", text: query }]);

      if (!workbook?.id) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Please upload an Excel workbook before submitting queries.",
          },
        ]);
        return;
      }

      try {
        const response = await fetch(`/api/workbooks/${workbook.id}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to query workbook.");
        }

        const { matches, total, summary } = await response.json();

        const fallback =
          matches?.length > 0
            ? `Found ${total} matching row(s).`
            : "I couldn't find any matching rows.";
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: summary?.trim() || fallback },
        ]);
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: error.message ?? "Failed to search workbook.",
          },
        ]);
      }
    },
    [workbook]
  );

  return (
    <main
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", fontWeight: 600 }}>Excel Chatbot</h1>
      <FileUpload onDataLoaded={handleDataLoaded} />
      <ChatBox
        messages={messages}
        onQuery={handleQuery}
        isReady={Boolean(workbook?.id)}
      />
    </main>
  );
}
