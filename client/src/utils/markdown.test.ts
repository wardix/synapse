import { describe, expect, it } from 'bun:test'
import { renderMarkdown } from './markdown'

describe('Markdown Utility', () => {
  it('should render basic markdown to HTML', async () => {
    const md = '# Hello World\n\nThis is a **test**.'
    const html = await renderMarkdown(md)
    expect(html).toContain('<h1>Hello World</h1>')
    expect(html).toContain('<p>This is a <strong>test</strong>.</p>')
  })

  it('should detect mermaid diagrams', async () => {
    const md = '```mermaid\ngraph TD;\nA-->B;\n```'
    const html = await renderMarkdown(md)
    expect(html).toContain('<div class="mermaid-block">')
    expect(html).toContain('graph TD;\nA-->B;')
  })

  it('should render inline math with katex', async () => {
    const md = 'This is math: $E=mc^2$'
    const html = await renderMarkdown(md)
    expect(html).toContain('<span class="katex">')
    expect(html).toContain('E=mc^2') // Inside katex string
  })

  it('should render block math with katex', async () => {
    const md = '$$\nE=mc^2\n$$'
    const html = await renderMarkdown(md)
    expect(html).toContain('<span class="katex-display">')
    expect(html).toContain('E=mc^2')
  })
})
