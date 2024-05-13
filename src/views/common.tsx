import { Html } from '@kitajs/html'

type PageProps = {
  title: string
  heading: string 
  url: string
}

/**
 * Main menu/Nav
 * @returns JSX - Sidarbar
 */
const SideBar = (): JSX.Element => (
  <nav class="flex-page side-bar">
    <img class="side-bar logo-container" src="/public/images/logo-square.svg" />
    <a href="#category" class="side-bar category-icon disabled" />
    <a href="/connection" class="side-bar connection-icon active" />
    <a href="#storage" class="side-bar folder-icon disabled" />
    <a href="#notification" class="side-bar notification-icon disabled" />
    <a href="#settings" class="side-bar settings-icon disabled" />
  </nav>
)

/**
 * Header for content wrapper class
 * @param param0.heading = title of current content
 * @returns JSX
 */
const ContentHeader = ({ heading = '', url = '/' }: { heading: string, url: string}): JSX.Element => (
  <div class="content header">
    <h1 class="header heading">{heading}</h1>
    <div class="header nav">
      {/* is this meant to be /connections or just host/ */}
      <a class="nav icon" href="/" />
      <span class="url-separator">/</span>
      <a href={url}>{heading}</a>
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
        <script src="lib/htmx.org/htmx.min.js"></script>
        <script src="lib/htmx.org/ext/json-enc.js"></script>
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
