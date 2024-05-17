import type express from 'express'

import { describe, it } from 'mocha'
import sinon from 'sinon'

import { mockEnv, mockLogger } from './helpers'

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
  res: {
    clearCookie: sinon.stub(),
    cookie: sinon.stub(),
    redirect: sinon.stub(),
  },
  signedCookies: { VERITABLE_NONCE: 'nonce', VERITABLE_REDIRECT: '/example' },
})

describe('AuthController', () => {
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('login', () => {
    it("should error if res isn't present on req", async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)

      let error: unknown
      try {
        await controller.login({} as unknown as express.Request, '/example')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(InternalError)
    })

    it('should set 2 cookies', async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.callCount).to.equal(2)
    })

    it('should set nonce cookie correctly', async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.firstCall.args[0]).to.equal('VERITABLE_NONCE')
      expect(typeof stub.firstCall.args[1]).to.equal('string')
      expect(stub.firstCall.args[2]).to.deep.equal({
        sameSite: true,
        httpOnly: true,
        signed: true,
        secure: true,
        path: '/auth/redirect',
      })
    })

    it('should set redirect cookie correctly', async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      const stub = req.res.cookie
      expect(stub.secondCall.args[0]).to.equal('VERITABLE_REDIRECT')
      expect(stub.secondCall.args[1]).to.equal('/example')
      expect(stub.secondCall.args[2]).to.deep.equal({
        sameSite: true,
        httpOnly: true,
        signed: true,
        secure: true,
        path: '/auth/redirect',
      })
    })

    it('should redirect to the correct location', async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.login(req as unknown as express.Request, '/example')

      // get the nonce that was generated
      const cookieStub = req.res.cookie
      const nonce = cookieStub.firstCall.args[1]
      const expectedUrl = new URL('http://public.example.com/auth')
      expectedUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: 'veritable-ui',
        redirect_uri: 'http://www.example.com/auth/redirect',
        state: nonce,
        scope: 'openid',
      }).toString()

      const stub = req.res.redirect
      expect(stub.calledOnce).to.equal(true)
      expect(stub.firstCall.args[0]).to.equal(302)
      expect(stub.firstCall.args[1]).to.equal(expectedUrl.toString())
    })
  })

  describe('redirect', () => {
    it("should error if res isn't present on req", async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)

      let error: unknown
      try {
        await controller.redirect({ signedCookies: [] } as unknown as express.Request, 'nonce', '1234')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(InternalError)
    })

    it("should error if state doesn't match nonce", async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      let error: unknown
      try {
        await controller.redirect(req as unknown as express.Request, 'invalid', '1234')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    it('should clear cookies', async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.redirect(req as unknown as express.Request, 'nonce', '1234')

      const stub = req.res.clearCookie
      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['VERITABLE_NONCE'])
      expect(stub.secondCall.args).to.deep.equal(['VERITABLE_REDIRECT'])
    })

    it('should set token cookies', async () => {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.redirect(req as unknown as express.Request, 'nonce', '1234')

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
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.redirect(req as unknown as express.Request, 'nonce', '1234')

      const stub = req.res.redirect
      expect(stub.calledOnce).equal(true)
      expect(stub.firstCall.args).deep.equal([302, '/example'])
    })

    it('should redirect to / url if cookie not present', async function () {
      const controller = new AuthController(mockEnv, idpMock, mockLogger)
      const req = mkRequestMock()

      await controller.redirect(
        { ...req, signedCookies: { VERITABLE_NONCE: 'nonce' } } as unknown as express.Request,
        'nonce',
        '1234'
      )

      const stub = req.res.redirect
      expect(stub.calledOnce).equal(true)
      expect(stub.firstCall.args).deep.equal([302, 'http://www.example.com'])
    })
  })
})
