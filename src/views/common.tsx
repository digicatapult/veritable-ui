import { Html } from '@kitajs/html'

const SideBar = (): JSX.Element => (
  <div class="flex-page side-bar">
    <a>item 1</a>
  </div>
)

export const Page = (props: Html.PropsWithChildren<{ title: string }>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="lib/htmx.org/htmx.min.js"></script>
        <script src="lib/htmx.org/ext/json-enc.js"></script>
        <script src="public/scripts/auth-redirect.js"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        <title>{Html.escapeHtml(props.title)}</title>
      </head>
      <body class="flex-page" hx-ext="json-enc">
        <SideBar />
        <div class="flex-page content">
          <div class="content header">/header</div>
          {props.children}
        </div>
      </body>
    </html>
  </>
)
