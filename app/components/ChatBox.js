"use client";

import { useState } from "react";

export default function ChatBox({ messages, onQuery, isReady }) {
  const [input, setInput] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const query = input.trim();
    if (!query) {
      return;
    }
    onQuery(query);
    setInput("");
  };

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minHeight: "420px",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              backgroundColor:
                message.role === "user" ? "#1d4ed8" : "#e2e8f0",
              color: message.role === "user" ? "#f8fafc" : "#0f172a",
              padding: "0.75rem 1rem",
              borderRadius: "1rem",
              maxWidth: "80%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {message.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.75rem" }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            isReady
              ? "Ask for data from the uploaded workbook..."
              : "Upload a workbook first..."
          }
          disabled={!isReady && messages.length > 0}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "9999px",
            border: "1px solid #cbd5f5",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!isReady}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "9999px",
            border: "none",
            backgroundColor: isReady ? "#1d4ed8" : "#94a3b8",
            color: "#f8fafc",
            fontWeight: 600,
            cursor: isReady ? "pointer" : "not-allowed",
          }}
        >
          Send
        </button>
      </form>
    </section>
  );
}