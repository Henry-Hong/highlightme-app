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

/**
 * Get random int between min to max(except max value)
 * @param {number} min 범위 최솟값 포함
 * @param {number} max 범위 최댓값 제외
 * @returns
 */
export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}
