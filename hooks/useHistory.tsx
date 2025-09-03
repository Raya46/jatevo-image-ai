import { useMemo, useReducer } from "react";

type State<T> = { stack: T[]; index: number; limit: number };
type Action<T> =
  | { type: "PUSH"; value: T }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; value?: T | null }
  | { type: "SET_INITIAL"; value: T | null };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "PUSH": {
      const base = state.stack.slice(0, state.index + 1);
      let nextStack = [...base, action.value];

      // respect limit
      if (nextStack.length > state.limit) {
        const overflow = nextStack.length - state.limit;
        nextStack = nextStack.slice(overflow);
        return {
          stack: nextStack,
          index: nextStack.length - 1,
          limit: state.limit,
        };
      }
      return { stack: nextStack, index: base.length, limit: state.limit };
    }
    case "UNDO":
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case "REDO":
      return state.index < state.stack.length - 1
        ? { ...state, index: state.index + 1 }
        : state;
    case "RESET": {
      if (action.value == null) {
        return { stack: [], index: -1, limit: state.limit };
      }
      return { stack: [action.value], index: 0, limit: state.limit };
    }
    case "SET_INITIAL":
      if (action.value == null) {
        return { stack: [], index: -1, limit: state.limit };
      }
      return { stack: [action.value], index: 0, limit: state.limit };
    default:
      return state;
  }
}

export function useHistory<T>(initial: T | null, limit = 50) {
  const [state, dispatch] = useReducer(reducer<T>, {
    stack: initial ? [initial] : [],
    index: initial ? 0 : -1,
    limit,
  });

  const present = useMemo<T | null>(
    () => (state.index >= 0 ? state.stack[state.index] : null),
    [state.index, state.stack]
  );

  return {
    present,
    canUndo: state.index > 0,
    canRedo: state.index >= 0 && state.index < state.stack.length - 1,
    history: state.stack,
    index: state.index,
    push: (value: T) => dispatch({ type: "PUSH", value }),
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
    reset: (value?: T | null) => dispatch({ type: "RESET", value }),
    setInitial: (value: T | null) => dispatch({ type: "SET_INITIAL", value }),
  };
}
