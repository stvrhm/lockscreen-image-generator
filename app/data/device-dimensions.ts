export const MAX_CUSTOM_DIMENSION = 4096
export const MAX_CUSTOM_PIXEL_COUNT = 12_000_000

export type CustomDimensionIssue = 'positive-integers' | 'side-limit' | 'pixel-limit'

export function customDimensionIssue(width: number, height: number): CustomDimensionIssue | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    return 'positive-integers'
  }
  if (width > MAX_CUSTOM_DIMENSION || height > MAX_CUSTOM_DIMENSION) {return 'side-limit'}
  if (width * height > MAX_CUSTOM_PIXEL_COUNT) {return 'pixel-limit'}
  return null
}

export function safePreviewDimensions(size: { width: number; height: number }) {
  const width = Number.isSafeInteger(size.width) && size.width > 0 ? size.width : 1
  const height = Number.isSafeInteger(size.height) && size.height > 0 ? size.height : 1
  const scale = Math.min(
    1,
    MAX_CUSTOM_DIMENSION / width,
    MAX_CUSTOM_DIMENSION / height,
    Math.sqrt(MAX_CUSTOM_PIXEL_COUNT / width / height),
  )
  return {
    height: Math.max(1, Math.floor(height * scale)),
    width: Math.max(1, Math.floor(width * scale)),
  }
}
