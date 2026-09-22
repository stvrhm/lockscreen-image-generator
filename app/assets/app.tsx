import { css, navigate, on, ref, type Handle, type MixInput } from 'remix/ui'
import { animateEntrance } from 'remix/ui/animation'
import input from 'remix/ui/input'
import * as popover from 'remix/ui/popover'
import { Option, Select } from 'remix/ui/select'
import { onSelectChange } from 'remix/ui/select/primitives'

import { cluster, flow, grid, region, sidebar, switcher, wrapper } from '../ui/cube/index.ts'
import { theme } from '../ui/theme.ts'

import {
  deleteDevice,
  duplicateDevice,
  listDevices,
  saveDevice,
  type Device,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
} from '../data/devices.ts'
import { hostDetails, measureHostExportSize } from '../data/host.ts'
import { parseMarkdownLines, type MarkdownSegment } from '../data/markdown.ts'
import { shortcutsFor } from '../data/shortcuts.ts'
import { downloadWallpaper, shareWallpaper } from '../data/wallpaper.ts'
import { strings } from '../strings.ts'
import { routes } from '../routes.ts'

// Screens owned by the browser route actions in `./controller.tsx`. Each one
// receives the data its route already resolved, so no screen inspects the
// location or decides which screen it is — that was the source of two screens
// rendering into the same document.

const NOTES_MAX_HEIGHT = 260
const TOOLTIP_DELAY = 750
const TOOLTIP_CLOSE_DELAY = 500

let tooltipWarmUntil = 0
let activeTooltipHide: ((skipExitAnimation?: boolean) => void) | undefined

/** Shown by the SPA runtime while the first route resolves. */
export function LoadingScreen() {
  return () => (
    <div mix={loadingStyle} role="status" aria-live="polite">
      <div mix={loadingMarkStyle} aria-hidden="true" />
      <div mix={loadingCopyStyle}>
        <p mix={loadingTitleStyle}>{strings.loading.title}</p>
        <p mix={mutedStyle}>{strings.loading.body}</p>
      </div>
    </div>
  )
}

/** Rendered by the browser router for a URL that matches no screen. */
export function NotFoundScreen() {
  return () => (
    <div mix={pageStyle}>
      <header mix={headerRowStyle}>
        <a href={routes.screens.home.href()} mix={ghostButtonStyle}>
          {strings.browse.back}
        </a>
        <h1 mix={headingStyle}>{strings.notFound.title}</h1>
      </header>
      <p mix={mutedStyle}>{strings.notFound.body}</p>
    </div>
  )
}

export function Home(handle: Handle<{ hasDraft: boolean }>) {
  return () => {
    let { hasDraft } = handle.props

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
          <a href={routes.screens.newDevice.href()} mix={[primaryButtonStyle, startButtonStyle]}>
            {strings.start.new}
          </a>
          {hasDraft ? (
            <a
              href={routes.screens.continueDevice.href()}
              mix={[secondaryButtonStyle, startButtonStyle]}
            >
              {strings.start.continue}
            </a>
          ) : null}
          <a
            href={routes.screens.browseDevices.href()}
            mix={[secondaryButtonStyle, startButtonStyle]}
          >
            {strings.start.browse}
          </a>
        </div>
        {hasDraft ? <p mix={hintStyle}>{strings.start.continueHint}</p> : null}
      </div>
    )
  }
}

