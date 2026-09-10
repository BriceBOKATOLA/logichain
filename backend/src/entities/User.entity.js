const BaseEntity = require('./BaseEntity');

const ROLES = ['admin', 'logistics_manager', 'field_agent', 'transporter'];

/**
 * Entité "Utilisateur". Le mot de passe est déjà haché lorsqu'il atteint cette entité
 * (le hachage est une responsabilité du Service, pas de l'entité).
 */
class UserEntity extends BaseEntity {
  constructor({ email, passwordHash, role, fullName, assignedZone = null }) {
    super();
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.fullName = fullName;
    this.assignedZone = assignedZone;
    this.validate();
  }

  validate() {
    this.assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email || ''), 'Adresse email invalide.');
    this.assert(ROLES.includes(this.role), `Rôle invalide: ${this.role}`);
    this.assert(!!this.fullName, 'Le nom complet est obligatoire.');
  }

  isFieldActor() {
    return ['field_agent', 'transporter'].includes(this.role);
  }
}

UserEntity.ROLES = ROLES;
module.exports = UserEntity;
