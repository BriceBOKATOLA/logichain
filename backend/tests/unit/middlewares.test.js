const Joi = require('joi');
const jwt = require('jsonwebtoken');

const validate = require('../../src/middlewares/validate');
const authMiddleware = require('../../src/middlewares/authMiddleware');
const errorMiddleware = require('../../src/middlewares/errorMiddleware');
const ApiError = require('../../src/utils/ApiError');
const env = require('../../src/config/env');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('ValidationMiddleware', () => {
  const schema = Joi.object({
    qrCode: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  });

  it('laisse passer une charge utile valide et applique le typage Joi', () => {
    const req = { body: { qrCode: 'QR-0001', quantity: '3' } };
    const next = jest.fn();

    validate.validate(schema)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.quantity).toBe(3); // converti en nombre par Joi
  });

  it('retire les champs inconnus au lieu de les propager vers le Service', () => {
    const req = { body: { qrCode: 'QR-0001', quantity: 1, role: 'admin' } };
    const next = jest.fn();

    validate.validate(schema)(req, mockRes(), next);

    expect(req.body).toEqual({ qrCode: 'QR-0001', quantity: 1 });
  });

  it('agrège TOUTES les erreurs de validation dans une 422', () => {
    const req = { body: { quantity: 0 } };
    const next = jest.fn();

    validate.validate(schema)(req, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(422);
    expect(err.details).toHaveLength(2); // qrCode manquant + quantity < 1
  });

  it('peut valider une autre partie de la requête (query)', () => {
    const req = { query: { qrCode: 'QR-0002', quantity: 5 } };
    const next = jest.fn();

    validate.validate(schema, 'query')(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe('AuthMiddleware.authenticate', () => {
  it('injecte req.user à partir d’un Bearer token valide', () => {
    const token = jwt.sign({ sub: 'u1', role: 'admin' }, env.jwt.accessSecret, { expiresIn: '5m' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    authMiddleware.authenticate(req, mockRes(), next);

    expect(req.user).toMatchObject({ sub: 'u1', role: 'admin' });
    expect(next).toHaveBeenCalledWith();
  });

  it('refuse une requête sans en-tête Authorization', () => {
    const next = jest.fn();
    authMiddleware.authenticate({ headers: {} }, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('refuse un schéma d’autorisation autre que Bearer', () => {
    const next = jest.fn();
    authMiddleware.authenticate({ headers: { authorization: 'Basic YWRtaW46YWRtaW4=' } }, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('refuse un token expiré', () => {
    const expired = jwt.sign({ sub: 'u1', role: 'admin' }, env.jwt.accessSecret, { expiresIn: '-1s' });
    const next = jest.fn();

    authMiddleware.authenticate({ headers: { authorization: `Bearer ${expired}` } }, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});

describe('AuthMiddleware.requireRole', () => {
  it('autorise un rôle listé', () => {
    const next = jest.fn();
    authMiddleware.requireRole('admin', 'logistics_manager')({ user: { role: 'admin' } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('renvoie 403 pour un rôle non listé', () => {
    const next = jest.fn();
    authMiddleware.requireRole('admin')({ user: { role: 'field_agent' } }, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('renvoie 403 si aucun utilisateur n’est authentifié', () => {
    const next = jest.fn();
    authMiddleware.requireRole('admin')({}, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

describe('ErrorMiddleware', () => {
  it('relaie telle quelle une ApiError métier', () => {
    const res = mockRes();
    errorMiddleware(ApiError.notFound('Événement introuvable.'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Événement introuvable.' }),
    );
  });

  it('traduit une ValidationError Mongoose en 422', () => {
    const res = mockRes();
    const err = Object.assign(new Error('validation'), { name: 'ValidationError', errors: { name: {} } });

    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('traduit une CastError Mongoose en 400', () => {
    const res = mockRes();
    const err = Object.assign(new Error('cast'), { name: 'CastError', value: 'abc' });

    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('traduit une violation d’index unique (code 11000) en 409', () => {
    const res = mockRes();
    errorMiddleware(Object.assign(new Error('dup'), { code: 11000 }), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("masque le détail d'une erreur inattendue derrière une 500 générique", () => {
    const res = mockRes();
    errorMiddleware(new Error('SELECT * FROM secrets -- fuite interne'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.message).not.toMatch(/secrets/);
  });
});
