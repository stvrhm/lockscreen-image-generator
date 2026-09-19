import { clientEntry, css, on, ref, type Handle, type MixInput } from 'remix/ui'

import { cluster, flow, grid, region, sidebar, switcher, wrapper } from '../ui/cube/index.ts'
import { theme } from '../ui/theme.ts'

import {
  blankDevice,
  deleteDevice,
  duplicateDevice,
  findDevice,
  getLastDraft,
  listDevices,
  saveDevice,
  type Device,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
} from '../data/devices.ts'
import { hostDetails, inferPlatform, measureHostExportSize } from '../data/host.ts'
import { parseMarkdownLines, type MarkdownSegment } from '../data/markdown.ts'
import { shortcutsFor } from '../data/shortcuts.ts'
import { downloadWallpaper, shareWallpaper } from '../data/wallpaper.ts'
import { strings } from '../strings.ts'
import { routes } from '../routes.ts'
import type { AppRoute } from '../ui/app-shell.tsx'

interface AppProps extends Record<string, string | undefined> {
  route: string
  deviceId?: string
}

function routeForLocation(fallback: AppRoute): AppRoute {
  if (typeof window === 'undefined') return fallback
  let path = window.location.pathname
  if (path === routes.newDevice.href()) return 'new'
  if (path === routes.continueDevice.href()) return 'continue'
  if (path === routes.browseDevices.href()) return 'browse'
  if (/^\/devices\/[^/]+\/edit$/.test(path)) return 'edit'
  return 'start'
}

function deviceIdForLocation(): string | undefined {
  if (typeof window === 'undefined') return undefined
  let match = window.location.pathname.match(/^\/devices\/([^/]+)\/edit$/)
  return match?.[1]
}

