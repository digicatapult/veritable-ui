/// <reference types="@kitajs/html/all-types.d.ts" />
import { escapeHtml, Html, type PropsWithChildren } from '@kitajs/html'
import { container } from 'tsyringe'

import { Env } from '../env/index.js'

import type { ConnectionRow, QueryRow } from '../models/db/types.js'
import type { Credential } from '../models/veritableCloudagent/internal.js'

const env = container.resolve(Env)

type HeaderLink = { name: string; url: string }

type ConnectionStatus = ConnectionRow['status']
type QueryStatus = QueryRow['status']
type CredentialStatus = Credential['state']

type PageProps = {
  title: string
  activePage: 'categories' | 'queries' | 'connections' | 'certifications' | 'settings' | 'credentials'
  headerLinks: HeaderLink[]
  heading?: string
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
  name?: string
  value?: string
}

export const LinkButton = (props: ButtonProps): JSX.Element => {
  const href = !props.disabled && props.href ? props.href : '#'
  return (
    <a class={`button ${props.disabled ? 'disabled' : ''}`} href={href} data-variant={props.style}>
      {props.icon ? <div style={{ ['--button-icon' as string]: props.icon || '' }} /> : undefined}
      <span>{escapeHtml(props.text || 'unknown')}</span>
    </a>
  )
}

export const FormButton = (props: FormButtonProps): JSX.Element => (
  <button class={`button ${props.disabled ? 'disabled' : ''} `} data-variant={props.style} type="submit" {...props}>
    {props.icon ? <div style={{ ['--button-icon' as string]: props.icon || '' }} /> : undefined}
    <span>{escapeHtml(props.text || props.value || 'unknown')}</span>
  </button>
)

/**
 * Main menu/Nav
 * @returns JSX - Sidarbar
 */
const SideBar = ({ activePage }: { activePage: PageProps['activePage'] }): JSX.Element => {
  const title = env.get('API_SWAGGER_TITLE').slice(0, 1)
  const backgroundColor = env.get('API_SWAGGER_BG_COLOR')
  const aboutPageInDemoMode = env.get('DEMO_MODE') ? '/about' : '/'

  return (
    <nav id="side-bar">
      <a id="veritable-logo" href={aboutPageInDemoMode}></a>
      <div class="profile-icon" style={{ backgroundColor }}>
        {escapeHtml(title)}
      </div>
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
        title="queries"
        href="/queries"
        data-active={activePage === 'queries'}
        style={{ ['--background-image' as string]: "url('/public/images/query.svg')" }}
      />
      <a
        title="credentials"
        href="/credentials"
        data-active={activePage === 'credentials'}
        style={{ ['--background-image' as string]: "url('/public/images/credential.svg')" }}
      />
      <a
        title="settings"
        href="/settings"
        data-active={activePage === 'settings'}
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
    <h1>{escapeHtml(props.heading || 'unknown')}</h1>
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
export const Page = (props: PropsWithChildren<PageProps>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="/lib/htmx.org/htmx.min.js"></script>
        <script src="/lib/htmx-ext-json-enc/json-enc.js"></script>
        <script src="/public/scripts/auth-redirect.js"></script>
        <link rel="icon" type="image/ico" href="/public/images/favicon-dark.ico" media="(prefers-color-scheme: dark)" />
        <link
          rel="icon"
          type="image/ico"
          href="/public/images/favicon.ico"
          media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)"
        />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        {(props.stylesheets || []).map((sheetName: JSX.Element) => (
          <link rel="stylesheet" type="text/css" href={`/public/styles/${sheetName}`} />
        ))}
        <title>{escapeHtml(props.title)}</title>
      </head>
      <body hx-ext="json-enc">
        <SideBar activePage={props.activePage} />
        <main>
          {props.heading ? (
            <ContentHeader heading={props.heading as string} headerLinks={props.headerLinks} />
          ) : undefined}
          <div id="content-main" {...extractHtmxProps(props)}>
            {props.children}
          </div>
        </main>
      </body>
    </html>
  </>
)

export const connectionStatusToClass = (status: ConnectionStatus): JSX.Element => {
  switch (status) {
    case 'verified_them':
    case 'unverified':
      return (
        <div class="list-item-status" data-status="warning">
          Verification Code Required
        </div>
      )
    case 'verified_us':
      return (
        <div class="list-item-status" data-status="disabled">
          Waiting for Response
        </div>
      )
    case 'disconnected':
      return (
        <div class="list-item-status" data-status="disabled">
          Disconnected
        </div>
      )
    case 'verified_both':
      return (
        <div class="list-item-status" data-status="success">
          Connected
        </div>
      )
    case 'pending':
      return (
        <div class="list-item-status" data-status="disabled">
          Invite Sent
        </div>
      )
  }
}

export const queryStatusToClass = (status: QueryStatus): JSX.Element => {
  switch (status) {
    case 'forwarded':
      return (
        <div class="list-item-status" data-status="warning">
          Forwarded
        </div>
      )
    case 'pending_your_input':
      return (
        <div class="list-item-status" data-status="warning">
          Pending Your Input
        </div>
      )
    case 'pending_their_input':
      return (
        <div class="list-item-status" data-status="disabled">
          Pending Their Input
        </div>
      )
    case 'resolved':
      return (
        <div class="list-item-status" data-status="success">
          Resolved
        </div>
      )
    case 'errored':
      return (
        <div class="list-item-status" data-status="error">
          Errored
        </div>
      )
  }
}
export const credentialStatusToClass = (status: CredentialStatus): JSX.Element => {
  switch (status) {
    case 'proposal-sent':
      return (
        <div class="list-item-status" data-status="disabled">
          Proposal Sent
        </div>
      )
    case 'proposal-received':
      return (
        <div class="list-item-status" data-status="disabled">
          Proposal Received
        </div>
      )
    case 'offer-sent':
      return (
        <div class="list-item-status" data-status="disabled">
          Offer Sent
        </div>
      )
    case 'offer-received':
      return (
        <div class="list-item-status" data-status="warning">
          Offer Received
        </div>
      )
    case 'declined':
      return (
        <div class="list-item-status" data-status="error">
          Declined
        </div>
      )
    case 'request-sent':
      return (
        <div class="list-item-status" data-status="disabled">
          Request Sent
        </div>
      )
    case 'request-received':
      return (
        <div class="list-item-status" data-status="warning">
          Request Received
        </div>
      )
    case 'credential-issued':
      return (
        <div class="list-item-status" data-status="disabled">
          Credential Issued
        </div>
      )
    case 'credential-received':
      return (
        <div class="list-item-status" data-status="warning">
          Credential Received
        </div>
      )
    case 'done':
      return (
        <div class="list-item-status" data-status="success">
          Completed
        </div>
      )
    case 'abandoned':
      return (
        <div class="list-item-status" data-status="error">
          Cancelled
        </div>
      )
  }
}

export const FormattedTime = ({ time }: { time: Date }) => (
  <time>
    {Html.escapeHtml(
      `${time.toLocaleDateString('en-GB')} - ${time.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    )}
  </time>
)