export function BrowseDevices(handle: Handle<{ devices: Device[] }>) {
  let devices = handle.props.devices

  async function refresh() {
    devices = await listDevices()
    handle.update()
  }

  async function onDuplicate(device: Device) {
    let copy = await duplicateDevice(device)
    navigate(routes.screens.editDevice.href({ id: copy.id }))
  }

  async function onDelete(device: Device) {
    if (!window.confirm(strings.browse.confirmDelete)) return
    await deleteDevice(device.id)
    await refresh()
  }

  return () => {
    return (
      <div mix={pageStyle}>
        <header mix={headerRowStyle}>
          <a href={routes.screens.home.href()} mix={ghostButtonStyle}>
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
                    {device.platform.toUpperCase()} · {new Date(device.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div mix={actionsRowStyle}>
                  <a
                    href={routes.screens.editDevice.href({ id: device.id })}
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
}

export function Editor(handle: Handle<{ draft: Device; editingNew: boolean }>) {
  let draft = handle.props.draft
  let editingNew = handle.props.editingNew
  let statusMessage = ''
  let platformOverride = false
  let notesRef: HTMLTextAreaElement | null = null

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
    draft = { ...draft, ...patch }
    handle.update()
  }

  function insertShortcut(snippet: string) {
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
    if (!notesRef) return
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

  function resizeNotes() {
    if (!notesRef) return
    notesRef.style.height = 'auto'
    notesRef.style.height = `${Math.min(notesRef.scrollHeight, NOTES_MAX_HEIGHT)}px`
    notesRef.style.overflowY = notesRef.scrollHeight > NOTES_MAX_HEIGHT ? 'auto' : 'hidden'
  }

  async function onSave() {
    if (!draft.label.trim()) {
      statusMessage = 'Label is required'
      handle.update()
      return
    }
    let wasNew = editingNew
    draft = await saveDevice({ ...draft, label: draft.label.trim() })
    editingNew = false

    // A new Device only gets its id once saved, so move to its canonical URL.
    if (wasNew) {
      navigate(routes.screens.editDevice.href({ id: draft.id }), { history: 'replace' })
      return
    }
    statusMessage = strings.editor.saved
    handle.update()
  }

  async function onDownload() {
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

  return () => {
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
        <header mix={editorHeaderStyle}>
          <a href={routes.screens.home.href()} mix={ghostButtonStyle}>
            {strings.editor.back}
          </a>
          <h1 mix={headingStyle}>
            {editingNew ? strings.editor.titleNew : strings.editor.titleEdit}
          </h1>
        </header>

        <div mix={editorLayoutStyle}>
          <div mix={formStyle}>
            <div mix={fieldStyle}>
              <label htmlFor="device-label" mix={fieldLabelStyle}>
                {strings.editor.label}
              </label>
              <input
                id="device-label"
                name="label"
                type="text"
                value={device.label}
                autoFocus={editingNew}
                autoComplete="off"
                mix={[
                  inputStyle,
                  on('input', (event) => patchDraft({ label: event.currentTarget.value })),
                ]}
              />
            </div>

            <div mix={notesFieldStyle}>
              <div mix={notesCopyStyle}>
                <label htmlFor="device-notes" id="notes-label" mix={fieldLabelStyle}>
                  {strings.editor.notes}
                </label>
                <div id="notes-hint" mix={hintStyle}>
                  {strings.editor.notesHint}
                </div>
              </div>
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
                  id="device-notes"
                  name="notes"
                  rows={7}
                  value={device.notes}
                  aria-labelledby="notes-label"
                  aria-describedby="notes-hint"
                  mix={[
                    textareaStyle,
                    ref((node) => {
                      notesRef = node as HTMLTextAreaElement | null
                    }),
                    on('input', (event) => {
                      patchDraft({ notes: event.currentTarget.value })
                      handle.queueTask(resizeNotes)
                    }),
                  ]}
                />
              </div>
            </div>

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

            <div mix={mobilePreviewStyle}>
              <p mix={previewLabelStyle}>{strings.editor.preview}</p>
              <PhonePreview platform={device.platform} text={previewText} />
              <ExportSummary
                device={device}
                size={size}
                automatic={editingNew && !platformOverride}
              />
            </div>

            <details mix={advancedStyle}>
              <summary>{strings.editor.customizeExport}</summary>
              <div mix={advancedContentStyle}>
                <div mix={fieldStyle}>
                  <span mix={fieldLabelStyle}>{strings.editor.platform}</span>
                  <p mix={mutedStyle}>{strings.editor.platformInferred}</p>
                  {platformOverride ? (
                    <Select
                      defaultLabel={device.platform === 'ios' ? 'iOS' : 'Android'}
                      defaultValue={device.platform}
                      mix={[
                        platformSelectStyle,
                        onSelectChange((event) =>
                          patchDraft({ platform: event.value as Platform }),
                        ),
                      ]}
                    >
                      <Option label="iOS" value="ios">
                        iOS
                      </Option>
                      <Option label="Android" value="android">
                        Android
                      </Option>
                    </Select>
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

                <div mix={fieldStyle}>
                  <span mix={fieldLabelStyle}>{strings.editor.exportSize}</span>
                  <div mix={segmentStyle} role="group" aria-label={strings.editor.exportSize}>
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
                            input(),
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
                            input(),
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
                  <div mix={segmentStyle} role="group" aria-label={strings.editor.encoding}>
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
              </div>
            </details>

            <div mix={actionsRowStyle}>
              <button type="button" mix={[primaryButtonStyle, on('click', () => void onSave())]}>
                {editingNew ? strings.editor.create : strings.editor.save}
              </button>
              <button
                type="button"
                mix={[secondaryButtonStyle, on('click', () => void onDownload())]}
              >
                {strings.editor.download}
              </button>
              <button type="button" mix={[secondaryButtonStyle, on('click', () => void onShare())]}>
                {strings.editor.share}
              </button>
            </div>
            <p mix={hintStyle}>{strings.editor.applyHint}</p>
            {statusMessage ? (
              <p
                key={statusMessage}
                mix={[
                  statusStyle,
                  animateEntrance({
                    opacity: 0,
                    transform: 'translateY(4px)',
                    duration: 160,
                  }),
                ]}
              >
                {statusMessage}
              </p>
            ) : null}
          </div>

          <div mix={previewColumnStyle}>
            <p mix={previewLabelStyle}>{strings.editor.preview}</p>
            <PhonePreview platform={device.platform} text={previewText} />
            <ExportSummary
              device={device}
              size={size}
              automatic={editingNew && !platformOverride}
            />
          </div>
        </div>
      </div>
    )
  }
}

function SegmentButton(handle: Handle<{ active: boolean; label: string; onSelect: () => void }>) {
  return () => {
    let { active, label, onSelect } = handle.props
    return (
      <button
        type="button"
        mix={[segmentButtonStyle, active ? segmentActiveStyle : null, on('click', onSelect)]}
        aria-pressed={active}
      >
        {label}
      </button>
    )
  }
}

function FormatButton(handle: Handle<{ label: string; symbol: string; onSelect: () => void }>) {
  let visible = false
  let immediate = false
  let immediateExit = false
  let tooltipSurface: (HTMLElement & { hidePopover?: () => void }) | null = null
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let tooltipId = `format-tooltip-${handle.props.label.toLowerCase().replaceAll(' ', '-')}`

  function clearTimers() {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    showTimer = undefined
    hideTimer = undefined
  }

  function hide(skipExitAnimation = false) {
    clearTimers()
    immediateExit = skipExitAnimation
    visible = false
    tooltipSurface?.hidePopover?.()
    if (activeTooltipHide === hide) activeTooltipHide = undefined
    tooltipWarmUntil = Date.now() + TOOLTIP_CLOSE_DELAY
    handle.update()
  }

  function showImmediately(skipAnimation = false) {
    clearTimers()
    if (visible) return
    activeTooltipHide?.(true)
    immediate = skipAnimation
    immediateExit = false
    visible = true
    activeTooltipHide = hide
    tooltipWarmUntil = Date.now() + TOOLTIP_CLOSE_DELAY
    handle.update()
  }

  function showAfterHover() {
    clearTimers()
    let skipAnimation = tooltipWarmUntil > Date.now()
    let delay = skipAnimation ? 0 : TOOLTIP_DELAY
    showTimer = setTimeout(() => showImmediately(skipAnimation), delay)
  }

  function hideAfterHover() {
    clearTimers()
    hideTimer = setTimeout(hide, TOOLTIP_CLOSE_DELAY)
  }

  return () => {
    let { label, symbol, onSelect } = handle.props
    return (
      <popover.Context>
        <span
          mix={[
            tooltipTriggerStyle,
            popover.anchor({ placement: 'top', offset: 8 }),
            on('mouseenter', showAfterHover),
            on('mouseleave', hideAfterHover),
          ]}
        >
          <button
            type="button"
            aria-label={label}
            aria-describedby={tooltipId}
            mix={[
              formatButtonStyle,
              popover.focusOnHide(),
              on('click', onSelect),
              on('focus', () => showImmediately()),
              on('blur', () => hide()),
              on('pointerdown', () => hide()),
            ]}
          >
            {symbol}
          </button>
        </span>
        <span
          id={tooltipId}
          role="tooltip"
          mix={[
            tooltipStyle,
            immediate ? tooltipImmediateStyle : null,
            immediateExit ? tooltipImmediateExitStyle : null,
            ref((node) => {
              tooltipSurface = node as HTMLElement & { hidePopover?: () => void }
            }),
            popover.surface({
              open: visible,
              onHide: () => hide(),
              restoreFocusOnHide: false,
            }),
          ]}
        >
          {label}
        </span>
      </popover.Context>
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

function ExportSummary(
  handle: Handle<{
    device: Device
    size: { width: number; height: number }
    automatic: boolean
  }>,
) {
  return () => {
    let { device, size, automatic } = handle.props
    let exportStatus =
      device.exportSizeMode === 'auto'
        ? automatic
          ? strings.editor.detectedAutomatically
          : strings.editor.autoSize
        : strings.editor.customized
    return (
      <div mix={exportSummaryStyle}>
        <strong>
          {device.platform === 'ios' ? 'iOS' : 'Android'} · {size.width} × {size.height} px
        </strong>
        <span>
          {device.encoding === 'quality' ? 'PNG' : 'JPEG'} · {exportStatus}
        </span>
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
  wrapper({ gutter: theme.space.lg, maxWidth: '76rem' }),
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
    gap: theme.space.xs,
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
  fontSize: theme.fontSize.h3,
  fontWeight: theme.fontWeight.bold,
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
  fontSize: theme.fontSize.h2,
  fontWeight: theme.fontWeight.semibold,
  letterSpacing: '-0.02em',
})

const mutedStyle = css({
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
})

const hintStyle = css({
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
})

const statusStyle = css({
  color: 'var(--accent)',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.semibold,
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
  minHeight: '5.5rem',
  padding: `${theme.space.xs} ${theme.space.sm}`,
  background: 'rgba(17, 17, 19, 0.46)',
  border: '1px solid var(--border-subtle)',
  borderRadius: theme.radius.md,
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.025)',
  '@media (max-width: 560px)': { minHeight: 'auto' },
})

const stepNumberStyle = css({
  display: 'grid',
  placeItems: 'center',
  width: '1.625rem',
  height: '1.625rem',
  borderRadius: '50%',
  background: 'rgba(56, 189, 248, 0.14)',
  color: 'var(--accent)',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.bold,
})

const stepTextStyle = [
  flow({ flowSpace: theme.space.xs }),
  css({
    display: 'flex',
    flexDirection: 'column',
    fontSize: theme.fontSize.small,
    lineHeight: 1.35,
  }),
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

const editorHeaderStyle = [
  flow({ flowSpace: theme.space.sm }),
  css({
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  }),
]

const editorLayoutStyle = switcher({
  gutter: theme.space.xl,
  targetWidth: '52rem',
})

const formStyle = [
  flow({ flowSpace: theme.space.lg }),
  css({
    minWidth: '260px',
    paddingBlock: theme.space.xs,
  }),
]

const fieldStyle = [flow({ flowSpace: theme.space.xs })]

const notesFieldStyle = [flow({ flowSpace: theme.space.sm })]

const notesCopyStyle = [flow({ flowSpace: theme.space['3xs'] })]

const fieldLabelStyle = css({
  display: 'block',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.semibold,
  color: 'var(--text)',
})

const inputStyle = css({
  padding: `${theme.space.xs} ${theme.space.xs}`,
  borderRadius: theme.radius.sm,
  border: '1px solid var(--border)',
  background: 'rgba(10, 10, 11, 0.72)',
  color: 'var(--text)',
  transition: 'border-color 140ms ease, box-shadow 140ms ease',
  ':focus': {
    borderColor: 'var(--accent-strong)',
    boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.14)',
  },
})

const platformSelectStyle = css({
  width: '100%',
  minHeight: '2.75rem',
  justifyContent: 'space-between',
  padding: `${theme.space.xs} ${theme.space.xs}`,
  borderRadius: theme.radius.sm,
  border: '1px solid var(--border)',
  background: 'rgba(10, 10, 11, 0.72)',
  color: 'var(--text)',
  fontWeight: theme.fontWeight.medium,
  textAlign: 'start',
})

const textareaStyle = css({
  display: 'block',
  resize: 'vertical',
  minHeight: '5.75rem',
  maxHeight: `${NOTES_MAX_HEIGHT}px`,
  width: '100%',
  padding: `${theme.space.xs} ${theme.space.xs}`,
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
  borderRadius: theme.radius.md,
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
  width: '2.75rem',
  height: '2.625rem',
  display: 'inline-grid',
  placeItems: 'center',
  border: 0,
  borderRadius: '6px',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontWeight: theme.fontWeight.bold,
  cursor: 'pointer',
  ':hover': { background: 'var(--surface-2)', color: 'var(--text)' },
  ':focus-visible': {
    outline: '2px solid var(--accent)',
    outlineOffset: '1px',
  },
})

const tooltipTriggerStyle = css({
  position: 'relative',
  display: 'inline-flex',
})

const tooltipStyle = css({
  position: 'fixed',
  inset: 'auto',
  margin: 0,
  overflow: 'visible',
  padding: '5px 8px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'var(--shadow-soft)',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.medium,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  opacity: 0,
  transform: 'translateY(4px)',
  transition:
    'opacity 160ms ease-out, transform 160ms cubic-bezier(0.19, 1, 0.22, 1), overlay 160ms ease-out, display 160ms ease-out',
  transitionBehavior: 'allow-discrete',
  '&:popover-open': {
    opacity: 1,
    transform: 'translate(0, 0)',
  },
  '&:not(:popover-open)': {
    pointerEvents: 'none',
  },
  '&[data-anchor-placement^="bottom"]': {
    transform: 'translateY(-4px)',
  },
  '&[data-anchor-placement^="left"]': {
    transform: 'translateX(4px)',
  },
  '&[data-anchor-placement^="right"]': {
    transform: 'translateX(-4px)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '8px',
    height: '8px',
    left: '50%',
    bottom: '-5px',
    borderRight: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-3)',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="bottom"]::after': {
    top: '-5px',
    right: 'auto',
    bottom: 'auto',
    left: '50%',
    borderTop: '1px solid var(--border)',
    borderLeft: '1px solid var(--border)',
    borderRight: 0,
    borderBottom: 0,
    transform: 'translateX(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="left"]::after': {
    top: '50%',
    right: '-5px',
    bottom: 'auto',
    left: 'auto',
    borderTop: 0,
    borderLeft: 0,
    borderRight: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    transform: 'translateY(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="right"]::after': {
    top: '50%',
    right: 'auto',
    bottom: 'auto',
    left: '-5px',
    borderTop: '1px solid var(--border)',
    borderLeft: '1px solid var(--border)',
    borderRight: 0,
    borderBottom: 0,
    transform: 'translateY(-50%) rotate(45deg)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'opacity 160ms ease-out, overlay 160ms ease-out, display 160ms ease-out',
    transform: 'none',
    '&:popover-open': { transform: 'none' },
    '&[data-anchor-placement^="bottom"]': { transform: 'none' },
    '&[data-anchor-placement^="left"]': { transform: 'none' },
    '&[data-anchor-placement^="right"]': { transform: 'none' },
  },
})

const tooltipImmediateStyle = css({
  '&:popover-open': {
    transition: 'none',
  },
})

const tooltipImmediateExitStyle = css({
  '&:not(:popover-open)': {
    transition: 'none',
  },
})

const actionsRowStyle = [
  cluster({ gutter: theme.space.sm }),
  css({
    flexWrap: 'wrap',
    '@media (max-width: 560px)': {
      '& > :first-child': { flex: '1 1 100%' },
    },
  }),
]

const primaryButtonStyle = css({
  appearance: 'none',
  border: 0,
  borderRadius: theme.radius.sm,
  padding: `${theme.space.xs} ${theme.space.sm}`,
  fontWeight: theme.fontWeight.semibold,
  cursor: 'pointer',
  textDecoration: 'none',
  background: 'var(--text)',
  color: '#09090b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '2.875rem',
})

const secondaryButtonStyle = css({
  appearance: 'none',
  borderRadius: theme.radius.sm,
  padding: `${theme.space.xs} ${theme.space.sm}`,
  fontWeight: theme.fontWeight.semibold,
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
  minHeight: '40px',
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
  minHeight: '2.75rem',
  padding: `${theme.space['2xs']} ${theme.space.xs}`,
  fontWeight: theme.fontWeight.semibold,
  cursor: 'pointer',
})

const segmentActiveStyle = css({
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'inset 0 0 0 1px var(--border)',
})

const sizeInputsStyle = cluster({ gutter: '12px', alignment: 'stretch' })

const inlineFieldStyle = [
  flow({ flowSpace: theme.space['3xs'] }),
  css({
    display: 'flex',
    flexDirection: 'column',
    fontSize: theme.fontSize.small,
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
    padding: '8px 0 0',
    '@media (max-width: 52rem)': { display: 'none', position: 'static' },
  }),
]

const mobilePreviewStyle = css({
  display: 'none',
  '@media (max-width: 52rem)': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingBlock: theme.space['3xs'] + ' ' + theme.space.xs,
  },
})

const exportSummaryStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.space['3xs'],
  width: '100%',
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
  lineHeight: 1.35,
  textAlign: 'center',
  strong: { color: 'var(--text)', fontWeight: 600 },
})

const advancedStyle = css({
  borderBlock: '1px solid var(--border-subtle)',
  paddingBlock: theme.space.xs,
  '&[open] summary': { marginBottom: theme.space.sm },
})

const advancedContentStyle = [flow({ flowSpace: theme.space.lg }), css({ paddingInline: '2px' })]

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
  containerType: 'inline-size',
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
  padding: '8.7cqi 1.7cqi',
  color: '#fff',
  fontSize: '4.96cqi',
  lineHeight: 1.35,
  fontWeight: theme.fontWeight.semibold,
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
