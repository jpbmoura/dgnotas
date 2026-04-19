import { ValueObject } from '../shared/value-object';
import { Result } from '../shared/result';
import { NCMInvalidoError } from '../errors/ncm-invalido-error';

/**
 * NCM — Nomenclatura Comum do Mercosul. 8 dígitos, sem pontuação.
 * Validação sintática apenas; a existência do código na tabela oficial é responsabilidade da UI.
 */
export class NCM extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^\d{8}$/;

  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Result<NCM, NCMInvalidoError> {
    const digits = raw.replace(/\D/g, '');
    if (!NCM.PATTERN.test(digits)) return Result.fail(new NCMInvalidoError(raw));
    return Result.ok(new NCM(digits));
  }

  static reconstitute(value: string): NCM {
    return new NCM(value);
  }

  toString(): string {
    return this.props.value;
  }
}
