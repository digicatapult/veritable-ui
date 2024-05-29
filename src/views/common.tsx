import { Html } from '@kitajs/html'

type PageProps = {
  title: string
  heading: string
  url: string
}

type ButtonProps = {
  name: string
  showIcon?: boolean
  display?: boolean
  icon?: string
  disabled?: boolean
  outline?: boolean
  href?: string
}

type FormButtonProps = {
  name: string
  display: string
  disabled?: boolean
  outline?: boolean
  value?: string
  type?: string
}

export const ButtonIcon = (props: ButtonProps): JSX.Element => (
  <a href={`${props.href || '#'}`}>
    <div class={`button ${props.disabled && 'disabled'} ${props.outline && 'outline'}`}>
      {props.showIcon && (
        <div class="button icon" style={{ backgroundImage: props?.icon || 'url("/public/images/plus.svg")' }} />
      )}
      <span class={`button text ${props.outline && 'accent'}`}>{props.name || 'unknown'}</span>
    </div>
  </a>
)

export const FormButton = (props: FormButtonProps): JSX.Element => (
  <button
    style={`display:${props.display}`}
    class={`button ${props.disabled && 'disabled'} ${props.outline && 'outline'}`}
    type={`${props.type}`}
    name={`${props.name}`}
    value={`${props.value}`}
  >
    <span class={`button text ${props.outline && 'accent'}`}>{props.value || 'unknown'}</span>
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
const ContentHeader = (props: { heading: string; url: string }): JSX.Element => (
  <div class="content header">
    <h1 class="header heading">{props.heading || 'unknown'}</h1>
    <div class="header nav">
      {/* is this meant to be /connections or just host/ */}
      <a title="home" class="nav icon" href="/" />
      <span class="url-separator">/</span>
      <a title={props.heading || 'n/a'} href={props.url}>
        {props.heading || 'unknown'}
      </a>
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
        <title>{Html.escapeHtml(props.title)}</title>
      </head>
      <body class="flex-page" hx-ext="json-enc">
        <SideBar />
        <div class="flex-page content">
          <ContentHeader heading={props.heading} url={props.url} />
          <div class="content main">{props.children}</div>
        </div>
      </body>
    </html>
  </>
)
