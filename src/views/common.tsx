import { Html } from '@kitajs/html'

type HeaderLink = { name: string; url: string }

type PageProps = {
  title: string
  heading: string
  headerLinks: HeaderLink[]
  stylesheets?: string[]
}

type ButtonProps = {
  name: string
  showIcon?: boolean
  display?: boolean
  icon?: string
  disabled?: boolean
  outline?: boolean
  href?: string
  fillButton?: boolean
}

type FormButtonProps = {
  name: string
  disabled?: boolean
  outline?: boolean
  value?: string
  text?: string
  type?: string
  fillButton?: boolean
}

export const ButtonIcon = (props: ButtonProps): JSX.Element => (
  <a
    class={`button ${props.disabled ? 'disabled' : ''} ${props.outline ? 'outline' : ''} ${props.fillButton ? 'button-filled' : ''}`}
    href={`${props.href || '#'}`}
  >
    {props.showIcon && (
      <div class="button-icon" style={{ backgroundImage: props?.icon || 'url("/public/images/plus.svg")' }} />
    )}
    <span class={`button-text ${props.outline ? 'accent' : ''}`}>{props.name || 'unknown'}</span>
  </a>
)

export const FormButton = (props: FormButtonProps): JSX.Element => (
  <button
    class={`button ${props.disabled ? 'disabled' : ''} ${props.outline ? 'outline' : ''} ${props.fillButton ? 'button-filled' : ''}`}
    type={`${props.type}`}
    name={`${props.name}`}
    value={`${props.value}`}
  >
    <span class={`button-text ${props.outline ? 'accent' : ''}`}>{props.text || props.value || 'unknown'}</span>
  </button>
)

/**
 * Main menu/Nav
 * @returns JSX - Sidarbar
 */
const SideBar = (): JSX.Element => (
  <nav class="flex-page side-bar">
    <img class="side-bar logo-container" src="/public/images/logo-square.svg" />
    <a
      title="categories"
      href="#category"
      class="side-bar icon disabled"
      style={{ backgroundImage: 'url("/public/images/category.svg")' }}
    />
    <a
      title="connections"
      href="/connection"
      class="side-bar icon active"
      style={{ backgroundImage: 'url("/public/images/connection.svg")' }}
    />
    <a
      title="storage"
      href="#storage"
      class="side-bar icon disabled"
      style={{ backgroundImage: 'url("/public/images/folder.svg")' }}
    />
    <a
      title="notifications"
      href="#notification"
      class="side-bar icon disabled"
      style={{ backgroundImage: 'url("/public/images/notification.svg")' }}
    />
    <a
      title="settings"
      href="#settings"
      class="side-bar icon disabled"
      style={{ backgroundImage: 'url("/public/images/setting.svg")' }}
    />
  </nav>
)

/**
 * Header for content wrapper class
 * @param param0.heading = title of current content
 * @returns JSX
 */
const ContentHeader = (props: { heading: string; headerLinks: HeaderLink[] }): JSX.Element => (
  <div class="content header">
    <h1 class="header heading">{props.heading || 'unknown'}</h1>
    <div class="header nav">
      {/* is this meant to be /connections or just host/ */}
      <a title="home" class="nav icon" href="/" />
      {...props.headerLinks.map(({ name, url }) => (
        <>
          <span class="url-separator">/</span>
          <a title={name} href={url}>
            {Html.escapeHtml(name)}
          </a>
        </>
      ))}
    </div>
  </div>
)

/**
 * default page template: props.children = content
 * @returns JSX - default page
 */
export const Page = (props: Html.PropsWithChildren<PageProps>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="/lib/htmx.org/htmx.min.js"></script>
        <script src="/lib/htmx.org/ext/json-enc.js"></script>
        <script src="/public/scripts/auth-redirect.js"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        {(props.stylesheets || []).map((sheetName) => (
          <link rel="stylesheet" type="text/css" href={`/public/styles/${sheetName}`} />
        ))}
        <title>{Html.escapeHtml(props.title)}</title>
      </head>
      <body class="flex-page" hx-ext="json-enc">
        <SideBar />
        <div class="flex-page content">
          <ContentHeader heading={props.heading} headerLinks={props.headerLinks} />
          <div class="content main">{props.children}</div>
        </div>
      </body>
    </html>
  </>
)
