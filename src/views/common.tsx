import { Html } from '@kitajs/html'

type PageProps = {
  title: string
  heading?: string
}

const SideBar = (): JSX.Element => <div class="flex-page side-bar"></div>

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
          <div class="content header">
            <h1 class="header heading">{props.heading || ''}</h1>
            <div class="header nav">
              <div>home icon</div>
              <span class="url-separator">/</span>
              <div>{props.heading || ''}</div>
            </div>
          </div>
          <div class="content main">{props.children}</div>
        </div>
      </body>
    </html>
  </>
)
