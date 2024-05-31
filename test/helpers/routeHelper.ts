import express from 'express'
import request from 'supertest'

const getToken = async () => {
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

  const body = (await tokenReq.json()) as any
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
