/**
 * Result<T, E> — força o caller a lidar com falhas de regra de negócio sem exception.
 * Usado em VOs (CNPJ.create) e em métodos de entity que podem falhar por invariante.
 * Erros inesperados (banco caiu, bug) continuam sendo `throw` normal.
 */
export class Result<T, E = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  get isFailure(): boolean {
    return !this.isSuccess;
  }

  get value(): T {
    if (!this.isSuccess) {
      throw new Error('Acessou .value em Result com falha');
    }
    return this._value as T;
  }

  get error(): E {
    if (this.isSuccess) {
      throw new Error('Acessou .error em Result com sucesso');
    }
    return this._error as E;
  }

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }
}
