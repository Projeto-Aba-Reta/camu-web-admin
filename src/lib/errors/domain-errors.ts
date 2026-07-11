// Erros de domínio traduzidos a partir de violações de regra de negócio no
// banco (unique constraints, RPCs) para que a UI possa exibir mensagens
// específicas em vez de um erro genérico.

export class DuplicateSlugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateSlugError";
  }
}

export class LastOwnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LastOwnerError";
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAlreadyExistsError";
  }
}

export class TitularRequiredForMeiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TitularRequiredForMeiError";
  }
}

export class DuplicateRevenueSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRevenueSnapshotError";
  }
}

export class MigrationTriggerRevertRequiresNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationTriggerRevertRequiresNoteError";
  }
}
