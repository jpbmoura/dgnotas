import { Entity } from './entity';

/**
 * Classe-base para aggregate roots.
 * É a única porta de entrada pro cluster de entities/VOs que formam o aggregate.
 * Coleta eventos de domínio emitidos durante operações; o use case faz pull após persistir.
 */
export abstract class AggregateRoot<Props extends object> extends Entity<Props> {
  private _events: unknown[] = [];

  protected addEvent(event: unknown): void {
    this._events.push(event);
  }

  pullEvents(): unknown[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}
