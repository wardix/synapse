import * as DOMPurifyImport from 'dompurify'
import katex from 'katex'
import { marked } from 'marked'
import mermaid from 'mermaid'
import { createHighlighter } from 'shiki'

// biome-ignore lint/suspicious/noExplicitAny: library types
let highlighter: any = null

const initHighlighter = async () => {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: [
        'javascript',
        'typescript',
        'python',
        'sql',
        'bash',
        'json',
        'html',
        'css',
      ],
    })
  }
  return highlighter
}

mermaid.initialize({ startOnLoad: false, theme: 'dark' })

// Regex to match math blocks and inline math
// This is basic, might need fine-tuning for complex cases
const blockMathRegex = /\$\$([\s\S]*?)\$\$/g
const inlineMathRegex = /\$([^$\n]+?)\$/g

function renderMath(text: string) {
  let result = text

  result = result.replace(blockMathRegex, (match, p1) => {
    try {
      return katex.renderToString(p1, {
        displayMode: true,
        throwOnError: false,
      })
    } catch {
      return match
    }
  })

  result = result.replace(inlineMathRegex, (match, p1) => {
    try {
      return katex.renderToString(p1, {
        displayMode: false,
        throwOnError: false,
      })
    } catch {
      return match
    }
  })

  return result
}

export async function renderMarkdown(content: string): Promise<string> {
  // Pre-process math
  const processedContent = renderMath(content)

  const hl = await initHighlighter()

  const renderer = new marked.Renderer()

  // biome-ignore lint/suspicious/noExplicitAny: library types
  renderer.code = ((...args: any[]) => {
    const code = args[0]
    // If the new version of marked passes an object, handle it:
    let text = code?.text || code
    let lang = code?.lang || ''

    if (typeof code === 'string') {
      // old marked version signature fallback (just in case)
      text = args[0]
      lang = args[1] || ''
    }

    if (lang === 'mermaid') {
      return `<div class="mermaid-block">${text}</div>`
    }

    if (lang && hl.getLoadedLanguages().includes(lang)) {
      try {
        return hl.codeToHtml(text, { lang, theme: 'github-dark' })
      } catch {
        // fallback
      }
    }

    return `<pre><code>${text}</code></pre>`
    // biome-ignore lint/suspicious/noExplicitAny: library types
  }) as any

  marked.setOptions({ renderer })

  const rawHtml = await marked.parse(processedContent)

  const domPurify = typeof DOMPurifyImport === 'function' ? DOMPurifyImport : (DOMPurifyImport as any).default || DOMPurifyImport
  
  let sanitized = rawHtml
  if (domPurify && typeof domPurify.sanitize === 'function') {
    sanitized = domPurify.sanitize(rawHtml, {
      ADD_TAGS: [
        'math',
        'mrow',
        'mi',
        'mo',
        'mn',
        'ms',
        'mspace',
        'mtext',
        'menclose',
        'merror',
        'mpadded',
        'mphantom',
        'mroot',
        'msqrt',
        'msub',
        'msup',
        'msubsup',
        'mmultiscripts',
        'munder',
        'mover',
        'munderover',
        'mtable',
        'mtr',
        'mtd',
        'maligngroup',
        'malignmark',
        'annotation',
        'semantics',
        'svg',
        'path',
        'g',
        'circle',
        'rect',
        'line',
        'polygon',
        'polyline',
        'text',
        'tspan',
        'defs',
        'marker',
        'foreignObject',
      ],
      ADD_ATTR: [
        'display',
        'xmlns',
        'class',
        'style',
        'width',
        'height',
        'viewBox',
        'd',
        'transform',
        'fill',
        'stroke',
        'stroke-width',
        'cx',
        'cy',
        'r',
        'x',
        'y',
        'x1',
        'y1',
        'x2',
        'y2',
        'points',
        'marker-end',
        'preserveAspectRatio',
      ],
    })
  }

  return sanitized
}

export async function renderMermaidDiagrams(container: HTMLElement) {
  const elements = container.querySelectorAll('.mermaid-block')
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement
    if (!el.dataset.rendered) {
      try {
        const id = `mermaid-${Date.now()}-${i}`
        const { svg } = await mermaid.render(id, el.textContent || '')
        el.innerHTML = svg
        el.dataset.rendered = 'true'
      } catch (err) {
        console.error('Mermaid render error', err)
      }
    }
  }
}
