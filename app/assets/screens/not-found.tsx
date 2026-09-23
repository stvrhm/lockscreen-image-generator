import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import {
  mutedStyle,
  pageStyle,
  headingStyle,
  headerRowStyle,
  ghostButtonStyle,
} from '../../ui/screen-styles.ts'

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
