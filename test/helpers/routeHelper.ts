import express from 'express'
import request from 'supertest'
import { z } from 'zod'

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_expires_in: z.number(),
  token_type: z.enum(['Bearer']), // Assuming "Bearer" is the only valid value
  'not-before-policy': z.number(),
  scope: z.string(),
})

export const getToken = async () => {
  const tokenReq = await fetch('http://localhost:3080/realms/veritable/protocol/openid-connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'veritable-test',
      client_secret: 'secret',
    }),
  })

  if (!tokenReq.ok) {
    throw new Error(`Error getting token from keycloak ${tokenReq.statusText}`)
  }

  const bodyNotParsed = await tokenReq.json()
  const body = tokenSchema.parse(bodyNotParsed)
  return body.access_token as string
}

export const post = async (
  app: express.Express,
  endpoint: string,
  body: object,
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken()
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).post(endpoint).send(body).set(headersWithToken)
}

export const get = async (
  app: express.Express,
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken()
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).get(endpoint).set(headersWithToken)
}
