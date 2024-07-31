import type { PropsWithChildren } from '@kitajs/html'
import { escapeHtml } from '@kitajs/html'
/// <reference types="@kitajs/html/all-types.d.ts" />

type HeaderLink = { name: string; url: string }

type PageProps = {
  title: string
  heading: string
  activePage: 'categories' | 'connections' | 'storage' | 'notifications' | 'settings'
  headerLinks: HeaderLink[]
  stylesheets?: string[]
}

type SharedButtonProps = {
  disabled?: boolean
  text: string
  style: 'outlined' | 'filled'
  icon?: string
}

type ButtonProps = SharedButtonProps & {
  href?: string
}

type FormButtonProps = SharedButtonProps & {
  name: string
  value?: string
}

export const LinkButton = (props: ButtonProps): JSX.Element => (
  <a class={`button ${props.disabled ? 'disabled' : ''}`} href={`${props.href || '#'}`} data-variant={props.style}>
    {props.icon && <div style={{ ['--button-icon' as string]: props.icon || '' }} />}
    <span>{props.text || 'unknown'}</span>
  </a>
)

export const FormButton = (props: FormButtonProps): JSX.Element => (
  <button
    class={`button ${props.disabled ? 'disabled' : ''} `}
    data-variant={props.style}
    type="submit"
    name={`${props.name}`}
    value={`${props.value}`}
  >
    {props.icon && <div style={{ ['--button-icon' as string]: props.icon || '' }} />}
    <span>{props.text || props.value || 'unknown'}</span>
  </button>
)

/**
 * Main menu/Nav
 * @returns JSX - Sidarbar
 */
const SideBar = ({ activePage }: { activePage: PageProps['activePage'] }): JSX.Element => {
  return (
    <nav id="side-bar">
      <img src="/public/images/logo-square.svg" />
      <a
        title="categories"
        href="/"
        data-active={activePage === 'categories'}
        style={{ ['--background-image' as string]: "url('/public/images/category.svg')" }}
      />
      <a
        title="connections"
        href="/connection"
        data-active={activePage === 'connections'}
        style={{ ['--background-image' as string]: "url('/public/images/connection.svg')" }}
      />
      <a
        title="storage"
        href="#storage"
        data-active={activePage === 'storage'}
        class="disabled"
        style={{ ['--background-image' as string]: "url('/public/images/folder.svg')" }}
      />
      <a
        title="notifications"
        href="#notification"
        data-active={activePage === 'notifications'}
        class="disabled"
        style={{ ['--background-image' as string]: "url('/public/images/notification.svg')" }}
      />
      <a
        title="settings"
        href="#settings"
        data-active={activePage === 'settings'}
        class="disabled"
        style={{ ['--background-image' as string]: "url('/public/images/setting.svg')" }}
      />
    </nav>
  )
}

/**
 * Header for content wrapper class
 * @param param0.heading = title of current content
 * @returns JSX
 */
const ContentHeader = (props: { heading: string; headerLinks: HeaderLink[] }): JSX.Element => (
  <div id="content-header">
    <h1>{props.heading || 'unknown'}</h1>
    <div id="content-header-nav">
      <a title="home" class="nav icon" href="/" />
      {...props.headerLinks.map(({ name, url }) => (
        <a title={name} href={url}>
          {escapeHtml(name)}
        </a>
      ))}
    </div>
  </div>
)

const extractHtmxProps = (props: object): Record<`hx-${string}`, unknown> => {
  return Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith('hx-')))
}

/**
 * default page template: props.children = content
 * @returns JSX - default page
 */
export const Page = (props: PropsWithChildren<PageProps & Htmx.Attributes>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="/lib/htmx.org/htmx.min.js"></script>
        <script src="/lib/htmx-ext-json-enc/json-enc.js"></script>
        <script src="/public/scripts/auth-redirect.js"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/shared.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/mpa.css" />
        {(props.stylesheets || []).map((sheetName: JSX.Element) => (
          <link rel="stylesheet" type="text/css" href={`/public/styles/${sheetName}`} />
        ))}
        <title>{escapeHtml(props.title)}</title>
      </head>
      <body hx-ext="json-enc">
        <SideBar activePage={props.activePage} />
        <main>
          <ContentHeader heading={props.heading} headerLinks={props.headerLinks} />
          <div id="content-main" {...extractHtmxProps(props)}>
            {props.children}
          </div>
        </main>
      </body>
    </html>
  </>
)
