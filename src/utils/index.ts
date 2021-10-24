/**
 * Parse and copy object to new any typed obejct
 * @param object
 * @returns object
 */
export function parseObject(object: any) {
  return JSON.parse(JSON.stringify(object));
}
