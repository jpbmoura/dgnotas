import { ValueObject } from '../shared/value-object';
import { Result } from '../shared/result';
import { CEPInvalidoError } from '../errors/cep-invalido-error';

/**
 * CEP — 8 dígitos brasileiros. Armazenado sem máscara.
 */
export class CEP extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Result<CEP, CEPInvalidoError> {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return Result.fail(new CEPInvalidoError(raw));
    return Result.ok(new CEP(digits));
  }

  static reconstitute(value: string): CEP {
    return new CEP(value);
  }

  toString(): string {
    return this.props.value;
  }

  toFormatted(): string {
    const v = this.props.value;
    return `${v.slice(0, 5)}-${v.slice(5)}`;
  }
}
