export const neverFail = async <R>(p: Promise<R>): Promise<R | undefined> => {
  return p.catch(() => {}).then((res) => res ?? undefined)
}

export const filterRejectedAndAcceptedPromises = async (promiseResult: PromiseSettledResult<string>[]) => {
  const fulfilledPromises = promiseResult
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
  const rejectedPromises = promiseResult.filter((result) => result.status === 'rejected').map((result) => result.reason)
  return [fulfilledPromises, rejectedPromises]
}
