import { type Handle, css, navigate, on, ref } from 'remix/component'

import { cluster, flow, repel } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import {
  type Device,
  DeviceLabelConflictError,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
  listDevices,
  normalizeDeviceLabel,
  saveDevice,
  subscribeToDeviceChanges,
} from '../../data/devices.ts'
import {
  type CustomDimensionIssue,
  MAX_CUSTOM_DIMENSION,
  customDimensionIssue,
  safePreviewDimensions,
} from '../../data/device-dimensions.ts'
import { measureHostExportSize } from '../../data/host.ts'
import { type WallpaperOptions, downloadWallpaper, shareWallpaper } from '../../data/wallpaper.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { Badge } from '../../ui/badge.tsx'
import { Button } from '../../ui/button.tsx'
import { toast } from '../../ui/toast.tsx'
import { ConfirmationDialog } from '../../ui/confirmation-dialog.tsx'
import {
  type InlineFormat,
  inlineFormatActive,
  toggleInlineFormat,
} from '../editor/format-notes.ts'
import { headingPressed, setHeading } from '../editor/set-heading.ts'
import { ExportSummary } from '../editor/export-summary.tsx'
import { FormatButton } from '../editor/format-button.tsx'
import { FormattingHelpButton } from '../editor/formatting-help-button.tsx'
import { insertLines } from '../editor/insert-lines.ts'
import { type PendingNavigation, guardEditorNavigation } from '../editor/navigation-guard.ts'
import { PhoneInfoButton } from '../editor/phone-info-button.tsx'
import { PhonePreview } from '../editor/phone-preview.tsx'
import { SegmentButton } from '../editor/segment-button.tsx'
import {
  actionsRowStyle,
  headingStyle,
  hintStyle,
  mutedStyle,
  pageStyle,
} from '../../ui/screen-styles.ts'

const NOTES_MAX_HEIGHT = 260

function hostSize() {
  return measureHostExportSize()
}

function dimensionIssueMessage(issue: CustomDimensionIssue): string {
  return strings.editor.dimensionIssues[issue]
}

function dimensionInputValue(value: string) {
  return value === '' ? Number.NaN : Number(value)
}

