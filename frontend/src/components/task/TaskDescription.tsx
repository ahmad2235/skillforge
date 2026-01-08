import React from "react";
import { SafeHTML } from "../common/SafeHTML";

interface Props {
  description?: string | null;
  className?: string;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function TaskDescription({ description, className }: Props) {
  if (!description) return <p className={className}>No description provided.</p>;

  // Preprocess formatting tokens to improve readability in the UI
  // - Convert numbered parenthesis lists like "(1) ... (2) ..." into line-start lists "1. ...\n2. ..."
  // - Ensure "Requirements:" starts on its own line
  let pre = description.replace(/Requirements:\s*/gi, "Requirements:\n");
  pre = pre.replace(/\(\s*(\d+)\s*\)\s*/g, "\n$1. ");

  // Normalize line endings
  const text = pre.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  let html = "";
  let inUl = false;
  let inOl = false;
  let inPre = false;
  let preBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    const joined = paraBuffer.join(" ").trim();
    if (joined) {
      // preserve single line breaks as <br>
      const withBreaks = escapeHtml(joined).replace(/\n/g, "<br />");
      html += `<p>${withBreaks}</p>`;
    }
    paraBuffer = [];
  };

  const flushPre = () => {
    if (!inPre) return;
    const inner = preBuffer.map((l) => escapeHtml(l)).join("\n");
    html += `<pre class=\"rounded-md bg-slate-900/60 p-3 text-sm text-slate-200 overflow-auto\"><code>${inner}</code></pre>`;
    preBuffer = [];
    inPre = false;
  };

  const flushLists = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
    if (inOl) {
      html += "</ol>";
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/^\s+|\s+$/g, "");

    // Code fence detection (```)
    if (line.startsWith("```") ) {
      // toggle pre
      if (inPre) {
        flushPre();
      } else {
        flushPara();
        flushLists();
        inPre = true;
      }
      continue;
    }

    if (inPre) {
      preBuffer.push(raw);
      continue;
    }

    // Ordered list (lines starting with 1.  2. etc)
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    const ulMatch = line.match(/^[-*]\s+(.*)$/);

    if (olMatch) {
      flushPara();
      if (!inOl) {
        flushLists();
        html += "<ol class=\"pl-5\">";
        inOl = true;
      }
      html += `<li>${escapeHtml(olMatch[1])}</li>`;
      continue;
    }

    if (ulMatch) {
      flushPara();
      if (!inUl) {
        flushLists();
        html += "<ul class=\"pl-5\">";
        inUl = true;
      }
      html += `<li>${escapeHtml(ulMatch[1])}</li>`;
      continue;
    }

    // Blank line: paragraph break
    if (line === "") {
      flushPara();
      flushLists();
      continue;
    }

    // Default: accumulate paragraph lines
    paraBuffer.push(line);
  }

  // flush any remaining buffers
  flushPre();
  flushLists();
  flushPara();

  // Show a collapsed preview for very long descriptions
  const shouldCollapse = text.length > 400 || text.split(/\n{2,}/).length > 2;
  const [collapsed, setCollapsed] = React.useState(shouldCollapse);

  return (
    <div>
      <div className={collapsed ? "line-clamp-3 overflow-hidden" : ""}>
        <SafeHTML html={html} className={className} />
      </div>
      {shouldCollapse && (
        <div className="mt-2">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Show more" : "Show less"}
          </button>
        </div>
      )}
    </div>
  );
}
