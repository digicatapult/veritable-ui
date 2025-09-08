document.body.addEventListener('veritableError', (ev) => {
  const id = ev.detail.dialogId
  if (!id) {
    return
  }

  setTimeout(() => {
    const dialog = document.getElementById(id)
    if (!dialog) return

    const detailsElement = dialog.querySelector('details')
    if (detailsElement && detailsElement.open) return

    if (dialog.open === false) return
    closeToast(id)
  }, 10000)

  // Close all open details elements when the toast is closed
  // Child toast will otherwise remain in a translated position
  const dialog = document.getElementById(id)
  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('details[open]').forEach(detail => {
      detail.open = false
    })
  })

})

document.getElementById('toast-container').addEventListener('click', (e) => {
  const button = e.target.closest('.modal-button')
  if (!button) return

  const dialog = button.closest('dialog')
  if (!dialog || dialog.classList.contains('closing')) return

  // Prevent instant browser close
  e.preventDefault()

  closeToast(dialog.id)
})

function closeToast(id) {
  const dialog = document.getElementById(id)
  if (!dialog) return

  dialog.classList.add('closing')

  dialog.addEventListener("animationend", () => {
    if (!dialog.classList.contains('closing')) return
    dialog.close()
    dialog.classList.remove('closing')
  })
}