/**
 * Classe-base para entities do domínio.
 * Entity tem identidade (id estável) e ciclo de vida. Igualdade é por id.
 */
export abstract class Entity<Props extends object> {
  public readonly id: string;
  protected readonly props: Props;

  protected constructor(props: Props, id: string) {
    this.id = id;
    this.props = props;
  }

  equals(other?: Entity<Props>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}
