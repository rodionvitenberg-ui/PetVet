'use client';

import React from 'react';

// ponytail: minimal markdown renderer (~70 lines), no react-markdown dep.
// Covers 99% of LLM output: headings, bold, italic, inline code, code blocks,
// lists, links, blockquotes. Tables intentionally not supported yet.

function inline(text: string, key = 0): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = key * 1000;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(<span key={i++}>{text.slice(last, m.index)}</span>);
    if (m[2]) nodes.push(<strong key={i++}>{m[2]}</strong>);
    else if (m[3]) nodes.push(<em key={i++}>{m[3]}</em>);
    else if (m[4]) nodes.push(<code key={i++} className="bg-muted px-1.5 py-0.5 rounded text-[0.85em]">{m[4]}</code>);
    else if (m[5] && m[6]) nodes.push(<a key={i++} href={m[6]} target="_blank" rel="noopener noreferrer" className="underline text-primary">{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<span key={i++}>{text.slice(last)}</span>);
  return nodes;
}

export default function Markdown({ content }: { content: string }) {
  // Split code blocks first, keep everything else.
  const parts = content.split(/```([\s\S]*?)```/g);
  const nodes: React.ReactNode[] = [];

  for (let p = 0; p < parts.length; p++) {
    if (p % 2 === 1) {
      // code block
      nodes.push(
        <pre key={p} className="bg-muted border border-border rounded-xl p-3 my-2 overflow-x-auto text-sm">
          <code>{parts[p].replace(/^[a-z]+\n/, '')}</code>
        </pre>,
      );
      continue;
    }

    const blockText = parts[p];
    const lines = blockText.split('\n');
    const blockNodes: React.ReactNode[] = [];
    let ulItems: string[] = [];

    const flushList = () => {
      if (ulItems.length > 0) {
        blockNodes.push(
          <ul key={`ul-${blockNodes.length}`} className="list-disc pl-5 my-1">
            {ulItems.map((text, idx) => <li key={idx}>{inline(text, idx)}</li>)}
          </ul>,
        );
        ulItems = [];
      }
    };

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      const trimmed = line.trim();

      if (/^#{1,6}\s/.test(trimmed)) {
        flushList();
        const level = trimmed.match(/^(#{1,6})/)?.[1].length || 1;
        const H = `h${level}` as React.ElementType;
        blockNodes.push(<H key={l} className={`font-bold my-1 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>{inline(trimmed.replace(/^#{1,6}\s/, ''), l)}</H>);
      } else if (/^>\s?/.test(trimmed)) {
        flushList();
        blockNodes.push(<blockquote key={l} className="border-l-2 border-primary/40 pl-3 my-1 text-muted-foreground">{inline(trimmed.replace(/^>\s?/, ''), l)}</blockquote>);
      } else if (trimmed === '') {
        flushList();
        if (blockNodes.length > 0 && l > 0 && lines[l - 1].trim() !== '') {
          blockNodes.push(<br key={l} />);
        }
      } else if (/^[-*]\s/.test(trimmed)) {
        ulItems.push(trimmed.replace(/^[-*]\s/, ''));
      } else if (/^\d+\.\s/.test(trimmed)) {
        flushList();
        blockNodes.push(<div key={l} className="flex gap-2 my-0.5"><span className="text-muted-foreground shrink-0">{trimmed.match(/^\d+/)?.[0]}.</span><span>{inline(trimmed.replace(/^\d+\.\s/, ''), l)}</span></div>);
      } else {
        flushList();
        blockNodes.push(<p key={l} className="my-1">{inline(line, l)}</p>);
      }
    }
    flushList();

    nodes.push(<div key={`b-${p}`}>{blockNodes}</div>);
  }

  return <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{nodes}</div>;
}