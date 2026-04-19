import { pool } from '../infrastructure/database/connection';
import { SystemClock } from '../infrastructure/clock/system-clock';
import { PgEmpresaRepository } from '../infrastructure/database/repositories/pg-empresa-repository';
import { PgProdutoRepository } from '../infrastructure/database/repositories/pg-produto-repository';
import { CreateEmpresaUseCase } from '../application/use-cases/empresa/create-empresa.use-case';
import { UpdateEmpresaUseCase } from '../application/use-cases/empresa/update-empresa.use-case';
import { GetEmpresaUseCase } from '../application/use-cases/empresa/get-empresa.use-case';
import { ListEmpresasByOwnerUseCase } from '../application/use-cases/empresa/list-empresas-by-owner.use-case';
import { CreateProdutoUseCase } from '../application/use-cases/produto/create-produto.use-case';
import { UpdateProdutoUseCase } from '../application/use-cases/produto/update-produto.use-case';
import { GetProdutoUseCase } from '../application/use-cases/produto/get-produto.use-case';
import { ListProdutosByEmpresaUseCase } from '../application/use-cases/produto/list-produtos-by-empresa.use-case';
import { DeleteProdutoUseCase } from '../application/use-cases/produto/delete-produto.use-case';
import { EmpresaController } from './http/controllers/empresa-controller';
import { ProdutoController } from './http/controllers/produto-controller';
import { createEmpresaOwnershipMiddleware } from './http/middlewares/empresa-ownership';

/**
 * Ponto único onde o grafo de dependências é montado.
 * Domain, application e controllers NÃO dão `new` em infra — tudo passa por aqui.
 */

const clock = new SystemClock();

// Repositories
const empresaRepository = new PgEmpresaRepository(pool);
const produtoRepository = new PgProdutoRepository(pool);

// Use cases — empresa
const createEmpresaUseCase = new CreateEmpresaUseCase(empresaRepository, clock);
const updateEmpresaUseCase = new UpdateEmpresaUseCase(empresaRepository, clock);
const getEmpresaUseCase = new GetEmpresaUseCase(empresaRepository);
const listEmpresasByOwnerUseCase = new ListEmpresasByOwnerUseCase(empresaRepository);

// Use cases — produto
const createProdutoUseCase = new CreateProdutoUseCase(produtoRepository, clock);
const updateProdutoUseCase = new UpdateProdutoUseCase(produtoRepository, clock);
const getProdutoUseCase = new GetProdutoUseCase(produtoRepository);
const listProdutosByEmpresaUseCase = new ListProdutosByEmpresaUseCase(produtoRepository);
const deleteProdutoUseCase = new DeleteProdutoUseCase(produtoRepository, clock);

// Controllers
export const empresaController = new EmpresaController(
  createEmpresaUseCase,
  updateEmpresaUseCase,
  getEmpresaUseCase,
  listEmpresasByOwnerUseCase,
);

export const produtoController = new ProdutoController(
  createProdutoUseCase,
  updateProdutoUseCase,
  getProdutoUseCase,
  listProdutosByEmpresaUseCase,
  deleteProdutoUseCase,
);

// Middleware factory que depende do repository — compartilhado com quem precisar validar posse da empresa.
export const empresaOwnershipMiddleware = createEmpresaOwnershipMiddleware(empresaRepository);
