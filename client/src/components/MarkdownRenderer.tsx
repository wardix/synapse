export function MarkdownRenderer({ content }: { content: string }) {
  // A very simple markdown-ish renderer for now.
  const paragraphs = content.split('\n\n')

  return (
    <div className="markdown-content">
      {paragraphs.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: simple renderer
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}
