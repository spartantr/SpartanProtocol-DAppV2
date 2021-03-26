import BigNumber from 'bignumber.js'

export const BN = (x) => new BigNumber(x)

/**
 * Shift Wei string to units. Format using globalFormatting
 * @param {string} weiString
 * @returns {string} units
 */
export const formatFromWei = (weiString) => {
  const units = BN(weiString).shiftedBy(-18).toFormat(4)
  return units
}

/**
 * Shift Wei string to units. Format using globalFormatting
 * @param {string} unitString
 * @param {unit} formatDecimals
 * @returns {string} units
 */
export const formatFromUnits = (weiString, formatDecimals) => {
  const decimals = formatDecimals || 2
  const units = BN(weiString).toFormat(decimals)
  return units
}
