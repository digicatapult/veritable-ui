import { getToken } from '../../helpers/routeHelper.js'

export const get = async (appUrl: string, endpoint: string, headers: Record<string, string> = {}) => {
  const token = await getToken(appUrl)
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }

  return await fetch(`${appUrl}${endpoint}`, { headers: headersWithToken })
}
