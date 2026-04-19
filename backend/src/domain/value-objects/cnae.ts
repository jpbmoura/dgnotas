import { ValueObject } from '../shared/value-object';
import { Result } from '../shared/result';
import { CNAEInvalidoError } from '../errors/cnae-invalido-error';

/**
 * CNAE — Classificação Nacional de Atividades Econômicas. Formato `XXXX-X/XX`.
 * Validação sintática apenas; a existência do código na tabela oficial da Receita
 * é responsabilidade da UI (autocompletar com lista conhecida).
 */
export class CNAE extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^\d{4}-\d\/\d{2}$/;

  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Result<CNAE, CNAEInvalidoError> {
    const trimmed = raw.trim();
    if (!CNAE.PATTERN.test(trimmed)) return Result.fail(new CNAEInvalidoError(raw));
    return Result.ok(new CNAE(trimmed));
  }

  static reconstitute(value: string): CNAE {
    return new CNAE(value);
  }

  toString(): string {
    return this.props.value;
  }
}
