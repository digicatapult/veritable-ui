import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' }

/**
 * W3C Decentralized Identifier format v1.0
 * @pattern did:[A-Za-z0-9]+:[A-Za-z0-9]+
 * @example "did:key:z6Mkk7yqnGF3YwTrLpqrW6PGsKci7dNqh1CjnvMbzrMerSeL"
 */
export type DID = string

/**
 * @example "WgWxqztrNooG92RXvxSTWv:3:CL:20:tag"
 */
export type CredentialDefinitionId = string

/**
 * @example "WgWxqztrNooG92RXvxSTWv:2:schema_name:1.0"
 */
export type SchemaId = string

/**
 * @example "1.0.0"
 */
export type Version = string

/**
 * Stringified UUIDv4.
 * @pattern [0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}
 * @example "52907745-7672-470e-a803-a2f8feb52944"
 */
export type UUID = string

/**
 * Hex string with 0x prefix
 * @pattern 0x[0-9a-zA-Z]+
 * @format hex
 * @example "0xFF"
 */
export type HEX = `0x${string}`

/**
 * ISO 8601 date string
 * @pattern (\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))
 * @format date
 */
export type DATE = string

/**
 * Email format
 * @pattern (?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])
 * @format email
 * @example "user@example.com"
 */
export type EMAIL = string

/**
 * Pin Code format
 * @pattern ^[0-9]{6}$
 * @minLength 6
 * @maxLength 6
 * @example 123456
 */
export type PIN_CODE = string
export const pinCodeRegex = /^[0-9]{6}$/

/**
 * Company number format
 * @pattern ^(((AC|CE|CS|FC|FE|GE|GS|IC|LP|NC|NF|NI|NL|NO|NP|OC|OE|PC|R0|RC|SA|SC|SE|SF|SG|SI|SL|SO|SR|SZ|ZC|\d{2})\d{6})|((IP|SP|RS)[A-Z\d]{6})|(SL\d{5}[\dA]))$
 * @minLength 8
 * @maxLength 8
 * @example 07964699
 */
export type COMPANY_NUMBER = string
export const companyNumberRegex =
  /^(((AC|CE|CS|FC|FE|GE|GS|IC|LP|NC|NF|NI|NL|NO|NP|OC|OE|PC|R0|RC|SA|SC|SE|SF|SG|SI|SL|SO|SR|SZ|ZC|\d{2})\d{6})|((IP|SP|RS)[A-Z\d]{6})|(SL\d{5}[\dA]))$/

/**
 * Socrata company number format
 * @pattern ^\d{7}$
 * @example 3211809
 */
export type SOCRATA_NUMBER = string
export const socrataRegex = /^\d{7}$/

/**
 * Base64 url compatible string (see rfc4648 section-5)
 * @pattern ^[a-zA-Z0-9_\-]+$
 * @example VGhpcyBpcyBzb21lIGV4YW1wbGUgdGV4dA
 */
export type BASE_64_URL = string
export const base64UrlRegex = /^[a-zA-Z0-9_-]+$/

/**
 * Bank Identifier Code (BIC)
 * @pattern ^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$
 * @minLength 8
 * @maxLength 11
 * @example DEUTDEFF500
 */
export type BIC = string
export const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/

export type CountryCode = keyof typeof en.countries
export const countryCodes = Object.keys(en.countries) as [CountryCode]
