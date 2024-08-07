export const neverFail = async <R>(p: Promise<R>): Promise<R | undefined> => {
  try {
    return await p
  } catch (err) {}
}
