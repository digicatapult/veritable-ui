import type express from 'express'

import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { mockEnv, mockEnvLocalhost, mockLogger } from './helpers.js'

import { ForbiddenError, InternalError } from '../../errors.js'
import IDPService from '../../models/idpService.js'
import { AuthController } from '../AuthController.js'

const idpMock = {
  authorizationEndpoint(network: string) {
    return `http://${network}.example.com/auth`
  },
  getTokenFromCode: sinon
    .stub()
    .withArgs('1234', 'http://www.example.com/auth/redirect')
    .resolves({ access_token: 'access', refresh_token: 'refresh' }),
} as unknown as IDPService

const mkRequestMock = () => ({
  log: mockLogger,
  res: {
    clearCookie: sinon.stub(),
    cookie: sinon.stub(),
    redirect: sinon.stub(),
  },
  signedCookies: { 'VERITABLE_NONCE.suffix': 'nonce', 'VERITABLE_REDIRECT.suffix': '/example' },
})

describe('AuthController', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('login', () => {
    it("should error if res isn't present on req", async () => {
      const controller = new AuthController(mockEnv, idpMock)

      let error: unknown
      try {
        await controller.login({} as unknown as express.Request, '/example')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(InternalError)
    })

    it('should set 2 cookies', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.callCount).to.equal(2)
    })

    it('should set nonce cookie correctly', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.firstCall.args[0]).to.match(/^VERITABLE_NONCE\.[a-zA-Z0-9_-]+/)
      expect(typeof stub.firstCall.args[1]).to.equal('string')
      expect(stub.firstCall.args[2]).to.deep.equal({
        sameSite: true,
        maxAge: 600000,
        httpOnly: true,
        signed: true,
        secure: true,
        path: '/auth/redirect',
      })
    })

    it('should set nonce cookie correctly', async () => {
      const controller = new AuthController(mockEnvLocalhost, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.firstCall.args[0]).to.match(/^VERITABLE_NONCE\.[a-zA-Z0-9_-]+/)
      expect(typeof stub.firstCall.args[1]).to.equal('string')
      expect(stub.firstCall.args[2]).to.deep.equal({
        sameSite: true,
        maxAge: 600000,
        httpOnly: true,
        signed: true,
        secure: false,
        path: '/auth/redirect',
      })
    })

    it('should set redirect cookie correctly', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.secondCall.args[0]).to.match(/^VERITABLE_REDIRECT\.[a-zA-Z0-9_-]+/)
      expect(stub.secondCall.args[1]).to.equal('/example')
      expect(stub.secondCall.args[2]).to.deep.equal({
        sameSite: true,
        maxAge: 600000,
        httpOnly: true,
        signed: true,
        secure: true,
        path: '/auth/redirect',
      })
    })

    it('should set redirect cookie correctly if localhost', async () => {
      const controller = new AuthController(mockEnvLocalhost, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.secondCall.args[0]).to.match(/^VERITABLE_REDIRECT\.[a-zA-Z0-9_-]+/)
      expect(stub.secondCall.args[1]).to.equal('/example')
      expect(stub.secondCall.args[2]).to.deep.equal({
        sameSite: true,
        maxAge: 600000,
        httpOnly: true,
        signed: true,
        secure: false,
        path: '/auth/redirect',
      })
    })

    it('should set redirect cookie to # if in redirect loop', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/auth/redirect?foo=bar')

      const stub = req.res.cookie
      expect(stub.secondCall.args[0]).to.match(/^VERITABLE_REDIRECT\.[a-zA-Z0-9_-]+/)
      expect(stub.secondCall.args[1]).to.equal('http://www.example.com')
      expect(stub.secondCall.args[2]).to.deep.equal({
        sameSite: true,
        maxAge: 600000,
        httpOnly: true,
        signed: true,
        secure: true,
        path: '/auth/redirect',
      })
    })

    it('should redirect to the correct location', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      // get the nonce that was generated
      const cookieStub = req.res.cookie
      const prefix = cookieStub.firstCall.args[0].split('.')[1]
      const nonce = cookieStub.firstCall.args[1]

      const stub = req.res.redirect
      expect(stub.calledOnce).to.equal(true)
      expect(stub.firstCall.args[0]).to.equal(302)

      const redirectUrl = new URL(stub.firstCall.args[1])
      expect(redirectUrl.protocol).to.equal('http:')
      expect(redirectUrl.hostname).to.equal('public.example.com')
      expect(redirectUrl.pathname).to.equal('/auth')
      expect(redirectUrl.searchParams.get('response_type')).to.equal('code')
      expect(redirectUrl.searchParams.get('client_id')).to.equal('veritable-ui')
      expect(redirectUrl.searchParams.get('redirect_uri')).to.equal('http://www.example.com/auth/callback')
      expect(redirectUrl.searchParams.get('state')).to.equal(`${prefix}.${nonce}`)
      expect(redirectUrl.searchParams.get('scope')).to.equal('openid')
    })
  })

  describe('callback', () => {
    it('should set refresh header to go to redirect', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.callback(req as unknown as express.Request, 'state', 'code', 'error')

      expect(controller.getStatus()).to.equal(200)
      expect(controller.getHeader('Refresh')).to.equal(
        '0; url=http://www.example.com/auth/redirect?state=state&code=code&error=error'
      )
    })

    it('should not set optional query params on redirect if missing', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.callback(req as unknown as express.Request, 'state')

      expect(controller.getStatus()).to.equal(200)
      expect(controller.getHeader('Refresh')).to.equal('0; url=http://www.example.com/auth/redirect?state=state')
    })
  })

  describe('redirect', () => {
    it("should error if res isn't present on req", async () => {
      const controller = new AuthController(mockEnv, idpMock)

      let error: unknown
      try {
        await controller.redirect({ signedCookies: [] } as unknown as express.Request, 'nonce', '1234')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(InternalError)
    })

    it('should error if state format is incorrect', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      let error: unknown
      try {
        await controller.redirect(req as unknown as express.Request, 'invalid', '1234')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    it("should error if state doesn't match nonce", async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      let error: unknown
      try {
        await controller.redirect(req as unknown as express.Request, 'suffix.invalid', '1234')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    it('should clear cookies', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.redirect(req as unknown as express.Request, 'suffix.nonce', '1234')

      const stub = req.res.clearCookie
      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['VERITABLE_NONCE.suffix', { path: '/auth/redirect' }])
      expect(stub.secondCall.args).to.deep.equal(['VERITABLE_REDIRECT.suffix', { path: '/auth/redirect' }])
    })

    it('should set token cookies', async () => {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.redirect(req as unknown as express.Request, 'suffix.nonce', '1234')

      const stub = req.res.cookie
      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal([
        'VERITABLE_ACCESS_TOKEN',
        'access',
        {
          sameSite: true,
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          signed: true,
          secure: true,
        },
      ])
      expect(stub.secondCall.args).to.deep.equal([
        'VERITABLE_REFRESH_TOKEN',
        'refresh',
        {
          sameSite: true,
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          signed: true,
          secure: true,
        },
      ])
    })

    it('should redirect to the correct url if cookie present', async function () {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.redirect(req as unknown as express.Request, 'suffix.nonce', '1234')

      const stub = req.res.redirect
      expect(stub.calledOnce).equal(true)
      expect(stub.firstCall.args).deep.equal([302, '/example'])
    })

    it('should redirect to / url if cookie not present', async function () {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.redirect(
        { ...req, signedCookies: { 'VERITABLE_NONCE.suffix': 'nonce' } } as unknown as express.Request,
        'suffix.nonce',
        '1234'
      )

      const stub = req.res.redirect
      expect(stub.calledOnce).equal(true)
      expect(stub.firstCall.args).deep.equal([302, 'http://www.example.com'])
    })

    it('should redirect to without setting cookies on error', async function () {
      const controller = new AuthController(mockEnv, idpMock)
      const req = mkRequestMock()

      await controller.redirect(
        { ...req, signedCookies: { 'VERITABLE_NONCE.suffix': 'nonce' } } as unknown as express.Request,
        'suffix.nonce',
        undefined
      )

      const stub = req.res.redirect
      expect(stub.calledOnce).equal(true)
      expect(stub.firstCall.args).deep.equal([302, 'http://www.example.com'])
      expect(req.res.cookie.callCount).to.equal(0)
      expect(req.res.clearCookie.callCount).to.equal(0)
    })
  })
})
