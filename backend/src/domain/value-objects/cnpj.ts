import { ValueObject } from '../shared/value-object';
import { Result } from '../shared/result';
import { CNPJInvalidoError } from '../errors/cnpj-invalido-error';

/**
 * CNPJ — 14 dígitos. Armazenado e transitado sem máscara; formatação é na borda (presenter/frontend).
 * Valida tamanho, rejeita todos iguais (11111111111111) e confere os dois dígitos verificadores.
 */
export class CNPJ extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Result<CNPJ, CNPJInvalidoError> {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) return Result.fail(new CNPJInvalidoError(raw));
    if (/^(\d)\1+$/.test(digits)) return Result.fail(new CNPJInvalidoError(raw));
    if (!CNPJ.checkDigits(digits)) return Result.fail(new CNPJInvalidoError(raw));
    return Result.ok(new CNPJ(digits));
  }

  /** Constrói sem validar — usado pelos mappers de repositório, onde o banco já garante a regra. */
  static reconstitute(value: string): CNPJ {
    return new CNPJ(value);
  }

  private static checkDigits(digits: string): boolean {
    const calc = (base: string): number => {
      const weights =
        base.length === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = base
        .split('')
        .reduce((s, d, i) => s + Number(d) * weights[i], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calc(digits.slice(0, 12));
    const d2 = calc(digits.slice(0, 12) + String(d1));
    return d1 === Number(digits[12]) && d2 === Number(digits[13]);
  }

  toString(): string {
    return this.props.value;
  }

  toFormatted(): string {
    const v = this.props.value;
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  }
}
