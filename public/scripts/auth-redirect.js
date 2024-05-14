window.addEventListener('load', function () {
  document.body.addEventListener('htmx:beforeSwap', function (evt) {
    if (evt.detail.xhr.status === 401) {
      // when a 401 occurs redirect to login and then back to this page
      window.location.replace('/auth/login?' + new URLSearchParams({ path: window.location.toString() }).toString())
    }
  })
})
