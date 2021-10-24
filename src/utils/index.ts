/**
 * Parse and copy object to new any typed obejct
 * @param object
 * @returns object
 */
export function parseObject(object: any) {
  return JSON.parse(JSON.stringify(object));
}

/**
 * Check the object is empty or not
 * @param object
 * @returns
 */
export function isObjectEmpty(object: any) {
  return (
    object &&
    Object.keys(object).length === 0 &&
    Object.getPrototypeOf(object) === Object.prototype
  );
}

/**
 * Check the array is empty or not
 * @param array
 * @returns
 */
export function isArrayEmpty(array: any) {
  return Array.isArray(array) && array.length === 0;
}
