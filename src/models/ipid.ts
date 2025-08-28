import { Logger } from 'pino'
import { container, injectable } from 'tsyringe'
import { Env } from '../env/index.js'
import { IBav } from './bav.js'
import { BavResFields } from './drpc.js'
import { CountryCode } from './stringTypes.js'

const env = container.resolve(Env)

interface BaseResponse {
  response_code: number
  response_message: string
}

export interface PublicKeyResponse extends BaseResponse {
  data: {
    node_public_key: string
    node_id: string
  }
}

export interface ValidateResponse extends BaseResponse {
  data: {
    match_score: number
    match_score_description: string
  }
}

class IpidError extends Error {
  userMessage: string
  internalMessage: string

  constructor(userMessage: string, internalMessage: string) {
    super(internalMessage)
    this.userMessage = userMessage
    this.internalMessage = internalMessage
  }
}

@injectable()
export default class IpidBav implements IBav {
  baseUrl: string

  constructor() {
    this.baseUrl = env.get('IPID_API_URL')
  }

  public validate = async (
    log: Logger,
    { countryCode, name, bic, iban, accountId, clearingSystemId, registrationId }: BavResFields
  ): Promise<{ score: number; description: string }> => {
    try {
      const publicKeyResponse = await this.getPublicKey(countryCode)
      const {
        data: { node_public_key: nodePublicKey, node_id: nodeId },
      } = publicKeyResponse

      const payload = {
        key: nodePublicKey,
        payload: {
          creditor: {
            name,
            identification: [
              {
                value: registrationId,
                type: 'registration_id',
              },
            ],
          },
          creditor_account: {
            iban,
            account_id: accountId,
          },
          creditor_agent: { clearing_system_id: clearingSystemId, bic },
        },
      }

      const encryptedPayload = await this.postEncrypt(payload)
      const validateResponse = await this.postValidate({
        encrypted_payload: encryptedPayload,
        node_id: nodeId,
      })
      return { score: validateResponse.data.match_score, description: validateResponse.data.match_score_description }
    } catch (error) {
      if (error instanceof IpidError) {
        log.info('expected IPID error %s', error.internalMessage)
        return { score: 0, description: error.userMessage }
      }
      log.error(error)
      return { score: 0, description: 'Unexpected error with Beneficiary Account Validation process' }
    }
  }

  getPublicKey = async (countryCode: CountryCode): Promise<PublicKeyResponse> => {
    const res = await this.wrappedFetch(`/validation/api/v1/public-key?country_code=${countryCode}`, 'GET')

    const publicKeyResponse = (await res.json()) as PublicKeyResponse

    if (publicKeyResponse.response_code !== 2000) {
      throw new IpidError(
        `Country not supported`,
        `Error getting IPID BAV public key: ${publicKeyResponse.response_message}`
      )
    }
    return publicKeyResponse
  }

  postEncrypt = async (body: object): Promise<string> => {
    const res = await this.wrappedFetch('/utility/encrypt-payload', 'POST', body)
    return res.text()
  }

  postValidate = async (body: object): Promise<ValidateResponse> => {
    const res = await this.wrappedFetch('/validation/api/v1/bank-account/validate', 'POST', body)

    const validateResponse = (await res.json()) as ValidateResponse

    if (validateResponse.response_code !== 2000) {
      throw new IpidError(
        `Unable to verify`,
        `Error validating with IPID BAV API: ${validateResponse.response_message}`
      )
    }
    return validateResponse
  }

  wrappedFetch = async (endpoint: string, method = 'GET', body?: object) => {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.get('IPID_API_KEY'),
        'x-customer-id': env.get('IPID_CUSTOMER_ID'),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new IpidError(`BAV API error`, `Unknown error calling IPID BAV API: ${res.statusText}`)
    }

    return res
  }
}
