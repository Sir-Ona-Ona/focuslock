const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getToken() {
  return localStorage.getItem('fl_token')
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const tok = getToken()
  if (tok) headers['Authorization'] = `Bearer ${tok}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) {
    const err = new Error(data.error ?? 'Request failed')
    err.status = res.status
    err.data   = data
    throw err
  }
  return data
}

export const api = {
  auth: {
    register: ({ email, name, password }) =>
      req('POST', '/auth/register', { email, name, password }),
    login: ({ email, password }) =>
      req('POST', '/auth/login', { email, password }),
  },

  settings: {
    get: ()           => req('GET',    '/settings'),
    domains: (domains) => req('PUT',   '/settings/domains',  { domains }),
    schedule: (schedule) => req('PUT', '/settings/schedule', { schedule }),
    partner: (data)    => req('PUT',   '/settings/partner',  data),
    grace: (data)      => req('PUT',   '/settings/grace',    data),
    unseal: (code)     => req('POST',  '/settings/unseal',   { code }),
    disableRequest:    () => req('POST',   '/settings/disable/request'),
    disableCancel:     () => req('DELETE', '/settings/disable/request'),
    disableConfirm: (code) => req('POST', '/settings/disable/confirm', { code }),
  },

  unlock: {
    status:   (domain)                        => req('GET',  `/unlock/status?domain=${encodeURIComponent(domain)}`),
    request:  (domain, purpose = 'unlock')    => req('POST', '/unlock/request',  { domain, purpose }),
    validate: (code, domain, purpose = 'unlock') => req('POST', '/unlock/validate', { code, domain, purpose }),
    history:  ()                              => req('GET',  '/unlock/history'),
  },
}
