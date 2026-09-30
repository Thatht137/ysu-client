let transitionTail: Promise<void> = Promise.resolve()

export function waitForAuthTransition(): Promise<void> {
  return transitionTail
}

export function withAuthTransition<T>(operation: () => Promise<T>): Promise<T> {
  const previous = transitionTail
  const { promise: current, resolve: release } = Promise.withResolvers<void>()
  transitionTail = previous.then(() => current)

  return previous.then(operation).finally(() => {
    release()
  })
}
