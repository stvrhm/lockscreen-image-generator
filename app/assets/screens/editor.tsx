import { css, navigate, on, ref, type Handle } from 'remix/ui'
import input from 'remix/ui/input'
import { Option, Select } from 'remix/ui/select'
import { onSelectChange } from 'remix/ui/select/primitives'

import { cluster, flow, switcher } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import {
  saveDevice,
  type Device,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
} from '../../data/devices.ts'
import { measureHostExportSize } from '../../data/host.ts'
import { downloadWallpaper, shareWallpaper, type WallpaperOptions } from '../../data/wallpaper.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { toast } from '../../ui/toast.tsx'
import {
  inlineFormatActive,
  toggleInlineFormat,
  type InlineFormat,
} from '../editor/format-notes.ts'
import { headingPressed, setHeading } from '../editor/set-heading.ts'
import { ExportSummary } from '../editor/export-summary.tsx'
import { FormatButton } from '../editor/format-button.tsx'
import { insertLines } from '../editor/insert-lines.ts'
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
    editingNew: boolean
  }>,
) {
  let draft = handle.props.draft
  let editingNew = handle.props.editingNew
  let platformOverride = false
  let notesRef: HTMLTextAreaElement | null = null
  let notesSelection = { start: 0, end: 0 }

  handle.queueTask(() => {
    document.addEventListener(
      'selectionchange',
      () => {
        if (!notesRef || document.activeElement !== notesRef) return
        let start = notesRef.selectionStart
        let end = notesRef.selectionEnd
        if (start === notesSelection.start && end === notesSelection.end) return
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
    return { text: draft.notes, start: notesSelection.start, end: notesSelection.end }
  }

  function applyNotesEdit(next: { text: string; start: number; end: number }) {
    draft = { ...draft, notes: next.text }
    notesSelection = { start: next.start, end: next.end }
    handle.update()
    handle.queueTask(() => {
      if (!notesRef) return
      notesRef.focus()
      notesRef.setSelectionRange(next.start, next.end)
    })
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

  function hasLabel() {
    if (draft.label.trim()) return true
    toast({ title: strings.editor.labelRequired, variant: 'error' })
    return false
  }

  async function storeDevice() {
    let wasNew = editingNew
    draft = await saveDevice({ ...draft, label: draft.label.trim() })
    editingNew = false

    // A new Device only gets its id once saved, so move to its canonical URL.
    // It is still the same screen to the user, so keep their scroll position.
    if (wasNew) {
      navigate(routes.screens.editDevice.href({ id: draft.id }), {
        history: 'replace',
        resetScroll: false,
      })
    }
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
    if (!hasLabel()) return
    await storeDevice()
    toast({ title: strings.editor.deviceSaved, variant: 'success' })
  }

  async function onSaveToPhotos() {
    if (!hasLabel()) return
    let options = wallpaperOptions()
    // Share before touching IndexedDB: the share sheet needs the tap's user
    // activation, and Safari drops it if other async work runs first.
    let result = await shareWallpaper(options)
    // Dismissing the share sheet backs out of the whole action.
    if (result === 'cancelled') return
    let downloaded = result === 'unsupported' && (await downloadWallpaper(options))
    await storeDevice()

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
    let downloaded = await downloadWallpaper(wallpaperOptions())
    if (!downloaded) toast({ title: strings.editor.imageFailed, variant: 'error' })
  }

  return () => {
    let device = draft
    let size = resolvedSize(device)
    let previewText = device.notes.trim() || device.label.trim() || 'Notes preview'

    return (
      <div mix={pageStyle}>
        <header mix={editorHeaderStyle}>
          <Button href={routes.screens.home.href()} variant="ghost">
            {strings.editor.back}
          </Button>
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
                    pressed={inlineFormatActive(
                      device.notes,
                      notesSelection.start,
                      notesSelection.end,
                      'bold',
                    )}
                    onSelect={() => applyFormatting('bold')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.italic}
                    symbol="I"
                    pressed={inlineFormatActive(
                      device.notes,
                      notesSelection.start,
                      notesSelection.end,
                      'italic',
                    )}
                    onSelect={() => applyFormatting('italic')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.strike}
                    symbol="S"
                    pressed={inlineFormatActive(
                      device.notes,
                      notesSelection.start,
                      notesSelection.end,
                      'strike',
                    )}
                    onSelect={() => applyFormatting('strike')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.code}
                    symbol="<>"
                    pressed={inlineFormatActive(
                      device.notes,
                      notesSelection.start,
                      notesSelection.end,
                      'code',
                    )}
                    onSelect={() => applyFormatting('code')}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.headingLarge}
                    symbol="#"
                    pressed={headingPressed(
                      device.notes,
                      notesSelection.start,
                      notesSelection.end,
                      1,
                    )}
                    onSelect={() => applyHeading(1)}
                    onArm={armNotesSelection}
                  />
                  <FormatButton
                    label={strings.editor.headingMedium}
                    symbol="##"
                    pressed={headingPressed(
                      device.notes,
                      notesSelection.start,
                      notesSelection.end,
                      2,
                    )}
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
                  aria-describedby="notes-hint"
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
                    on('blur', armNotesSelection),
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
              <Button variant="primary" onClick={() => void onSaveToPhotos()}>
                {strings.editor.saveToPhotos}
              </Button>
              <Button variant="secondary" onClick={() => void onSaveDevice()}>
                {strings.editor.saveDevice}
              </Button>
              <Button variant="secondary" onClick={() => void onDownload()}>
                {strings.editor.download}
              </Button>
            </div>
            <p mix={hintStyle}>{strings.editor.applyHint}</p>
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
  // One row even on narrow phones: the buttons shrink instead of wrapping.
  css({ flexWrap: 'nowrap', padding: '6px', background: 'rgba(255, 255, 255, 0.035)' }),
]

const segmentStyle = css({
  display: 'flex',
  gap: '0',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  background: 'var(--surface)',
  overflow: 'hidden',
  width: 'fit-content',
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