export const App = clientEntry(import.meta.url, function App(handle: Handle<AppProps>) {
  let props = handle.props
  let ready = false
  let devices: Device[] = []
  let draft: Device | null = null
  let hasDraft = false
  let loadError = ''
  let statusMessage = ''
  let platformOverride = false
  let editingNew = false
  let notesRef: HTMLTextAreaElement | null = null

  handle.queueTask(async () => {
    try {
      let route = routeForLocation(props.route as AppRoute)
      if (route === 'new') {
        let size = hostSize()
        draft = blankDevice(inferPlatform(), size.width, size.height)
        editingNew = true
      } else if (route === 'continue') {
        draft = (await getLastDraft()) ?? null
        if (!draft) {
          window.location.replace(routes.home.href())
          return
        }
        editingNew = false
      } else if (route === 'edit') {
        let deviceId = props.deviceId ?? deviceIdForLocation()
        draft = deviceId ? ((await findDevice(deviceId)) ?? null) : null
        if (!draft) {
          window.location.replace(routes.browseDevices.href())
          return
        }
        editingNew = false
      } else {
        await refresh()
      }
      ready = true
    } catch (error) {
      console.error('Failed to load local Devices', error)
      loadError = 'Local storage is unavailable. Reload the app or disable private browsing.'
    }
    handle.update()
  })

  async function refresh() {
    devices = await listDevices()
    let last = await getLastDraft()
    draft = last ?? null
    hasDraft = Boolean(last)
  }

  function hostSize() {
    return measureHostExportSize()
  }

  function resolvedSize(device: Device) {
    if (device.exportSizeMode === 'custom') {
      return {
        width: Math.max(1, device.customWidth || 1),
        height: Math.max(1, device.customHeight || 1),
      }
    }
    return hostSize()
  }

  function patchDraft(patch: Partial<Device>) {
    if (!draft) return
    draft = { ...draft, ...patch }
    handle.update()
  }

  function insertShortcut(snippet: string) {
    if (!draft) return
    let el = notesRef
    let notes = draft.notes
    if (el && typeof el.selectionStart === 'number') {
      let start = el.selectionStart
      let end = el.selectionEnd
      let next = notes.slice(0, start) + snippet + notes.slice(end)
      draft = { ...draft, notes: next }
      handle.update()
      handle.queueTask(() => {
        if (!notesRef) return
        let pos = start + snippet.length
        notesRef.focus()
        notesRef.setSelectionRange(pos, pos)
      })
      return
    }
    let prefix = notes && !notes.endsWith('\n') && notes.length > 0 ? '\n' : ''
    draft = { ...draft, notes: notes + prefix + snippet }
    handle.update()
  }

  function applyFormatting(marker: string) {
    if (!draft || !notesRef) return
    let el = notesRef
    let start = el.selectionStart
    let end = el.selectionEnd
    let notes = draft.notes
    let selected = notes.slice(start, end)
    let replacement = selected ? `${marker}${selected}${marker}` : `${marker}${marker}`
    draft = { ...draft, notes: notes.slice(0, start) + replacement + notes.slice(end) }
    handle.update()
    handle.queueTask(() => {
      if (!notesRef) return
      notesRef.focus()
      let nextStart = selected ? start + replacement.length : start + marker.length
      let nextEnd = selected ? nextStart : nextStart + marker.length
      notesRef.setSelectionRange(nextStart, nextEnd)
    })
  }

  async function onSave() {
    if (!draft) return
    if (!draft.label.trim()) {
      statusMessage = 'Label is required'
      handle.update()
      return
    }
    let wasNew = editingNew
    draft = await saveDevice({ ...draft, label: draft.label.trim() })
    editingNew = false
    if (wasNew) {
      window.location.assign(routes.editDevice.href({ id: draft.id }))
      return
    }
    statusMessage = strings.editor.saved
    await refresh()
    handle.update()
  }

  async function onDownload() {
    if (!draft) return
    let size = resolvedSize(draft)
    await downloadWallpaper({
      label: draft.label,
      notes: draft.notes,
      width: size.width,
      height: size.height,
      encoding: draft.encoding,
    })
  }

  async function onShare() {
    if (!draft) return
    let size = resolvedSize(draft)
    let result = await shareWallpaper({
      label: draft.label,
      notes: draft.notes,
      width: size.width,
      height: size.height,
      encoding: draft.encoding,
    })
    if (result === 'unsupported') {
      statusMessage = 'Share unavailable — use Download'
      handle.update()
    }
  }

  async function onDuplicate(device: Device) {
    let copy = await duplicateDevice(device)
    window.location.assign(routes.editDevice.href({ id: copy.id }))
  }

  async function onDelete(device: Device) {
    if (!window.confirm(strings.browse.confirmDelete)) return
    await deleteDevice(device.id)
    await refresh()
    handle.update()
  }

  return () => {
    let route = routeForLocation(props.route as AppRoute)

    if (!ready) {
      return (
        <div mix={loadingStyle} role="status" aria-live="polite">
          <div mix={loadingMarkStyle} aria-hidden="true" />
          <div mix={loadingCopyStyle}>
            <p mix={loadingTitleStyle}>{strings.loading.title}</p>
            <p mix={mutedStyle}>{strings.loading.body}</p>
          </div>
        </div>
      )
    }

    if (loadError) {
      return <div mix={pageStyle}>{loadError}</div>
    }

    if (route === 'browse') {
      return (
        <div mix={pageStyle}>
          <header mix={headerRowStyle}>
            <a href={routes.home.href()} data-rmx-document mix={ghostButtonStyle}>
              {strings.browse.back}
            </a>
            <h1 mix={headingStyle}>{strings.browse.title}</h1>
          </header>
          {devices.length === 0 ? (
            <p mix={mutedStyle}>{strings.browse.empty}</p>
          ) : (
            <ul mix={listStyle}>
              {devices.map((device) => (
                <li key={device.id} mix={listItemStyle}>
                  <div mix={listMainStyle}>
                    <strong>{device.label || 'Untitled'}</strong>
                    <span mix={mutedStyle}>
                      {device.platform.toUpperCase()} ·{' '}
                      {new Date(device.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div mix={actionsRowStyle}>
                    <a
                      href={routes.editDevice.href({ id: device.id })}
                      data-rmx-document
                      mix={secondaryButtonStyle}
                    >
                      {strings.browse.edit}
                    </a>
                    <button
                      type="button"
                      mix={[secondaryButtonStyle, on('click', () => void onDuplicate(device))]}
                    >
                      {strings.browse.duplicate}
                    </button>
                    <button
                      type="button"
                      mix={[dangerButtonStyle, on('click', () => void onDelete(device))]}
                    >
                      {strings.browse.delete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }

    if ((route === 'new' || route === 'continue' || route === 'edit') && draft) {
      let device = draft
      let size = resolvedSize(device)
      let previewText = device.notes.trim() || device.label.trim() || 'Notes preview'
      let host = hostDetails()
      let shortcuts = shortcutsFor({
        width: size.width,
        height: size.height,
        pixelRatio: host.pixelRatio,
        detectedOS: host.detectedOS,
      })

      return (
        <div mix={pageStyle}>
          <header mix={headerRowStyle}>
            <a href={routes.home.href()} data-rmx-document mix={ghostButtonStyle}>
              {strings.editor.back}
            </a>
            <h1 mix={headingStyle}>
              {editingNew ? strings.editor.titleNew : strings.editor.titleEdit}
            </h1>
          </header>

          <div mix={editorLayoutStyle}>
            <div mix={formStyle}>
              <label mix={fieldStyle}>
                <span mix={fieldLabelStyle}>{strings.editor.label}</span>
                <input
                  type="text"
                  value={device.label}
                  autoFocus={editingNew}
                  autoComplete="off"
                  mix={[
                    inputStyle,
                    on('input', (event) => patchDraft({ label: event.currentTarget.value })),
                  ]}
                />
              </label>

              <div mix={fieldStyle}>
                <span mix={fieldLabelStyle}>{strings.editor.platform}</span>
                <p mix={mutedStyle}>
                  {strings.editor.platformInferred}: {device.platform.toUpperCase()}
                </p>
                {platformOverride ? (
                  <select
                    value={device.platform}
                    mix={[
                      inputStyle,
                      on('change', (event) => {
                        let value = event.currentTarget.value === 'android' ? 'android' : 'ios'
                        patchDraft({ platform: value as Platform })
                      }),
                    ]}
                  >
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                  </select>
                ) : (
                  <button
                    type="button"
                    mix={[
                      linkButtonStyle,
                      on('click', () => {
                        platformOverride = true
                        handle.update()
                      }),
                    ]}
                  >
                    {strings.editor.platformOverride}
                  </button>
                )}
              </div>

              <label mix={fieldStyle}>
                <span mix={fieldLabelStyle}>{strings.editor.notes}</span>
                <span mix={hintStyle}>{strings.editor.notesHint}</span>
                <div mix={composerStyle}>
                  <div mix={toolbarStyle} role="toolbar" aria-label={strings.editor.formatting}>
                    <FormatButton
                      label={strings.editor.bold}
                      symbol="B"
                      onSelect={() => applyFormatting('**')}
                    />
                    <FormatButton
                      label={strings.editor.italic}
                      symbol="I"
                      onSelect={() => applyFormatting('*')}
                    />
                    <FormatButton
                      label={strings.editor.strike}
                      symbol="S"
                      onSelect={() => applyFormatting('~~')}
                    />
                    <FormatButton
                      label={strings.editor.code}
                      symbol="<>"
                      onSelect={() => applyFormatting('`')}
                    />
                  </div>
                  <textarea
                    rows={7}
                    value={device.notes}
                    aria-label={strings.editor.notes}
                    mix={[
                      textareaStyle,
                      ref((node) => {
                        notesRef = node as HTMLTextAreaElement | null
                      }),
                      on('input', (event) => patchDraft({ notes: event.currentTarget.value })),
                    ]}
                  />
                </div>
              </label>

              <div mix={fieldStyle}>
                <span mix={fieldLabelStyle}>{strings.editor.shortcuts}</span>
                <div mix={chipRowStyle}>
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut.id}
                      type="button"
                      mix={[chipStyle, on('click', () => insertShortcut(shortcut.insert))]}
                    >
                      {shortcut.label}
                    </button>
                  ))}
                </div>
              </div>

              <div mix={fieldStyle}>
                <span mix={fieldLabelStyle}>{strings.editor.exportSize}</span>
                <div mix={segmentStyle}>
                  <SegmentButton
                    active={device.exportSizeMode === 'auto'}
                    label={strings.editor.exportSizeAuto}
                    onSelect={() => patchDraft({ exportSizeMode: 'auto' as ExportSizeMode })}
                  />
                  <SegmentButton
                    active={device.exportSizeMode === 'custom'}
                    label={strings.editor.exportSizeCustom}
                    onSelect={() => {
                      let auto = hostSize()
                      patchDraft({
                        exportSizeMode: 'custom',
                        customWidth: device.customWidth || auto.width,
                        customHeight: device.customHeight || auto.height,
                      })
                    }}
                  />
                </div>
                {device.exportSizeMode === 'auto' ? (
                  <p mix={mutedStyle}>
                    {size.width} × {size.height}px
                  </p>
                ) : (
                  <div mix={sizeInputsStyle}>
                    <label mix={inlineFieldStyle}>
                      {strings.editor.width}
                      <input
                        type="number"
                        min={1}
                        value={device.customWidth}
                        mix={[
                          inputStyle,
                          on('input', (event) =>
                            patchDraft({
                              customWidth: Number.parseInt(event.currentTarget.value, 10) || 1,
                            }),
                          ),
                        ]}
                      />
                    </label>
                    <label mix={inlineFieldStyle}>
                      {strings.editor.height}
                      <input
                        type="number"
                        min={1}
                        value={device.customHeight}
                        mix={[
                          inputStyle,
                          on('input', (event) =>
                            patchDraft({
                              customHeight: Number.parseInt(event.currentTarget.value, 10) || 1,
                            }),
                          ),
                        ]}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div mix={fieldStyle}>
                <span mix={fieldLabelStyle}>{strings.editor.encoding}</span>
                <div mix={segmentStyle}>
                  <SegmentButton
                    active={device.encoding === 'quality'}
                    label={strings.editor.encodingQuality}
                    onSelect={() => patchDraft({ encoding: 'quality' as ExportEncoding })}
                  />
                  <SegmentButton
                    active={device.encoding === 'size'}
                    label={strings.editor.encodingSize}
                    onSelect={() => patchDraft({ encoding: 'size' as ExportEncoding })}
                  />
                </div>
                <p mix={mutedStyle}>
                  {device.encoding === 'quality'
                    ? strings.editor.encodingQualityHint
                    : strings.editor.encodingSizeHint}
                </p>
              </div>

              <div mix={actionsRowStyle}>
                <button type="button" mix={[primaryButtonStyle, on('click', () => void onSave())]}>
                  {strings.editor.save}
                </button>
                <button
                  type="button"
                  mix={[secondaryButtonStyle, on('click', () => void onDownload())]}
                >
                  {strings.editor.download}
                </button>
                <button
                  type="button"
                  mix={[secondaryButtonStyle, on('click', () => void onShare())]}
                >
                  {strings.editor.share}
                </button>
              </div>
              <p mix={hintStyle}>{strings.editor.applyHint}</p>
              {statusMessage ? <p mix={statusStyle}>{statusMessage}</p> : null}
            </div>

            <div mix={previewColumnStyle}>
              <p mix={previewLabelStyle}>{strings.editor.preview}</p>
              <PhonePreview platform={device.platform} text={previewText} />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div mix={pageStyle}>
        <header mix={startHeaderStyle}>
          <p mix={eyebrowStyle}>{strings.appShortName}</p>
          <h1 mix={titleStyle}>{strings.start.title}</h1>
          <p mix={mutedStyle}>{strings.start.subtitle}</p>
        </header>

        <ol mix={onboardingStepsStyle} aria-label="How it works">
          {strings.start.steps.map((step, index) => (
            <li
              key={step.title}
              mix={[
                sidebar({ gutter: theme.space.md, direction: 'stack-to-row' }),
                onboardingStepStyle,
              ]}
            >
              <span mix={stepNumberStyle}>{index + 1}</span>
              <span mix={stepTextStyle}>
                <strong>{step.title}</strong>
                <span mix={hintStyle}>{step.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <div mix={startActionsStyle}>
          <a
            href={routes.newDevice.href()}
            data-rmx-document
            mix={[primaryButtonStyle, startButtonStyle]}
          >
            {strings.start.new}
          </a>
          {hasDraft ? (
            <a
              href={routes.continueDevice.href()}
              data-rmx-document
              mix={[secondaryButtonStyle, startButtonStyle]}
            >
              {strings.start.continue}
            </a>
          ) : null}
          <a
            href={routes.browseDevices.href()}
            data-rmx-document
            mix={[secondaryButtonStyle, startButtonStyle]}
          >
            {strings.start.browse}
          </a>
        </div>
        {hasDraft ? <p mix={hintStyle}>{strings.start.continueHint}</p> : null}
      </div>
    )
  }
})

function SegmentButton(handle: Handle<{ active: boolean; label: string; onSelect: () => void }>) {
  return () => {
    let { active, label, onSelect } = handle.props
    return (
      <button
        type="button"
        mix={[segmentButtonStyle, active ? segmentActiveStyle : null, on('click', onSelect)]}
      >
        {label}
      </button>
    )
  }
}

function FormatButton(handle: Handle<{ label: string; symbol: string; onSelect: () => void }>) {
  return () => {
    let { label, symbol, onSelect } = handle.props
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        mix={[formatButtonStyle, on('click', onSelect)]}
      >
        {symbol}
      </button>
    )
  }
}

function PhonePreview(handle: Handle<{ platform: Platform; text: string }>) {
  return () => {
    let { platform, text } = handle.props
    let lines = parseMarkdownLines(text)
    return (
      <div mix={phoneFrameStyle}>
        <div mix={phoneScreenStyle}>
          {platform === 'ios' ? <div mix={notchStyle} /> : <div mix={punchHoleStyle} />}
          <div mix={previewTextStyle}>
            {lines.map((segments, lineIndex) => (
              <div key={lineIndex}>
                {segments.every((segment) => segment.text === '')
                  ? ' '
                  : segments.map((segment, segmentIndex) => (
                      <MarkdownSpan key={segmentIndex} segment={segment} />
                    ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
}

function MarkdownSpan(handle: Handle<{ segment: MarkdownSegment }>) {
  return () => {
    let { segment } = handle.props
    let classes: MixInput[] = []
    if (segment.bold) classes.push(markdownBoldStyle)
    if (segment.italic) classes.push(markdownItalicStyle)
    if (segment.strike) classes.push(markdownStrikeStyle)
    if (segment.code) classes.push(markdownCodeStyle)
    return <span mix={classes}>{segment.text}</span>
  }
}

const pageStyle = [
  wrapper({ gutter: theme.space.lg, maxWidth: '68rem' }),
  region(theme.space.lg),
  flow({ flowSpace: '24px' }),
]

const loadingStyle = [
  wrapper({ gutter: theme.space.lg, maxWidth: '52rem' }),
  css({
    minHeight: 'min(70dvh, 32rem)',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: '16px',
    textAlign: 'center',
  }),
]

const loadingMarkStyle = css({
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  border: '3px solid rgba(94, 184, 255, 0.2)',
  borderTopColor: 'var(--accent)',
  animation: 'loading-spin 0.85s linear infinite',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
})

const loadingCopyStyle = flow({ flowSpace: theme.space.xs })

const loadingTitleStyle = css({
  fontSize: '18px',
  fontWeight: 700,
})

const startHeaderStyle = [flow({ flowSpace: theme.space.sm }), css({ maxWidth: '42rem' })]

const eyebrowStyle = css({
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
})

const titleStyle = css({
  fontSize: 'clamp(34px, 7vw, 52px)',
  fontFamily: 'var(--font-display)',
  letterSpacing: '-0.045em',
  lineHeight: 1.04,
})

const headingStyle = css({
  fontSize: '24px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
})

const mutedStyle = css({
  color: 'var(--text-muted)',
  fontSize: '14px',
})

const hintStyle = css({
  color: 'var(--text-muted)',
  fontSize: '13px',
})

const statusStyle = css({
  color: 'var(--accent)',
  fontSize: '14px',
  fontWeight: 600,
})

const startActionsStyle = [
  switcher({ gutter: theme.space.md, targetWidth: '32rem' }),
  css({ maxWidth: '42rem' }),
]

const onboardingStepsStyle = [
  grid({ gutter: theme.space.sm, minItemSize: '14rem' }),
  css({ listStyle: 'none', padding: 0 }),
]

const onboardingStepStyle = css({
  minHeight: '138px',
  padding: '18px',
  background: 'rgba(17, 17, 19, 0.72)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  '@media (max-width: 560px)': { minHeight: 'auto' },
})

const stepNumberStyle = css({
  display: 'grid',
  placeItems: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  background: 'rgba(56, 189, 248, 0.14)',
  color: 'var(--accent)',
  fontSize: '13px',
  fontWeight: 800,
})

const stepTextStyle = [
  flow({ flowSpace: theme.space.xs }),
  css({ display: 'flex', flexDirection: 'column', fontSize: '14px', lineHeight: 1.35 }),
]

const startButtonStyle = css({
  width: '100%',
  minHeight: '48px',
  justifyContent: 'center',
})

const headerRowStyle = [
  cluster({ gutter: theme.space.md }),
  css({
    alignItems: 'baseline',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  }),
]

const editorLayoutStyle = sidebar({
  gutter: 'clamp(20px, 3vw, 40px)',
  sidebarWidth: 'min(34rem, 100%)',
})

const formStyle = [
  flow({ flowSpace: theme.space.lg }),
  css({
    minWidth: '260px',
    padding: 'clamp(16px, 2.5vw, 24px)',
    background: 'rgba(17, 17, 19, 0.76)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-soft)',
  }),
]

const fieldStyle = [
  flow({ flowSpace: theme.space.xs }),
  css({ display: 'flex', flexDirection: 'column' }),
]

const fieldLabelStyle = css({
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--text)',
})

const inputStyle = css({
  padding: '12px 13px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'rgba(10, 10, 11, 0.72)',
  color: 'var(--text)',
  transition: 'border-color 140ms ease, box-shadow 140ms ease',
  ':focus': {
    borderColor: 'var(--accent-strong)',
    boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.14)',
  },
})

const textareaStyle = css({
  resize: 'vertical',
  minHeight: '120px',
  width: '100%',
  padding: '12px 13px',
  border: 0,
  borderTop: '1px solid var(--border)',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--text)',
  lineHeight: 1.55,
  outline: 'none',
})

const composerStyle = css({
  overflow: 'hidden',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  background: 'rgba(10, 10, 11, 0.72)',
  ':focus-within': {
    borderColor: 'var(--accent-strong)',
    boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.14)',
  },
})

const toolbarStyle = [
  cluster({ gutter: '2px', alignment: 'center' }),
  css({ padding: '6px', background: 'rgba(255, 255, 255, 0.035)' }),
]

const formatButtonStyle = css({
  appearance: 'none',
  width: '30px',
  height: '28px',
  display: 'inline-grid',
  placeItems: 'center',
  border: 0,
  borderRadius: '6px',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontWeight: 700,
  cursor: 'pointer',
  ':hover': { background: 'var(--surface-2)', color: 'var(--text)' },
  ':focus-visible': {
    outline: '2px solid var(--accent)',
    outlineOffset: '1px',
  },
})

const actionsRowStyle = cluster({ gutter: theme.space.sm })

const primaryButtonStyle = css({
  appearance: 'none',
  border: 0,
  borderRadius: '9px',
  padding: '11px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  background: 'var(--text)',
  color: '#09090b',
  display: 'inline-flex',
  alignItems: 'center',
})

const secondaryButtonStyle = css({
  appearance: 'none',
  borderRadius: '9px',
  padding: '11px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  display: 'inline-flex',
  alignItems: 'center',
})

const ghostButtonStyle = css({
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'var(--accent)',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  padding: '4px 0',
})

const linkButtonStyle = css({
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'var(--accent)',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  alignSelf: 'flex-start',
  textDecoration: 'underline',
})

const dangerButtonStyle = css({
  appearance: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid var(--danger)',
  color: 'var(--danger)',
})

const chipRowStyle = cluster({ gutter: '8px' })

const chipStyle = css({
  appearance: 'none',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  borderRadius: '999px',
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
})

const segmentStyle = css({
  display: 'flex',
  gap: '0',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  background: 'var(--surface)',
  overflow: 'hidden',
  width: 'fit-content',
})

const segmentButtonStyle = css({
  appearance: 'none',
  border: 0,
  background: 'var(--surface)',
  color: 'var(--text-muted)',
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
})

const segmentActiveStyle = css({
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'inset 0 0 0 1px var(--border)',
})

const sizeInputsStyle = cluster({ gutter: '12px', alignment: 'stretch' })

const inlineFieldStyle = [
  flow({ flowSpace: '4px' }),
  css({
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12px',
    color: 'var(--text-muted)',
    flex: '1 1 120px',
  }),
]

const listStyle = [flow({ flowSpace: theme.space.md }), css({ listStyle: 'none', padding: 0 })]

const listItemStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '18px',
  background: 'rgba(17, 17, 19, 0.78)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
})

const listMainStyle = flow({ flowSpace: theme.space.xs })

const previewColumnStyle = [
  css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    flex: '0 0 auto',
    alignSelf: 'flex-start',
    position: 'sticky',
    top: '24px',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(17, 17, 19, 0.58)',
    boxShadow: 'var(--shadow-soft)',
    '@media (max-width: 800px)': { position: 'static' },
  }),
]

const previewLabelStyle = css({
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
})

const phoneFrameStyle = css({
  width: '224px',
  height: '484px',
  padding: '10px',
  borderRadius: '48px',
  background: '#0b0c0e',
  boxShadow: '0 24px 50px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.08)',
})

const phoneScreenStyle = css({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '38px',
  overflow: 'hidden',
  background: '#15171b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const notchStyle = css({
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90px',
  height: '22px',
  borderRadius: '0 0 14px 14px',
  background: '#000',
})

const punchHoleStyle = css({
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  background: '#000',
})

const previewTextStyle = css({
  padding: '32px 20px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  textAlign: 'center',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
})

const markdownBoldStyle = css({ fontWeight: 800 })
const markdownItalicStyle = css({ fontStyle: 'italic' })
const markdownStrikeStyle = css({ textDecoration: 'line-through' })
const markdownCodeStyle = css({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontWeight: 400,
  background: 'rgba(255, 255, 255, 0.16)',
  borderRadius: '4px',
  padding: '1px 5px',
})
