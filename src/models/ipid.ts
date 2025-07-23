import { container, injectable } from 'tsyringe'
import { Env } from '../env/index.js'
import { InternalError } from '../errors.js'
import { IBav } from './bav.js'
import { BavResFields } from './drpc.js'

const env = container.resolve(Env)

interface BaseResponse {
  response_code: number
  response_message: string
}

interface PublicKeyResponse extends BaseResponse {
  data: {
    node_public_key: string
    node_id: string
  }
}

interface ValidateResponse extends BaseResponse {
  data: {
    match_score: number
    match_score_description: string
  }
}

@injectable()
export default class IpidBav implements IBav {
  baseUrl: string

  constructor() {
    this.baseUrl = env.get('IPID_API_URL')
  }

  public validate = async ({
    countryCode,
    name,
    bic,
    iban,
    accountId,
    clearingSystemId,
    registrationId,
  }: BavResFields): Promise<{ score: number; description: string }> => {
    const publicKeyResponse = await this.getPublicKey(`/validation/api/v1/public-key?country_code=${countryCode}`)
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

    const encryptedPayload = await this.postEncrypt('/utility/encrypt-payload', payload)

    console.log(encryptedPayload)
    const validateResponse = await this.postValidate('/validation/api/v1/bank-account/validate', {
      encrypted_payload: encryptedPayload,
      node_id: nodeId,
    })
    console.log(validateResponse)

    return { score: validateResponse.data.match_score, description: validateResponse.data.match_score_description }
  }

  getPublicKey = async (endpoint: string): Promise<PublicKeyResponse> => {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: new Headers({
        'x-api-key': env.get('IPID_API_KEY'),
        'x-customer-id': env.get('IPID_CUSTOMER_ID'),
      }),
    })

    if (!res.ok) {
      throw new InternalError(`Unknown error calling IPID BAV API: ${res.statusText}`)
    }
    const publicKeyResponse = (await res.json()) as PublicKeyResponse

    if (publicKeyResponse.response_code !== 2000) {
      throw new InternalError(`Error calling IPID BAV API: ${publicKeyResponse.response_message}`)
    }
    return publicKeyResponse
  }

  postEncrypt = async (endpoint: string, body: unknown): Promise<string> => {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'x-api-key': env.get('IPID_API_KEY'),
        'x-customer-id': env.get('IPID_CUSTOMER_ID'),
      }),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new InternalError(`Unknown error calling IPID BAV API: ${res.statusText}`)
    }

    return res.text()
  }

  postValidate = async (endpoint: string, body: unknown): Promise<ValidateResponse> => {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'x-api-key': env.get('IPID_API_KEY'),
        'x-customer-id': env.get('IPID_CUSTOMER_ID'),
      }),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new InternalError(`Unknown error calling IPID BAV API: ${res.statusText}`)
    }

    const validateResponse = (await res.json()) as ValidateResponse

    if (validateResponse.response_code !== 2000) {
      throw new InternalError(`Error calling IPID BAV API: ${validateResponse.response_message}`)
    }
    return validateResponse
  }
}
