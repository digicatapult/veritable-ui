import { Html } from '@kitajs/html'

export const Page = (props: Html.PropsWithChildren<{ title: string }>): JSX.Element => (
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
      <body hx-ext="json-enc">{props.children}</body>
    </html>
  </>
)
