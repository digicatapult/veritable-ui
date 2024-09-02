export const neverFail = async <R>(p: Promise<R>): Promise<R | undefined> => {
  return p.catch(() => {}).then((res) => res ?? undefined)
}