export function Editor(
  handle: Handle<{
    draft: Device
    devices: Device[]
    editingNew: boolean
  }>,
) {
  let { draft } = handle.props
  let savedDevices = handle.props.devices,
    { editingNew } = handle.props
  let baseline: Device = { ...draft },
    labelError = '',
    leaveDialogOpen = false,
    pendingNavigation: PendingNavigation | null = null,
    dialogReturnFocus: HTMLElement | null = null,
    navigationGuard: ReturnType<typeof guardEditorNavigation> | null = null,
    headingRef: HTMLHeadingElement | null = null,
    labelRef: HTMLInputElement | null = null,
    selectLabelOnPointerFocus = false,
    platformOverride = false,
    notesRef: HTMLTextAreaElement | null = null,
    notesFocused = false,
    // Until Notes has been focused or edited, there is no meaningful cursor to
    // reflect in the formatting toolbar. Starting at 0 made a prefilled H1 look
    // pressed as soon as the new-device screen opened.
    notesSelection: { start: number; end: number } | null = null

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
    pendingNavigation = { key: '', type: 'push', url: routes.screens.home.href() }
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
      if (!isDirty()) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    const unsubscribeDeviceChanges = subscribeToDeviceChanges(() => {
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
        if (!notesRef || document.activeElement !== notesRef) {
          return
        }
        const start = notesRef.selectionStart
        const end = notesRef.selectionEnd
        if (notesSelection && start === notesSelection.start && end === notesSelection.end) {
          return
        }
        notesSelection = { end, start }
        handle.update()
      },
      { signal: handle.signal },
    )
  })
  function resolvedSize(device: Device) {
    if (device.exportSizeMode === 'custom') {
      if (customDimensionIssue(device.customWidth, device.customHeight)) {
        return safePreviewDimensions(hostSize())
      }
      return {
        height: device.customHeight,
        width: device.customWidth,
      }
    }
    return hostSize()
  }

  function customDimensionsValid() {
    return customDimensionIssue(draft.customWidth, draft.customHeight) === null
  }

  function patchDraft(patch: Partial<Device>) {
    draft = { ...draft, ...patch }
    if (patch.label !== undefined) {
      labelError = ''
    }
    handle.update()
  }

  /** Inserts whole Notes lines at the cursor, then returns focus to Notes. */
  function insertAtCursor(lines: string) {
    const end = draft.notes.length
    const selection = notesRef
      ? { start: notesRef.selectionStart, end: notesRef.selectionEnd }
      : { start: end, end }
    const next = insertLines({ text: draft.notes, ...selection }, lines)
    draft = { ...draft, notes: next.text }
    notesSelection = { end: next.end, start: next.start }
    handle.update()
    handle.queueTask(() => {
      resizeNotes()
      if (!notesRef) {
        return
      }
      notesRef.focus()
      notesRef.setSelectionRange(next.start, next.end)
    })
  }

  function armNotesSelection() {
    if (!notesRef) {
      return
    }
    notesSelection = { end: notesRef.selectionEnd, start: notesRef.selectionStart }
  }

  function notesEdit() {
    if (notesRef && document.activeElement === notesRef) {
      return {
        end: notesRef.selectionEnd,
        start: notesRef.selectionStart,
        text: draft.notes,
      }
    }
    const selection = notesSelection ?? { start: 0, end: 0 }
    return { text: draft.notes, ...selection }
  }

  function applyNotesEdit(next: { text: string; start: number; end: number }) {
    draft = { ...draft, notes: next.text }
    notesSelection = { end: next.end, start: next.start }
    notesFocused = true
    handle.update()
    handle.queueTask(() => {
      if (!notesRef) {
        return
      }
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
    if (!notesRef) {
      return
    }
    notesRef.style.height = 'auto'
    notesRef.style.height = `${Math.min(notesRef.scrollHeight, NOTES_MAX_HEIGHT)}px`
    notesRef.style.overflowY = notesRef.scrollHeight > NOTES_MAX_HEIGHT ? 'auto' : 'hidden'
  }

  function validateLabel() {
    const label = draft.label.trim()
    const normalized = normalizeDeviceLabel(label)
    if (normalized) {
      let conflict = savedDevices.some(
        (device) => device.id !== draft.id && normalizeDeviceLabel(device.label) === normalized,
      )
      let unchangedLegacyDuplicate = !editingNew && draft.label === baseline.label
      labelError = conflict && !unchangedLegacyDuplicate ? strings.editor.labelConflict : ''
    } else {
      labelError = strings.editor.labelRequired
    }
    if (!labelError) {
      return true
    }
    handle.update()
    handle.queueTask(() => labelRef?.focus())
    return false
  }

  async function storeDevice() {
    const wasNew = editingNew
    const savedLabel =
      !editingNew && draft.label === baseline.label ? draft.label : draft.label.trim()
    try {
      draft = await saveDevice(
        { ...draft, label: savedLabel },
        { allowUnchangedDuplicate: !editingNew && draft.label === baseline.label },
      )
    } catch (error) {
      if (!(error instanceof DeviceLabelConflictError)) {
        throw error
      }
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
      const href = routes.screens.editDevice.href({ id: draft.id })
      navigationGuard?.updateCurrentUrl(href)
      navigate(href, {
        history: 'replace',
        resetScroll: false,
      })
    }
    return true
  }

  function wallpaperOptions(): WallpaperOptions {
    const size = resolvedSize(draft)
    return {
      encoding: draft.encoding,
      height: size.height,
      label: draft.label,
      notes: draft.notes,
      width: size.width,
    }
  }

  async function onSaveDevice() {
    if (!customDimensionsValid()) {
      return
    }
    if (!validateLabel()) {
      return
    }
    if (!(await storeDevice())) {
      return
    }
    toast({ title: strings.editor.deviceSaved, variant: 'success' })
  }

  async function onSaveToPhotos() {
    if (!customDimensionsValid()) {
      return
    }
    if (!validateLabel()) {
      return
    }
    const options = wallpaperOptions()
    // Share before touching IndexedDB: the share sheet needs the tap's user
    // Activation, and Safari drops it if other async work runs first.
    const result = await shareWallpaper(options)
    // Dismissing the share sheet backs out of the whole action.
    if (result === 'cancelled') {
      return
    }
    const downloaded = result === 'unsupported' && (await downloadWallpaper(options))
    if (!(await storeDevice())) {
      return
    }

    if (downloaded) {
      toast({
        description: strings.editor.imageDownloadedHint,
        title: strings.editor.imageDownloaded,
        variant: 'success',
      })
    } else if (result === 'failed' || result === 'unsupported') {
      toast({ title: strings.editor.imageFailed, variant: 'error' })
    } else {
      toast({ title: strings.editor.deviceSaved, variant: 'success' })
    }
  }

  async function onDownload() {
    if (!customDimensionsValid()) {
      return
    }
    const downloaded = await downloadWallpaper(wallpaperOptions())
    if (!downloaded) {
      toast({ title: strings.editor.imageFailed, variant: 'error' })
    }
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
    }
    baseline = { ...draft }
    const destination = pendingNavigation
    leaveDialogOpen = false
    pendingNavigation = null
    handle.update()
    if (!destination) {
      return
    }
    if (destination.type === 'traverse' && destination.key && window.navigation) {
      window.navigation.traverseTo(destination.key)
    } else if (destination.type === 'fallback-back') {
      history.back()
    } else {
      navigate(destination.url)
    }
  }

  return () => {
    const device = draft
    const dimensionIssue = customDimensionIssue(device.customWidth, device.customHeight)
    const size = resolvedSize(device)
    const previewText = device.notes.trim() || device.label.trim() || 'Notes preview'

    return (
      <div mix={pageStyle}>
        <header mix={flow({ flowSpace: theme.space.sm })}>
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
                background: 'transparent',
                border: 0,
                borderRadius: 0,
                boxShadow: 'none',
                color: 'inherit',
                font: 'inherit',
                lineHeight: 'inherit',
                minWidth: '10ch',
                padding: 0,
                width: '100%',
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
                  if (!selectLabelOnPointerFocus) {
                    return
                  }
                  selectLabelOnPointerFocus = false
                  event.currentTarget.select()
                }),
              ]}
            />
          </h1>
        </header>

        <div mix={editorLayoutStyle}>
          <div mix={flow({ flowSpace: theme.space.md })}>
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
                  <fieldset mix={segmentStyle} aria-label={strings.editor.exportSize}>
                    <SegmentButton
                      active={device.exportSizeMode === 'auto'}
                      label={strings.editor.exportSizeAuto}
                      onSelect={() => patchDraft({ exportSizeMode: 'auto' as ExportSizeMode })}
                    />
                    <SegmentButton
                      active={device.exportSizeMode === 'custom'}
                      label={strings.editor.exportSizeCustom}
                      onSelect={() => {
                        const auto = hostSize()
                        patchDraft({
                          customHeight: device.customHeight || auto.height,
                          customWidth: device.customWidth || auto.width,
                          exportSizeMode: 'custom',
                        })
                      }}
                    />
                  </fieldset>
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
                  <fieldset mix={segmentStyle} aria-label={strings.editor.encoding}>
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
                  </fieldset>
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

