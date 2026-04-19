import { Empresa } from '../../domain/entities/empresa';

export interface EmpresaRepository {
  /** Persiste (insert ou update, decidido pelo repositório pelo id). Soft delete usa `softDelete`. */
  save(empresa: Empresa): Promise<void>;

  /** Carrega uma empresa pelo id, SOMENTE se pertencer ao owner. Retorna null se não existe ou não pertence. */
  findByIdForOwner(ownerUserId: string, id: string): Promise<Empresa | null>;

  /** Lista todas as empresas do dono (exclui soft-deletadas). */
  findAllByOwner(ownerUserId: string): Promise<Empresa[]>;

  /**
   * Retorna true se já existe empresa com esse CNPJ para esse dono.
   * Usado pelo use case de criação pra emitir erro de negócio antes de cair na unique do banco.
   * Opcionalmente exclui um id específico (útil em update).
   */
  existsByOwnerAndCnpj(
    ownerUserId: string,
    cnpjDigits: string,
    excludeId?: string,
  ): Promise<boolean>;
}
