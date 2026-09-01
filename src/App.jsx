import { useId, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import {
  Copy,
  DownloadSimple,
  QrCode,
} from '@phosphor-icons/react'

const SIZES = [128, 256, 320, 512]
const LEVELS = [
  { id: 'L', label: 'L', hint: '7%' },
  { id: 'M', label: 'M', hint: '15%' },
  { id: 'Q', label: 'Q', hint: '25%' },
  { id: 'H', label: 'H', hint: '30%' },
]

const QR_BYTE_LIMIT = 2953

function classifyContent(value) {
  const trimmed = value.trim()
  if (!trimmed) return { kind: 'empty', label: 'Waiting' }
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { kind: 'url', label: 'URL' }
    }
  } catch {
    /* not a URL */
  }
  return { kind: 'text', label: 'Text' }
}

function downloadBlob(filename, blob) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  URL.revokeObjectURL(href)
}

export default function App() {
  const [value, setValue] = useState('https://google.com')
  const [size, setSize] = useState(256)
  const [level, setLevel] = useState('M')
  const [feedback, setFeedback] = useState('')
  const canvasWrapRef = useRef(null)
  const svgExportRef = useRef(null)
  const contentId = useId()
  const previewId = useId()

  const content = value.trim()
  const byteLength = useMemo(
    () => new TextEncoder().encode(content).length,
    [content],
  )
  const meta = classifyContent(value)
  const overLimit = byteLength > QR_BYTE_LIMIT
  const nearLimit = !overLimit && byteLength > QR_BYTE_LIMIT * 0.85
  const canGenerate = Boolean(content) && !overLimit

  const status = overLimit
    ? { tone: 'error', label: 'Too large' }
    : canGenerate
      ? { tone: 'ready', label: 'Ready' }
      : { tone: '', label: 'Waiting' }

  function handleGenerate(event) {
    event.preventDefault()
    if (!canGenerate) {
      setFeedback(
        overLimit
          ? 'Content exceeds QR capacity. Shorten the text.'
          : 'Enter a URL or some text first.',
      )
      return
    }
    document.getElementById(previewId)?.scrollIntoView({ block: 'nearest' })
    setFeedback('QR code updated.')
  }

  function handleDownloadPng() {
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas || !canGenerate) return
    canvas.toBlob((blob) => {
      if (!blob) return
      downloadBlob('qr-code.png', blob)
      setFeedback('Downloaded PNG.')
    })
  }

  function handleDownloadSvg() {
    const svg = svgExportRef.current?.querySelector('svg')
    if (!svg || !canGenerate) return
    const source = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    downloadBlob('qr-code.svg', blob)
    setFeedback('Downloaded SVG.')
  }

  async function handleCopy() {
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas || !canGenerate) return
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve))
      if (!blob) return
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setFeedback('Copied image to clipboard.')
    } catch {
      setFeedback('Clipboard copy is not available in this browser.')
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href={`#${contentId}`}>
        Skip to content
      </a>

      <header className="header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="QR Generator home">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="brand-name">QR Generator</span>
          </a>
          <nav className="nav" aria-label="Page">
            <button
              type="button"
              className="nav-btn"
              onClick={() => document.getElementById(contentId)?.focus()}
            >
              Content
            </button>
            <button
              type="button"
              className="nav-btn"
              onClick={() =>
                document.getElementById(previewId)?.scrollIntoView({
                  block: 'nearest',
                })
              }
            >
              Preview
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>Generate a QR code</h1>
          <p>
            Paste a URL or any text. The code updates as you type, then download
            PNG or SVG.
          </p>
        </section>

        <div className="layout">
          <section className="panel" aria-labelledby="input-heading">
            <div className="panel-header">
              <h2 className="panel-title" id="input-heading">
                Input
              </h2>
              <div className="status">
                <span className={`status-dot ${status.tone}`} aria-hidden="true" />
                {status.label}
              </div>
            </div>

            <form className="form" onSubmit={handleGenerate}>
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor={contentId}>Content</label>
                  <span
                    className={`hint${overLimit ? ' error' : nearLimit ? ' warn' : ''}`}
                  >
                    {byteLength} / {QR_BYTE_LIMIT} bytes
                  </span>
                </div>
                <textarea
                  id={contentId}
                  name="content"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    setFeedback('')
                  }}
                  placeholder="https://example.com"
                  spellCheck="false"
                  autoComplete="off"
                  inputMode="url"
                  aria-describedby="content-hint"
                />
                <p id="content-hint" className="hint">
                  URLs, plain text, or any string a scanner should open.
                </p>
              </div>

              <div className="controls">
                <div className="field">
                  <span className="field-label" id="size-label">
                    Size
                  </span>
                  <div className="pills" role="group" aria-labelledby="size-label">
                    {SIZES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="pill"
                        aria-pressed={size === option}
                        onClick={() => setSize(option)}
                      >
                        {option}px
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <span className="field-label" id="level-label">
                    Error correction
                  </span>
                  <div className="pills" role="group" aria-labelledby="level-label">
                    {LEVELS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="pill"
                        aria-pressed={level === option.id}
                        onClick={() => setLevel(option.id)}
                        title={`${option.label} recovers about ${option.hint}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadPng}
                  disabled={!canGenerate}
                >
                  <DownloadSimple size={16} weight="regular" aria-hidden="true" />
                  Download PNG
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadSvg}
                  disabled={!canGenerate}
                >
                  <DownloadSimple size={16} weight="regular" aria-hidden="true" />
                  Download SVG
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  disabled={!canGenerate}
                >
                  <Copy size={16} weight="regular" aria-hidden="true" />
                  Copy image
                </button>
              </div>

              <p className="feedback" role="status" aria-live="polite">
                {feedback}
              </p>
            </form>
          </section>

          <section
            className="panel"
            id={previewId}
            aria-labelledby="preview-heading"
          >
            <div className="panel-header">
              <h2 className="panel-title" id="preview-heading">
                Preview
              </h2>
              <div className="status">
                <span
                  className={`status-dot ${canGenerate ? 'ready' : ''}`}
                  aria-hidden="true"
                />
                {canGenerate ? 'Live' : 'Empty'}
              </div>
            </div>

            <div className="preview">
              {canGenerate ? (
                <div className="qr-frame">
                  <QRCodeSVG
                    value={content}
                    size={256}
                    level={level}
                    marginSize={2}
                    title={`QR code for ${content}`}
                  />
                </div>
              ) : (
                <div className="empty">
                  <QrCode size={28} weight="regular" aria-hidden="true" />
                  <p>
                    {overLimit
                      ? 'Shorten the content to fit inside a QR code.'
                      : 'Enter a URL or text to generate a QR code.'}
                  </p>
                </div>
              )}
            </div>

            {canGenerate ? (
              <div className="meta">
                <span className="badge">{meta.label}</span>
                <span className="badge">{size}px</span>
                <span className="badge">ECC {level}</span>
              </div>
            ) : null}

            <div className="hidden-canvas" aria-hidden="true">
              {canGenerate ? (
                <>
                  <div ref={canvasWrapRef}>
                    <QRCodeCanvas
                      value={content}
                      size={size}
                      level={level}
                      marginSize={2}
                    />
                  </div>
                  <div ref={svgExportRef}>
                    <QRCodeSVG
                      value={content}
                      size={size}
                      level={level}
                      marginSize={2}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>QR codes encode the exact string you enter.</span>
          <span>No data is sent to a server.</span>
        </div>
      </footer>
    </div>
  )
}