const headerRowStyle = repel({ alignment: 'center', gutter: theme.space.xs }),
  editableHeadlineStyle = css({
    ':focus-visible': {
      outline: '2px solid var(--accent-strong)',
      outlineOffset: '4px',
    },
    outline: 'none',
  }),
  labelErrorStyle = css({ color: 'var(--danger)', margin: 0 }),
  editorLayoutStyle = css({
    '& > *': { minWidth: 0 },
    '@media (min-width: 68rem)': {
      alignItems: 'start',
      gridTemplateColumns: 'minmax(0, 1.15fr) minmax(22rem, 0.85fr)',
    },
    display: 'grid',
    gap: theme.space.xl,
    gridTemplateColumns: 'minmax(0, 1fr)',
  }),
  fieldStyle = [flow({ flowSpace: theme.space.xs })],
  notesFieldStyle = [flow({ flowSpace: theme.space.xs })],
  notesLabelStyle = cluster({ alignment: 'center', gutter: theme.space['2xs'] }),
  fieldLabelStyle = css({
    color: 'var(--text)',
    fontWeight: theme.fontWeight.semibold,
  }),
  inputStyle = css({
    ':focus-visible': {
      borderColor: 'var(--accent-strong)',
      boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.14)',
    },
    border: '1px solid var(--border)',
    borderRadius: theme.radius.sm,
    color: 'var(--text)',
    padding: `${theme.space.xs} ${theme.space.xs}`,
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
  }),
  platformSelectStyle = css({
    border: '1px solid var(--border)',
    borderRadius: theme.radius.sm,
    color: 'var(--text)',
    fontWeight: theme.fontWeight.medium,
    justifyContent: 'space-between',
    minHeight: '2.75rem',
    padding: `${theme.space.xs} ${theme.space.xs}`,
    textAlign: 'start',
    width: '100%',
  }),
  textareaStyle = css({
    background: 'transparent',
    border: 0,
    borderRadius: `0 0 calc(${theme.radius.md} - 1px) calc(${theme.radius.md} - 1px)`,
    borderTop: '1px solid var(--border)',
    color: 'var(--text)',
    display: 'block',
    lineHeight: 1.55,
    maxHeight: `${NOTES_MAX_HEIGHT}px`,
    minHeight: '5.75rem',
    padding: `${theme.space.xs} ${theme.space.xs}`,
    resize: 'vertical',
    width: '100%',
  }),
  composerStyle = css({
    ':focus-within': {
      borderColor: 'var(--accent-strong)',
      boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.14)',
    },
    border: '1px solid var(--border)',
    borderRadius: theme.radius.md,
  }),
  toolbarStyle = [
    cluster({ alignment: 'center', gutter: '2px' }),
    // One row even on narrow phones: the buttons shrink instead of wrapping.
    css({
      flexWrap: 'nowrap',
      padding: '6px',
    }),
  ],
  segmentStyle = css({
    '& > :first-child': {
      borderBottomLeftRadius: '9px',
      borderTopLeftRadius: '9px',
    },
    '& > :last-child': {
      borderBottomRightRadius: '9px',
      borderTopRightRadius: '9px',
    },
    border: '1px solid var(--border)',
    borderRadius: '10px',
    display: 'flex',
    gap: '0',
    margin: 0,
    minInlineSize: 0,
    padding: 0,
    width: 'fit-content',
  }),
  sizeInputsStyle = cluster({ alignment: 'stretch', gutter: '12px' }),
  inlineFieldStyle = [
    flow({ flowSpace: theme.space['3xs'] }),
    css({
      color: 'var(--text-muted)',
      display: 'flex',
      flex: '1 1 120px',
      flexDirection: 'column',
      fontSize: theme.fontSize.small,
    }),
  ],
  previewColumnStyle = [
    css({
      '@media (min-width: 68rem) and (min-height: 42rem)': {
        alignSelf: 'start',
        position: 'sticky',
        top: '24px',
      },
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
      padding: '8px 0 0',
    }),
  ],
  advancedStyle = css({
    '& summary': {
      marginBlockEnd: 0,
      transition: 'margin-block-end 180ms cubic-bezier(0.19, 1, 0.22, 1)',
    },
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
    '&[open] summary': { marginBlockEnd: theme.space.sm },
    '&[open]::details-content': {
      gridTemplateRows: '1fr',
      opacity: 1,
      transform: 'translateY(0)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      '&::details-content': { transform: 'none' },
      '&[open]::details-content': { transform: 'none' },
    },
    borderBlock: '1px solid var(--border)',
    paddingBlock: theme.space.xs,
  }),
  advancedContentStyle = [flow({ flowSpace: theme.space.lg }), css({ paddingInline: '2px' })],
  previewLabelStyle = css({
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  })
