import mutation from 'object-mutation'
export default function reducerCreater (initState) {
  let histories = []
  return function (handlers) {
    return function (state = initState, action = {}) {
      const { type, payload } = action
      if (handlers[type]) {
        let newState = { ...state }
        handlers[type]({
          payload,
          stateSetter: mutation(newState),
          stateGetter: state,
          snap: () => {
            histories.push(state)
            return histories.length - 1
          },
          undo: snapshotId => {
            let snapshot = snapshotId ? histories[snapshotId] : histories.pop()
            if (snapshot) {
              newState = snapshot
            } else {
              // 没有快照可用，不发生re-render
              newState = state
            }
          }
        })
        return newState
      }
      return state
    }
  }
}
