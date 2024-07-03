/**
 *
 */
const curry = fn => function rec (...args) {
  return args.length >= fn.length
    ? fn(...args)
    : (...xs) => rec(...args, ...xs)
}

export default curry
