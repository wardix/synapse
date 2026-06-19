import { useEffect, useRef, useState } from 'react'
import { renderMarkdown, renderMermaidDiagrams } from '../utils/markdown'
import 'katex/dist/katex.min.css'
import './markdown-renderer.css'

export function MarkdownRenderer({
  content,
  className = '',
}: {
  content: string
  className?: string
}) {
  const [html, setHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    renderMarkdown(content)
      .then((res) => {
        if (isMounted) {
          setHtml(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Markdown rendering error', err)
        if (isMounted) {
          setHtml('<p>Error rendering content</p>')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [content])

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      renderMermaidDiagrams(containerRef.current)
    }
  }, [isLoading])

  return (
    <div
      ref={containerRef}
      className={`markdown-renderer ${className} ${isLoading ? 'loading' : ''}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered content
      dangerouslySetInnerHTML={{
        __html: html || (isLoading ? '<p>Loading...</p>' : ''),
      }}
    />
  )
}
