/**
 * Splits a large string into an array of smaller strings, each with a maximum length.
 *
 * @param {string} str The string to split.
 * @param {number} chunkSize The maximum length of each string part.  Defaults to 1024.
 * @returns {string[]} An array of string parts.
 */
export function splitString(str: string, chunkSize: number = 1024): string[] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be a positive number.')
  }

  if (!str) {
    return [] // Handle empty or null input
  }

  const result: string[] = []
  let startIndex = 0

  while (startIndex < str.length) {
    const endIndex = Math.min(startIndex + chunkSize, str.length)
    result.push(str.substring(startIndex, endIndex))
    startIndex = endIndex
  }

  return result
}
