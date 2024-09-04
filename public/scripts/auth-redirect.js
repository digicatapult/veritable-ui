window.addEventListener('load', function () {
  document.body.addEventListener('htmx:beforeSwap', function (evt) {
    if (evt.detail.xhr.status === 401) {
      // when a 401 occurs reload the page so we can redirect to login
      window.location.reload()
    }
  })
})
