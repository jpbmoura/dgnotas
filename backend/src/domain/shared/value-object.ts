/**
 * Classe-base para value objects.
 * VO não tem identidade — é definido pelos valores. Imutável.
 * Igualdade é estrutural: dois VOs com os mesmos props são iguais.
 */
export abstract class ValueObject<Props extends object> {
  protected readonly props: Props;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(other?: ValueObject<Props>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
