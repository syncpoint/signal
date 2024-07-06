/**
 * The default equality function used for `Signal.of` and `Signal.link`,
 * which uses referential equality.
 *
 * Note: Object.is() is also not equivalent to the === operator.
 * The only difference between Object.is() and === is in their treatment of
 * signed zeros and NaN values. The === operator (and the == operator) treats
 * the number values -0 and +0 as equal, but treats NaN as not equal to
 * each other.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
export const defaultEquals = Object.is
