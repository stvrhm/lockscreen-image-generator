import { css, type Handle } from 'remix/ui'

import { flow, grid, sidebar, switcher } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import {
  mutedStyle,
  pageStyle,
  hintStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../../ui/screen-styles.ts'

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
