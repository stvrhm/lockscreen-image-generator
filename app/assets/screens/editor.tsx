import { css, navigate, on, ref, type Handle } from 'remix/component'

import { cluster, flow, repel, switcher } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import {
  saveDevice,
  listDevices,
  normalizeDeviceLabel,
  subscribeToDeviceChanges,
  DeviceLabelConflictError,
  type Device,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
} from '../../data/devices.ts'
import {
  MAX_CUSTOM_DIMENSION,
  customDimensionIssue,
  safePreviewDimensions,
  type CustomDimensionIssue,
} from '../../data/device-dimensions.ts'
import { measureHostExportSize } from '../../data/host.ts'
import { downloadWallpaper, shareWallpaper, type WallpaperOptions } from '../../data/wallpaper.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { Badge } from '../../ui/badge.tsx'
import { Button } from '../../ui/button.tsx'
import { toast } from '../../ui/toast.tsx'
import { ConfirmationDialog } from '../../ui/confirmation-dialog.tsx'
import {
  inlineFormatActive,
  toggleInlineFormat,
  type InlineFormat,
} from '../editor/format-notes.ts'
import { headingPressed, setHeading } from '../editor/set-heading.ts'
import { ExportSummary } from '../editor/export-summary.tsx'
import { FormatButton } from '../editor/format-button.tsx'
import { FormattingHelpButton } from '../editor/formatting-help-button.tsx'
import { insertLines } from '../editor/insert-lines.ts'
import { guardEditorNavigation, type PendingNavigation } from '../editor/navigation-guard.ts'
import { PhoneInfoButton } from '../editor/phone-info-button.tsx'
import { PhonePreview } from '../editor/phone-preview.tsx'
import { SegmentButton } from '../editor/segment-button.tsx'
import {
  mutedStyle,
  pageStyle,
  headingStyle,
  hintStyle,
  actionsRowStyle,
} from '../../ui/screen-styles.ts'

const NOTES_MAX_HEIGHT = 260

