const ApiError = require('../../src/utils/ApiError');
const ApiResponse = require('../../src/utils/ApiResponse');

describe('ApiError', () => {
  it('expose des fabriques statiques alignées sur les codes HTTP attendus', () => {
    expect(ApiError.badRequest('x').statusCode).toBe(400);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.conflict().statusCode).toBe(409);
    expect(ApiError.unprocessable('x').statusCode).toBe(422);
    expect(ApiError.internal().statusCode).toBe(500);
  });

  it('reste une vraie Error instrumentée (message, pile, drapeau opérationnel)', () => {
    const err = ApiError.badRequest('Payload illisible', { field: 'qrCode' });

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Payload illisible');
    expect(err.details).toEqual({ field: 'qrCode' });
    expect(err.isOperational).toBe(true);
    expect(err.stack).toBeDefined();
  });
});

describe('ApiResponse', () => {
  it('marque success=true en dessous de 400 et false au-delà', () => {
    expect(new ApiResponse(200, {}).success).toBe(true);
    expect(new ApiResponse(201, {}).success).toBe(true);
    expect(new ApiResponse(404, null, 'Introuvable').success).toBe(false);
  });

  it("n'ajoute la clé meta que si elle est fournie", () => {
    expect(new ApiResponse(200, [])).not.toHaveProperty('meta');
    expect(new ApiResponse(200, [], 'OK', { total: 3 }).meta).toEqual({ total: 3 });
  });

  it('écrit le statut et le corps sur la réponse Express', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    new ApiResponse(201, { id: '1' }, 'Créé').send(res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, statusCode: 201, message: 'Créé', data: { id: '1' } }),
    );
  });
});
