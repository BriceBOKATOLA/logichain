const ApiError = require('../utils/ApiError');

/**
 * BaseEntity - Classe abstraite mère de tous les objets métier.
 * Porte les règles de validation communes et le pattern "self-validating entity" :
 * une entité ne doit jamais exister dans un état invalide.
 */
class BaseEntity {
  constructor() {
    if (this.constructor === BaseEntity) {
      throw new Error('BaseEntity est abstraite et ne peut pas être instanciée directement.');
    }
  }

  /**
   * Doit être implémentée par chaque sous-classe. Lève une ApiError(422) si invalide.
   */
  validate() {
    throw new Error('validate() doit être implémentée par la sous-classe.');
  }

  assert(condition, message) {
    if (!condition) {
      throw ApiError.unprocessable(message);
    }
  }
}

module.exports = BaseEntity;
