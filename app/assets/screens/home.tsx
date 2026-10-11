import { type Handle, css } from 'remix/component'

import { flow, switcher } from '../../ui/cube/index.ts'
import { Button } from '../../ui/button.tsx'
import { theme } from '../../ui/theme.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { hintStyle, mutedStyle, pageStyle } from '../../ui/screen-styles.ts'

export function Home(handle: Handle<{ hasDraft: boolean }>) {
  return () => {
    const { hasDraft } = handle.props

    return (
      <div mix={pageStyle}>
        <header mix={startHeaderStyle}>
          <p mix={eyebrowStyle}>{strings.appShortName}</p>
          <h1 mix={titleStyle}>{strings.start.title}</h1>
          <p mix={mutedStyle}>{strings.start.subtitle}</p>
        </header>

        <div mix={startActionsStyle}>
          <Button
            href={routes.screens.newDevice.href()}
            variant="primary"
            size="lg"
            mix={blockStyle}
          >
            {strings.start.new}
          </Button>
          {hasDraft && (
            <Button
              href={routes.screens.continueDevice.href()}
              variant="secondary"
              size="lg"
              mix={blockStyle}
            >
              {strings.start.continue}
            </Button>
          )}
          <Button
            href={routes.screens.browseDevices.href()}
            variant="secondary"
            size="lg"
            mix={blockStyle}
          >
            {strings.start.browse}
          </Button>
        </div>
        {hasDraft && <p mix={hintStyle}>{strings.start.continueHint}</p>}
      </div>
    )
  }
}

const startHeaderStyle = [flow({ flowSpace: theme.space['xs-sm'] }), css({ maxWidth: '42rem' })],

 eyebrowStyle = css({
  color: 'var(--text-muted)',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}),

 titleStyle = css({
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(34px, 7vw, 52px)',
  letterSpacing: '-0.045em',
  lineHeight: 1.04,
}),

 startActionsStyle = [
  switcher({ gutter: theme.space.md, targetWidth: '32rem' }),
  css({ maxWidth: '42rem' }),
],

 blockStyle = css({ width: '100%' })
