/**
 * Checks if the given value is a javascript object
 *
 * @param {*} a the value to check
 * @returns {boolean} true if the value is an object
 */
function isObject(a: unknown): a is (Record<string | number | symbol, unknown> | null) {
    return typeof a === 'object' && !Array.isArray(a);
}

/**
 * Checks if the given value is a non-null javascript object
 *
 * @param {*} a the value to check
 * @returns {boolean} true if the value is an object
 */
function isNonNullObject(a: unknown): a is Record<string | number | symbol, unknown> {
    return isObject(a) && a !== null;
}

/**
 * Checks if the given parameter is a promise
 *
 * @param {*} p the element to check
 * @returns {boolean} true if p is a promise
 */
export function isPromise(p: unknown): p is Promise<unknown> {
    return isNonNullObject(p) && Object.prototype.toString.call(p) === '[object Promise]';
}

/**
 * Getter for all keys of the given object
 *
 * @param {Object<string, *>} object the object
 * @returns {string[]} the keys of the object
 */
export function keysOf<O extends Record<string | number | symbol, unknown>>(object: O): Array<keyof O> {
    return Object.keys(object) as Array<keyof O>;
}

type GetArrayElementType<ArrayType> = ArrayType extends ReadonlyArray<infer ElementType> ? ElementType : never;
type AsArray<T> = Array<GetArrayElementType<T>>;

/**
 * Checks if the given value is an array
 *
 * @param {T} a the value to check
 * @returns {true} true if the value is an array
 * @template T
 */
export function isArray<T>(a: T): a is T & AsArray<T> {
    return Array.isArray(a);
}