export function Editor(
  handle: Handle<{
    draft: Device
    devices: Device[]
    editingNew: boolean
  }>,
) {
  let draft = handle.props.draft
  let savedDevices = handle.props.devices
  let editingNew = handle.props.editingNew
  let baseline: Device = { ...draft }
  let labelError = ''
  let leaveDialogOpen = false
  let pendingNavigation: PendingNavigation | null = null
  let dialogReturnFocus: HTMLElement | null = null
  let navigationGuard: ReturnType<typeof guardEditorNavigation> | null = null
  let headingRef: HTMLHeadingElement | null = null
  let labelRef: HTMLInputElement | null = null
  let selectLabelOnPointerFocus = false
  let platformOverride = false
  let notesRef: HTMLTextAreaElement | null = null
  let notesFocused = false
  // Until Notes has been focused or edited, there is no meaningful cursor to
  // reflect in the formatting toolbar. Starting at 0 made a prefilled H1 look
  // pressed as soon as the new-device screen opened.
  let notesSelection: { start: number; end: number } | null = null

  function isDirty() {
    return (
      draft.label !== baseline.label ||
      draft.platform !== baseline.platform ||
      draft.notes !== baseline.notes ||
      draft.exportSizeMode !== baseline.exportSizeMode ||
      draft.customWidth !== baseline.customWidth ||
      draft.customHeight !== baseline.customHeight ||
      draft.encoding !== baseline.encoding
    )
  }

  function requestLeave() {
    if (!isDirty()) {
      navigate(routes.screens.home.href())
      return
    }
    dialogReturnFocus = document.activeElement as HTMLElement | null
    pendingNavigation = { url: routes.screens.home.href(), key: '', type: 'push' }
    leaveDialogOpen = true
    handle.update()
  }

  handle.queueTask(() => {
    headingRef?.focus()
    navigationGuard = guardEditorNavigation({
      isDirty,
      onRequest(destination) {
        dialogReturnFocus = document.activeElement as HTMLElement | null
        pendingNavigation = destination
        leaveDialogOpen = true
        handle.update()
      },
    })
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    let unsubscribeDeviceChanges = subscribeToDeviceChanges(() => {
      void listDevices().then((devices) => {
        savedDevices = devices
        handle.update()
      })
    })
    handle.signal.addEventListener('abort', () => {
      navigationGuard?.dispose()
      window.removeEventListener('beforeunload', onBeforeUnload)
      unsubscribeDeviceChanges()
    })
  })

  handle.queueTask(() => {
    document.addEventListener(
      'selectionchange',
      () => {
        if (!notesRef || document.activeElement !== notesRef) return
        let start = notesRef.selectionStart
        let end = notesRef.selectionEnd
        if (notesSelection && start === notesSelection.start && end === notesSelection.end) return
        notesSelection = { start, end }
        handle.update()
      },
      { signal: handle.signal },
    )
  })
  function hostSize() {
    return measureHostExportSize()
  }

  function resolvedSize(device: Device) {
    if (device.exportSizeMode === 'custom') {
      if (customDimensionIssue(device.customWidth, device.customHeight)) {
        return safePreviewDimensions(hostSize())
      }
      return {
        width: device.customWidth,
        height: device.customHeight,
      }
    }
    return hostSize()
  }

  function dimensionIssueMessage(issue: CustomDimensionIssue): string {
    return strings.editor.dimensionIssues[issue]
  }

  function dimensionInputValue(value: string) {
    return value === '' ? Number.NaN : Number(value)
  }

  function customDimensionsValid() {
    return customDimensionIssue(draft.customWidth, draft.customHeight) === null
  }

  function patchDraft(patch: Partial<Device>) {
    draft = { ...draft, ...patch }
    if (patch.label !== undefined) labelError = ''
    handle.update()
  }

  /** Inserts whole Notes lines at the cursor, then returns focus to Notes. */
  function insertAtCursor(lines: string) {
    let end = draft.notes.length
    let selection = notesRef
      ? { start: notesRef.selectionStart, end: notesRef.selectionEnd }
      : { start: end, end }
    let next = insertLines({ text: draft.notes, ...selection }, lines)
    draft = { ...draft, notes: next.text }
    notesSelection = { start: next.start, end: next.end }
    handle.update()
    handle.queueTask(() => {
      resizeNotes()
      if (!notesRef) return
      notesRef.focus()
      notesRef.setSelectionRange(next.start, next.end)
    })
  }

  function armNotesSelection() {
    if (!notesRef) return
    notesSelection = { start: notesRef.selectionStart, end: notesRef.selectionEnd }
  }

  function notesEdit() {
    if (notesRef && document.activeElement === notesRef) {
      return {
        text: draft.notes,
        start: notesRef.selectionStart,
        end: notesRef.selectionEnd,
      }
    }
    let selection = notesSelection ?? { start: 0, end: 0 }
    return { text: draft.notes, ...selection }
  }

  function applyNotesEdit(next: { text: string; start: number; end: number }) {
    draft = { ...draft, notes: next.text }
    notesSelection = { start: next.start, end: next.end }
    notesFocused = true
    handle.update()
    handle.queueTask(() => {
      if (!notesRef) return
      notesRef.focus()
      notesRef.setSelectionRange(next.start, next.end)
    })
  }

  function isHeadingPressed(level: 1 | 2) {
    return (
      notesFocused &&
      notesSelection !== null &&
      headingPressed(draft.notes, notesSelection.start, notesSelection.end, level)
    )
  }

  function isInlineFormatPressed(format: InlineFormat) {
    return (
      notesFocused &&
      notesSelection !== null &&
      inlineFormatActive(draft.notes, notesSelection.start, notesSelection.end, format)
    )
  }

  function applyFormatting(format: InlineFormat) {
    applyNotesEdit(toggleInlineFormat(notesEdit(), format))
  }

  function applyHeading(level: 1 | 2) {
    applyNotesEdit(setHeading(notesEdit(), level))
  }

  function resizeNotes() {
    if (!notesRef) return
    notesRef.style.height = 'auto'
    notesRef.style.height = `${Math.min(notesRef.scrollHeight, NOTES_MAX_HEIGHT)}px`
    notesRef.style.overflowY = notesRef.scrollHeight > NOTES_MAX_HEIGHT ? 'auto' : 'hidden'
  }

  function validateLabel() {
    let label = draft.label.trim()
    let normalized = normalizeDeviceLabel(label)
    if (!normalized) {
      labelError = strings.editor.labelRequired
    } else {
      let conflict = savedDevices.some(
        (device) => device.id !== draft.id && normalizeDeviceLabel(device.label) === normalized,
      )
      let unchangedLegacyDuplicate = !editingNew && draft.label === baseline.label
      labelError = conflict && !unchangedLegacyDuplicate ? strings.editor.labelConflict : ''
    }
    if (!labelError) return true
    handle.update()
    handle.queueTask(() => labelRef?.focus())
    return false
  }

  async function storeDevice() {
    let wasNew = editingNew
    let savedLabel =
      !editingNew && draft.label === baseline.label ? draft.label : draft.label.trim()
    try {
      draft = await saveDevice(
        { ...draft, label: savedLabel },
        { allowUnchangedDuplicate: !editingNew && draft.label === baseline.label },
      )
    } catch (error) {
      if (!(error instanceof DeviceLabelConflictError)) throw error
      labelError = strings.editor.labelConflict
      handle.update()
      handle.queueTask(() => labelRef?.focus())
      return false
    }
    savedDevices = [draft, ...savedDevices.filter((device) => device.id !== draft.id)]
    baseline = { ...draft }
    editingNew = false
    handle.update()

    // A new Device only gets its id once saved, so move to its canonical URL.
    // It is still the same screen to the user, so keep their scroll position.
    if (wasNew) {
      let href = routes.screens.editDevice.href({ id: draft.id })
      navigationGuard?.updateCurrentUrl(href)
      navigate(href, {
        history: 'replace',
        resetScroll: false,
      })
    }
    return true
  }

  function wallpaperOptions(): WallpaperOptions {
    let size = resolvedSize(draft)
    return {
      label: draft.label,
      notes: draft.notes,
      width: size.width,
      height: size.height,
      encoding: draft.encoding,
    }
  }

  async function onSaveDevice() {
    if (!customDimensionsValid()) return
    if (!validateLabel()) return
    if (!(await storeDevice())) return
    toast({ title: strings.editor.deviceSaved, variant: 'success' })
  }

  async function onSaveToPhotos() {
    if (!customDimensionsValid()) return
    if (!validateLabel()) return
    let options = wallpaperOptions()
    // Share before touching IndexedDB: the share sheet needs the tap's user
    // activation, and Safari drops it if other async work runs first.
    let result = await shareWallpaper(options)
    // Dismissing the share sheet backs out of the whole action.
    if (result === 'cancelled') return
    let downloaded = result === 'unsupported' && (await downloadWallpaper(options))
    if (!(await storeDevice())) return

    if (downloaded) {
      toast({
        title: strings.editor.imageDownloaded,
        description: strings.editor.imageDownloadedHint,
        variant: 'success',
      })
    } else if (result === 'failed' || result === 'unsupported') {
      toast({ title: strings.editor.imageFailed, variant: 'error' })
    } else {
      toast({ title: strings.editor.deviceSaved, variant: 'success' })
    }
  }

  async function onDownload() {
    if (!customDimensionsValid()) return
    let downloaded = await downloadWallpaper(wallpaperOptions())
    if (!downloaded) toast({ title: strings.editor.imageFailed, variant: 'error' })
  }

  async function resolveLeave(decision: 'stay' | 'discard' | 'save') {
    if (decision === 'stay') {
      leaveDialogOpen = false
      pendingNavigation = null
      handle.update()
      handle.queueTask(() => dialogReturnFocus?.focus())
      return
    }
    if (decision === 'save' && !validateLabel()) {
      leaveDialogOpen = false
      pendingNavigation = null
      handle.update()
      return
    }
    if (decision === 'save' && !(await storeDevice())) {
      leaveDialogOpen = false
      pendingNavigation = null
      handle.update()
      return
    } else baseline = { ...draft }
    let destination = pendingNavigation
    leaveDialogOpen = false
    pendingNavigation = null
    handle.update()
    if (!destination) return
    if (destination.type === 'traverse' && destination.key && window.navigation) {
      window.navigation.traverseTo(destination.key)
    } else if (destination.type === 'fallback-back') {
      history.back()
    } else {
      navigate(destination.url)
    }
  }

  return () => {
    let device = draft
    let dimensionIssue = customDimensionIssue(device.customWidth, device.customHeight)
    let size = resolvedSize(device)
    let previewText = device.notes.trim() || device.label.trim() || 'Notes preview'

    return (
      <div mix={pageStyle}>
        <header mix={editorHeaderStyle}>
          <div mix={headerRowStyle}>
            <Button variant="ghost" onClick={requestLeave}>
              {strings.editor.back}
            </Button>
            {editingNew ? <Badge>{strings.editor.draft}</Badge> : null}
          </div>
          <h1
            aria-label={device.label}
            tabIndex={-1}
            mix={[
              headingStyle,
              editableHeadlineStyle,
              ref((node) => {
                headingRef = node as HTMLHeadingElement | null
              }),
            ]}
          >
            <input
              id="device-label"
              name="label"
              type="text"
              aria-label={strings.editor.label}
              aria-invalid={labelError ? 'true' : undefined}
              aria-describedby={labelError ? 'device-label-error' : undefined}
              value={device.label}
              autoComplete="off"
              style={{
                appearance: 'none',
                width: '100%',
                minWidth: '10ch',
                padding: 0,
                border: 0,
                borderRadius: 0,
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                lineHeight: 'inherit',
                boxShadow: 'none',
              }}
              mix={[
                ref((node) => {
                  labelRef = node as HTMLInputElement | null
                }),
                on('input', (event) => patchDraft({ label: event.currentTarget.value })),
                on('pointerdown', (event) => {
                  selectLabelOnPointerFocus = document.activeElement !== event.currentTarget
                }),
                on('focus', (event) => {
                  if (!selectLabelOnPointerFocus) return
                  selectLabelOnPointerFocus = false
                  event.currentTarget.select()
                }),
              ]}
            />
          </h1>
        </header>

        <div mix={editorLayoutStyle}>
          <div mix={formStyle}>
            {labelError ? (
              <p id="device-label-error" role="alert" mix={labelErrorStyle}>
                {labelError}
              </p>
            ) : null}

            <div mix={notesFieldStyle}>
              <div mix={notesLabelStyle}>
                <label htmlFor="device-notes" id="notes-label" mix={fieldLabelStyle}>
                  {strings.editor.notes}
                </label>
                <FormattingHelpButton />
              </div>
              <div mix={composerStyle}>
                <div mix={toolbarStyle} role="toolbar" aria-label={strings.editor.formatting}>
                  <FormatButton
                    label={strings.editor.bold}
                    symbol="B"
                    pressed={isInlineFormatPressed('bold')}
                    onSelect={() => applyFormatting('bold')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.italic}
                    symbol="I"
                    pressed={isInlineFormatPressed('italic')}
                    onSelect={() => applyFormatting('italic')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.strike}
                    symbol="S"
                    pressed={isInlineFormatPressed('strike')}
                    onSelect={() => applyFormatting('strike')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.code}
                    symbol="<>"
                    pressed={isInlineFormatPressed('code')}
                    onSelect={() => applyFormatting('code')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.h1}
                    symbol={strings.editor.h1}
                    pressed={isHeadingPressed(1)}
                    onSelect={() => applyHeading(1)}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.h2}
                    symbol={strings.editor.h2}
                    pressed={isHeadingPressed(2)}
                    onSelect={() => applyHeading(2)}
                    onArm={armNotesSelection}
                  />
                  <PhoneInfoButton onAdd={insertAtCursor} />
                </div>
                <textarea
                  id="device-notes"
                  name="notes"
                  rows={7}
                  value={device.notes}
                  aria-labelledby="notes-label"
                  mix={[
                    textareaStyle,
                    ref((node) => {
                      notesRef = node as HTMLTextAreaElement | null
                    }),
                    on('input', (event) => {
                      patchDraft({ notes: event.currentTarget.value })
                      armNotesSelection()
                      handle.queueTask(resizeNotes)
                    }),
                    on('focus', () => {
                      notesFocused = true
                      armNotesSelection()
                      handle.update()
                    }),
                    on('blur', () => {
                      armNotesSelection()
                      notesFocused = false
                      handle.update()
                    }),
                  ]}
                />
              </div>
            </div>

            <div mix={mobilePreviewStyle}>
              <p mix={previewLabelStyle}>{strings.editor.preview}</p>
              <PhonePreview platform={device.platform} text={previewText} size={size} />
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
                    <select
                      aria-label={strings.editor.platform}
                      value={device.platform}
                      style={{ background: 'transparent' }}
                      mix={[
                        platformSelectStyle,
                        on('change', (event) =>
                          patchDraft({ platform: event.currentTarget.value as Platform }),
                        ),
                      ]}
                    >
                      <option value="ios">iOS</option>
                      <option value="android">Android</option>
                    </select>
                  ) : (
                    <Button
                      variant="link"
                      onClick={() => {
                        platformOverride = true
                        handle.update()
                      }}
                    >
                      {strings.editor.platformOverride}
                    </Button>
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
                  {device.exportSizeMode === 'auto' && (
                    <p mix={mutedStyle}>
                      {size.width} × {size.height}px
                    </p>
                  )}
                  {(device.exportSizeMode === 'custom' || dimensionIssue !== null) && (
                    <div mix={sizeInputsStyle}>
                      <label mix={inlineFieldStyle}>
                        {strings.editor.width}
                        <input
                          type="number"
                          min={1}
                          max={MAX_CUSTOM_DIMENSION}
                          value={device.customWidth}
                          style={{ background: 'transparent' }}
                          mix={[
                            inputStyle,
                            on('input', (event) =>
                              patchDraft({
                                customWidth: dimensionInputValue(event.currentTarget.value),
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
                          max={MAX_CUSTOM_DIMENSION}
                          value={device.customHeight}
                          style={{ background: 'transparent' }}
                          mix={[
                            inputStyle,
                            on('input', (event) =>
                              patchDraft({
                                customHeight: dimensionInputValue(event.currentTarget.value),
                              }),
                            ),
                          ]}
                        />
                      </label>
                    </div>
                  )}
                  {dimensionIssue !== null && (
                    <p role="alert" mix={mutedStyle}>
                      {dimensionIssueMessage(dimensionIssue)}
                    </p>
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
              <Button
                variant="primary"
                disabled={dimensionIssue !== null}
                onClick={() => void onSaveToPhotos()}
              >
                {strings.editor.saveToPhotos}
              </Button>
              <Button
                variant="secondary"
                disabled={dimensionIssue !== null}
                onClick={() => void onSaveDevice()}
              >
                {strings.editor.saveDevice}
              </Button>
              <Button
                variant="secondary"
                disabled={dimensionIssue !== null}
                onClick={() => void onDownload()}
              >
                {strings.editor.download}
              </Button>
            </div>
            <p mix={hintStyle}>
              {device.platform === 'ios'
                ? strings.editor.applyHintIOS
                : strings.editor.applyHintAndroid}
            </p>
          </div>

          <div mix={previewColumnStyle}>
            <p mix={previewLabelStyle}>{strings.editor.preview}</p>
            <PhonePreview platform={device.platform} text={previewText} size={size} />
            <ExportSummary
              device={device}
              size={size}
              automatic={editingNew && !platformOverride}
            />
          </div>
        </div>
        <ConfirmationDialog
          id="leave-confirmation"
          open={leaveDialogOpen}
          title={strings.editor.leaveTitle}
          description={strings.editor.leaveDescription}
          onDismiss={() => void resolveLeave('stay')}
        >
          <Button variant="secondary" onClick={() => void resolveLeave('stay')}>
            {strings.editor.keepEditing}
          </Button>
          <Button variant="destructive" onClick={() => void resolveLeave('discard')}>
            {strings.editor.discardChanges}
          </Button>
          <Button variant="primary" onClick={() => void resolveLeave('save')}>
            {strings.editor.saveDevice}
          </Button>
        </ConfirmationDialog>
      </div>
    )
  }
}

const editorHeaderStyle = [
  flow({ flowSpace: theme.space.sm }),
  css({
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  }),
]

const headerRowStyle = repel({ gutter: theme.space.xs, alignment: 'center' })

const editableHeadlineStyle = css({
  outline: 'none',
  ':focus-visible': {
    outline: '2px solid var(--accent-strong)',
    outlineOffset: '4px',
  },
})

const labelErrorStyle = css({ color: 'var(--danger)', margin: 0 })

const editorLayoutStyle = switcher({
  gutter: theme.space.xl,
  targetWidth: '52rem',
})

const formStyle = [
  flow({ flowSpace: theme.space.lg }),
  css({
    minWidth: '260px',
    paddingBlock: theme.space['sm-md'],
  }),
]

const fieldStyle = [flow({ flowSpace: theme.space.xs })]

const notesFieldStyle = [flow({ flowSpace: theme.space.xs })]

const notesLabelStyle = cluster({ gutter: theme.space['2xs'], alignment: 'center' })

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
  color: 'var(--text)',
  transition: 'border-color 140ms ease, box-shadow 140ms ease',
  ':focus-visible': {
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
  borderRadius: `0 0 calc(${theme.radius.md} - 1px) calc(${theme.radius.md} - 1px)`,
  background: 'transparent',
  color: 'var(--text)',
  lineHeight: 1.55,
})

const composerStyle = css({
  border: '1px solid var(--border)',
  borderRadius: theme.radius.md,
  ':focus-within': {
    borderColor: 'var(--accent-strong)',
    boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.14)',
  },
})

const toolbarStyle = [
  cluster({ gutter: '2px', alignment: 'center' }),
  // One row even on narrow phones: the buttons shrink instead of wrapping.
  css({
    flexWrap: 'nowrap',
    padding: '6px',
  }),
]

const segmentStyle = css({
  display: 'flex',
  gap: '0',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  width: 'fit-content',
  '& > :first-child': {
    borderTopLeftRadius: '9px',
    borderBottomLeftRadius: '9px',
  },
  '& > :last-child': {
    borderTopRightRadius: '9px',
    borderBottomRightRadius: '9px',
  },
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

const advancedStyle = css({
  borderBlock: '1px solid var(--border-subtle)',
  paddingBlock: theme.space.xs,
  '& summary': {
    marginBlockEnd: 0,
    transition: 'margin-block-end 180ms cubic-bezier(0.19, 1, 0.22, 1)',
  },
  '&[open] summary': { marginBlockEnd: theme.space.sm },
  '&::details-content': {
    display: 'grid',
    gridTemplateRows: '0fr',
    opacity: 0,
    transform: 'translateY(-4px)',
    transformOrigin: 'top center',
    transition:
      'grid-template-rows 180ms cubic-bezier(0.19, 1, 0.22, 1), opacity 160ms cubic-bezier(0.19, 1, 0.22, 1), transform 180ms cubic-bezier(0.19, 1, 0.22, 1), content-visibility 180ms ease-out',
    transitionBehavior: 'allow-discrete',
  },
  '&::details-content > *': {
    minHeight: 0,
    overflow: 'hidden',
  },
  '&[open]::details-content': {
    gridTemplateRows: '1fr',
    opacity: 1,
    transform: 'translateY(0)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '&::details-content': { transform: 'none' },
    '&[open]::details-content': { transform: 'none' },
  },
})

const advancedContentStyle = [flow({ flowSpace: theme.space.lg }), css({ paddingInline: '2px' })]

const previewLabelStyle = css({
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
})
