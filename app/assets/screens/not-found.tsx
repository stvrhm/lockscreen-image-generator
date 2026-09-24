import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { mutedStyle, pageStyle, headingStyle, headerRowStyle } from '../../ui/screen-styles.ts'

/** Rendered by the browser router for a URL that matches no screen. */
export function NotFoundScreen() {
  return () => (
    <div mix={pageStyle}>
      <header mix={headerRowStyle}>
        <Button href={routes.screens.home.href()} variant="ghost">
          {strings.browse.back}
        </Button>
        <h1 mix={headingStyle}>{strings.notFound.title}</h1>
      </header>
      <p mix={mutedStyle}>{strings.notFound.body}</p>
    </div>
  )
}
